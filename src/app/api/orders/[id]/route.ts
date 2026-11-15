import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { orderStatusSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah status antrian: Panggil (QUEUED→CALLED), Selesai (→DONE), Batalkan (→CANCELLED). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req);
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { status } = parsed.data;

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as
    | { id: number; queue_number: string; status: string }
    | undefined;
  if (!order) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

  // Transisi yang sah: QUEUED→CALLED, QUEUED/CALLED→DONE, QUEUED/CALLED→CANCELLED,
  // serta CALLED→CALLED sebagai "panggil ulang" (memperbarui waktu panggil).
  const sah =
    (status === "CALLED" && (order.status === "QUEUED" || order.status === "CALLED")) ||
    (status === "DONE" && (order.status === "QUEUED" || order.status === "CALLED")) ||
    (status === "CANCELLED" && (order.status === "QUEUED" || order.status === "CALLED"));
  if (!sah) {
    return NextResponse.json({ error: `Perubahan ${order.status} → ${status} tidak diizinkan` }, { status: 409 });
  }

  const kolom = status === "CALLED" ? "called_at = datetime('now','localtime')" : status === "DONE" ? "done_at = datetime('now','localtime')" : null;
  if (kolom) db.prepare(`UPDATE orders SET status = ?, ${kolom} WHERE id = ?`).run(status, orderId);
  else db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);

  logAktivitas({
    userId: Number(session!.sub), username: session!.username,
    action: status === "CALLED" && order.status === "CALLED" ? "ORDER_RECALL" : `ORDER_${status}`,
    detail: `${order.queue_number} → ${status}`, req,
  });

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  return NextResponse.json({ order: updated });
}
