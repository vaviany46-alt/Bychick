import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { orderSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

/** Daftar transaksi dengan filter tanggal & status. */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const tanggal = sp.get("tanggal") || new Date().toISOString().slice(0, 10);
  const status = sp.get("status");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
  }

  let sql = `
    SELECT o.*, u.name AS kasir_name,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS jumlah_item
    FROM orders o JOIN users u ON u.id = o.kasir_id
    WHERE date(o.created_at) = ?`;
  const args: unknown[] = [tanggal];
  if (status && ["QUEUED", "CALLED", "DONE", "CANCELLED"].includes(status)) {
    sql += " AND o.status = ?";
    args.push(status);
  }
  sql += " ORDER BY o.id DESC LIMIT 200";

  const orders = db.prepare(sql).all(...args);
  return NextResponse.json({ orders });
}

/** Buat transaksi baru dari kasir (checkout) → menghasilkan nomor antrian harian. */
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });

  const { items, payment_method, customer_name, cash_received, discount, with_tax } = parsed.data;

  // Harga dihitung ulang di server dari database — tidak pernah percaya input klien.
  const stmtMenu = db.prepare("SELECT id, name, category, price FROM menus WHERE id = ? AND is_available = 1");
  const lines: Array<{ menuId: number; name: string; category: string; price: number; qty: number; subtotal: number }> = [];
  for (const it of items) {
    const m = stmtMenu.get(it.menu_id) as { id: number; name: string; category: string; price: number } | undefined;
    if (!m) return NextResponse.json({ error: `Menu id ${it.menu_id} tidak tersedia` }, { status: 400 });
    lines.push({ menuId: m.id, name: m.name, category: m.category, price: m.price, qty: it.qty, subtotal: m.price * it.qty });
  }
  const nilai = lines.reduce((s, l) => s + l.subtotal, 0);
  const diskon = Math.min(discount, nilai); // diskon tidak boleh melebihi nilai
  const pajak = with_tax ? Math.round((nilai - diskon) * 0.11) : 0;
  const total = nilai - diskon + pajak;

  if (payment_method === "CASH") {
    if (!cash_received || cash_received < total) {
      return NextResponse.json({ error: "Uang diterima kurang dari total" }, { status: 400 });
    }
  }

  // Nomor antrian harian: reset setiap tanggal, A-001 dst.
  const hariIni = new Date().toISOString().slice(0, 10);
  const jumlahHariIni = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = ?")
    .get(hariIni) as { c: number };
  const queueNumber = `A-${String(jumlahHariIni.c + 1).padStart(3, "0")}`;

  const insOrder = db.prepare(`
    INSERT INTO orders (queue_number, kasir_id, customer_name, payment_method, cash_received, subtotal, discount, tax, total, status)
    VALUES (?,?,?,?,?,?,?,?,?,'QUEUED')`);
  const insItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_id, menu_name, category, price, qty, subtotal)
    VALUES (?,?,?,?,?,?,?)`);

  let orderId: number;
  const tx = db.transaction(() => {
    const info = insOrder.run(
      queueNumber, Number(session!.sub), customer_name || null,
      payment_method, payment_method === "CASH" ? cash_received : null,
      nilai, diskon, pajak, total
    );
    orderId = Number(info.lastInsertRowid);
    for (const l of lines) insItem.run(orderId, l.menuId, l.name, l.category, l.price, l.qty, l.subtotal);
  });
  tx();

  logAktivitas({
    userId: Number(session!.sub), username: session!.username,
    action: "ORDER_BARU", detail: `${queueNumber} total Rp${total} (${payment_method})`, req,
  });

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId!);
  const order_items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId!);
  return NextResponse.json({ order, order_items, kembalian: payment_method === "CASH" ? (cash_received ?? 0) - total : 0 }, { status: 201 });
}
