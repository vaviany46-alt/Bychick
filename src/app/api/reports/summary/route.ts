import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * Ringkasan analisis keuangan untuk dashboard.
 * Query param: dari, sampai (YYYY-MM-DD). Revenue hanya dihitung dari
 * transaksi berstatus DONE agar tidak memasukkan transaksi batal/antrian.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const hariIni = new Date().toISOString().slice(0, 10);
  const dari = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("dari") || "") ? sp.get("dari")! : hariIni;
  const sampai = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("sampai") || "") ? sp.get("sampai")! : hariIni;
  if (dari > sampai) return NextResponse.json({ error: "Rentang tanggal tidak valid" }, { status: 400 });

  const total = db.prepare(`
    SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS jumlah_transaksi
    FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'DONE'`).get(dari, sampai) as { revenue: number; jumlah_transaksi: number };

  const itemTerjual = db.prepare(`
    SELECT COALESCE(SUM(oi.qty),0) AS c FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'DONE'`).get(dari, sampai) as { c: number };

  const rataRata = total.jumlah_transaksi > 0 ? Math.round(total.revenue / total.jumlah_transaksi) : 0;

  const series = db.prepare(`
    SELECT date(created_at) AS tanggal, SUM(total) AS revenue, COUNT(*) AS transaksi
    FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'DONE'
    GROUP BY date(created_at) ORDER BY tanggal`).all(dari, sampai);

  const produkTop = db.prepare(`
    SELECT oi.menu_name AS nama, SUM(oi.qty) AS qty, SUM(oi.subtotal) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'DONE'
    GROUP BY oi.menu_name ORDER BY revenue DESC LIMIT 8`).all(dari, sampai);

  const kategori = db.prepare(`
    SELECT oi.category AS kategori, SUM(oi.subtotal) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'DONE'
    GROUP BY oi.category ORDER BY revenue DESC`).all(dari, sampai);

  const pembayaran = db.prepare(`
    SELECT payment_method, COUNT(*) AS jumlah, SUM(total) AS revenue
    FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'DONE'
    GROUP BY payment_method`).all(dari, sampai);

  const status = db.prepare(`
    SELECT status, COUNT(*) AS jumlah FROM orders
    WHERE date(created_at) BETWEEN ? AND ? GROUP BY status`).all(dari, sampai);

  return NextResponse.json({
    rentang: { dari, sampai },
    ringkas: {
      revenue: total.revenue,
      transaksi: total.jumlah_transaksi,
      item_terjual: itemTerjual.c,
      rata_rata: rataRata,
    },
    series, produk_top: produkTop, kategori, pembayaran, status,
  });
}
