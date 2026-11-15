import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * Ringkasan analisis keuangan untuk dashboard.
 * Revenue & pengeluaran dihitung dari transaksi DONE dan tabel expenses;
 * laba bersih = penerimaan − pengeluaran. Termasuk seri harian, jam sibuk,
 * dan insight (hari terbaik, jam paling ramai, pertumbuhan vs periode sebelumnya).
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

  const expense = db.prepare(`
    SELECT COALESCE(SUM(jumlah),0) AS t FROM expenses WHERE expense_date BETWEEN ? AND ?`)
    .get(dari, sampai) as { t: number };

  const itemTerjual = db.prepare(`
    SELECT COALESCE(SUM(oi.qty),0) AS c FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'DONE'`).get(dari, sampai) as { c: number };

  const rataRata = total.jumlah_transaksi > 0 ? Math.round(total.revenue / total.jumlah_transaksi) : 0;

  // Seri harian: penerimaan + pengeluaran berdampingan
  const series = db.prepare(`
    SELECT d AS tanggal,
      COALESCE((SELECT SUM(total) FROM orders WHERE date(created_at) = d AND status='DONE'), 0) AS revenue,
      COALESCE((SELECT SUM(jumlah) FROM expenses WHERE expense_date = d), 0) AS expense
    FROM (SELECT DISTINCT date(created_at) AS d FROM orders WHERE date(created_at) BETWEEN ? AND ?
          UNION SELECT DISTINCT expense_date AS d FROM expenses WHERE expense_date BETWEEN ? AND ?)
    ORDER BY d`).all(dari, sampai, dari, sampai);

  // Jam sibuk (transaksi DONE)
  const perJam = db.prepare(`
    SELECT strftime('%H', created_at) AS jam, COUNT(*) AS transaksi, SUM(total) AS revenue
    FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status = 'DONE'
    GROUP BY jam ORDER BY jam`).all(dari, sampai);

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

  // ── Insight ────────────────────────────────────────────────────────
  const hariTerbaik = (series as Array<{ tanggal: string; revenue: number }>)
    .reduce<{ tanggal: string; revenue: number } | null>(
      (a, b) => (!a || b.revenue > a.revenue ? b : a), null);

  const jamTerbaik = (perJam as Array<{ jam: string; revenue: number }>)
    .reduce<{ jam: string; revenue: number } | null>(
      (a, b) => (!a || b.revenue > a.revenue ? b : a), null);

  // Periode pembanding: rentang sama panjang tepat sebelum "dari"
  const [y1, m1, d1] = dari.split("-").map(Number);
  const [y2, m2, d2] = sampai.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1), t2 = Date.UTC(y2, m2 - 1, d2);
  const durasiHari = Math.round((t2 - t1) / 86_400_000) + 1;
  const prevEnd = new Date(t1 - 86_400_000);
  const prevStart = new Date(t1 - durasiHari * 86_400_000);
  const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);
  const prevRevenue = db.prepare(`
    SELECT COALESCE(SUM(total),0) AS r FROM orders
    WHERE date(created_at) BETWEEN ? AND ? AND status='DONE'`).get(fmt(prevStart.getTime()), fmt(prevEnd.getTime())) as { r: number };

  const pertumbuhan = prevRevenue.r > 0
    ? Math.round(((total.revenue - prevRevenue.r) / prevRevenue.r) * 100)
    : null;

  return NextResponse.json({
    rentang: { dari, sampai },
    ringkas: {
      revenue: total.revenue,
      expense: expense.t,
      laba: total.revenue - expense.t,
      transaksi: total.jumlah_transaksi,
      item_terjual: itemTerjual.c,
      rata_rata: rataRata,
    },
    insight: {
      hari_terbaik: hariTerbaik ? { tanggal: hariTerbaik.tanggal, revenue: hariTerbaik.revenue } : null,
      jam_terbaik: jamTerbaik ? `${jamTerbaik.jam}.00` : null,
      pertumbuhan,
      periode_lalu: { dari: fmt(prevStart.getTime()), sampai: fmt(prevEnd.getTime()), revenue: prevRevenue.r },
    },
    series, per_jam: perJam, produk_top: produkTop, kategori, pembayaran, status,
  });
}
