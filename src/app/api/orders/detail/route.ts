import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/** Detail satu transaksi beserta item-itemnya (untuk modal struk). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const order = db.prepare(`
    SELECT o.*, u.name AS kasir_name FROM orders o JOIN users u ON u.id = o.kasir_id WHERE o.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

  const items = db.prepare("SELECT menu_name, qty, price, subtotal FROM order_items WHERE order_id = ?").all(id);
  return NextResponse.json({ order, items }, { headers: { "Cache-Control": "no-store" } });
}
