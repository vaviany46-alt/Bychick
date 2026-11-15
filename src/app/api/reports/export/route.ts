import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAktivitas } from "@/lib/log";

/** Ekspor CSV: rekap harian atau detail transaksi sesuai rentang tanggal. */
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const hariIni = new Date().toISOString().slice(0, 10);
  const dari = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("dari") || "") ? sp.get("dari")! : hariIni;
  const sampai = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("sampai") || "") ? sp.get("sampai")! : hariIni;
  const jenis = sp.get("jenis") === "rekap" ? "rekap" : "transaksi";

  let csv = "";
  if (jenis === "rekap") {
    const rows = db.prepare(`
      SELECT date(o.created_at) AS tanggal, COUNT(*) AS transaksi,
        SUM(CASE WHEN o.status='DONE' THEN 1 ELSE 0 END) AS selesai,
        SUM(CASE WHEN o.status='DONE' THEN o.total ELSE 0 END) AS revenue
      FROM orders o WHERE date(o.created_at) BETWEEN ? AND ?
      GROUP BY date(o.created_at) ORDER BY tanggal`).all(dari, sampai);
    csv = "tanggal,total_transaksi,transaksi_selesai,penerimaan\n" +
      rows.map((r) => [...Object.values(r as Record<string, unknown>)].join(",")).join("\n");
  } else {
    const rows = db.prepare(`
      SELECT date(o.created_at) AS tanggal, o.queue_number, o.customer_name, u.name AS kasir,
        o.payment_method, o.status, oi.menu_name, oi.qty, oi.price, oi.subtotal
      FROM orders o JOIN users u ON u.id = o.kasir_id JOIN order_items oi ON oi.order_id = o.id
      WHERE date(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at, oi.id`).all(dari, sampai);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    csv = "tanggal,no_antrian,pelanggan,kasir,pembayaran,status,item,qty,harga,subtotal\n" +
      rows.map((r) => Object.values(r as Record<string, unknown>).map(esc).join(",")).join("\n");
  }

  logAktivitas({
    userId: Number(session!.sub), username: session!.username,
    action: "EKSPOR_CSV", detail: `${jenis} ${dari} s/d ${sampai}`, req,
  });

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bychick-${jenis}-${dari}_${sampai}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
