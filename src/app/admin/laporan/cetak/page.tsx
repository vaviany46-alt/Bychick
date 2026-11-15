import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import ToolbarCetak from "@/components/toolbar-cetak";

export const instant = false;
export const metadata = { title: "Laporan Cetak" };

type SP = Promise<{ dari?: string; sampai?: string }>;

/** Laporan keuangan siap cetak (A4). "Simpan sebagai PDF" di dialog print browser. */
export default async function LaporanCetakPage({ searchParams }: { searchParams: SP }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");

  const sp = await searchParams;
  const hariIni = new Date().toISOString().slice(0, 10);
  const dari = sp.dari && /^\d{4}-\d{2}-\d{2}$/.test(sp.dari) ? sp.dari : hariIni;
  const sampai = sp.sampai && /^\d{4}-\d{2}-\d{2}$/.test(sp.sampai) ? sp.sampai : hariIni;
  if (dari > sampai) redirect("/admin/laporan");

  // ── Data (query sama sumbernya dengan dashboard) ────────────────
  const ringkas = db.prepare(`
    SELECT
      COALESCE((SELECT SUM(total) FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status='DONE'), 0) AS revenue,
      COALESCE((SELECT COUNT(*) FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status='DONE'), 0) AS transaksi,
      COALESCE((SELECT SUM(jumlah) FROM expenses WHERE expense_date BETWEEN ? AND ?), 0) AS expense,
      COALESCE((SELECT SUM(oi.qty) FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE date(o.created_at) BETWEEN ? AND ? AND o.status='DONE'), 0) AS item
  `).get(dari, sampai, dari, sampai, dari, sampai, dari, sampai) as {
    revenue: number; transaksi: number; expense: number; item: number;
  };

  const perHari = db.prepare(`
    SELECT d AS tgl,
      (SELECT COUNT(*) FROM orders WHERE date(created_at)=d AND status='DONE') AS transaksi,
      COALESCE((SELECT SUM(total) FROM orders WHERE date(created_at)=d AND status='DONE'), 0) AS revenue,
      COALESCE((SELECT SUM(jumlah) FROM expenses WHERE expense_date=d), 0) AS expense
    FROM (SELECT DISTINCT date(created_at) AS d FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status='DONE'
          UNION SELECT DISTINCT expense_date FROM expenses WHERE expense_date BETWEEN ? AND ?)
    ORDER BY d`).all(dari, sampai, dari, sampai) as Array<{ tgl: string; transaksi: number; revenue: number; expense: number }>;

  const produkTop = db.prepare(`
    SELECT oi.menu_name AS nama, SUM(oi.qty) AS qty, SUM(oi.subtotal) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status='DONE'
    GROUP BY oi.menu_name ORDER BY revenue DESC LIMIT 10`).all(dari, sampai) as Array<{ nama: string; qty: number; revenue: number }>;

  const perKategori = db.prepare(`
    SELECT kategori, COALESCE(SUM(jumlah),0) AS total FROM expenses
    WHERE expense_date BETWEEN ? AND ? GROUP BY kategori ORDER BY total DESC`).all(dari, sampai) as Array<{ kategori: string; total: number }>;

  const pembayaran = db.prepare(`
    SELECT payment_method, COUNT(*) AS jumlah, SUM(total) AS revenue
    FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status='DONE'
    GROUP BY payment_method`).all(dari, sampai) as Array<{ payment_method: string; jumlah: number; revenue: number }>;

  const laba = ringkas.revenue - ringkas.expense;
  const rataRata = ringkas.transaksi > 0 ? Math.round(ringkas.revenue / ringkas.transaksi) : 0;
  const sekarang = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  const KATEGORI_LABEL: Record<string, string> = {
    BAHAN: "Bahan baku", GAJI: "Gaji", LISTRIK: "Listrik & air", SEWA: "Sewa tempat", LAIN: "Lainnya",
  };

  return (
    <div className="min-h-screen py-8" style={{ background: "var(--color-paper-2)" }}>
      <ToolbarCetak dari={dari} sampai={sampai} />

      {/* Lembar A4 */}
      <div className="mx-auto w-[21cm] max-w-full bg-white shadow-xl px-[2cm] py-[1.6cm] print:shadow-none print:w-auto"
        style={{ color: "var(--color-ink)", printColorAdjust: "exact" }}>

        {/* Kop surat */}
        <div className="flex items-start justify-between gap-6 pb-5" style={{ borderBottom: "3px double var(--color-ink)" }}>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center rounded-xl w-12 h-12" style={{ background: "var(--color-ember)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M13.5 3.5c3.6-1.3 6.8.8 7 4.2.2 3-2 4.6-4.3 5.4l-4.6 1.6-3.3-3.3 1.6-4.6c.8-2.3 1.9-2.9 3.6-3.3Z" fill="#F7F2E9" />
                <path d="m8.3 11.4 4.3 4.3-2.4 2.4a2 2 0 1 1-1.6-1.6 2 2 0 1 1 1.6-1.6l-2.5-2.5 1.9-1.9Z" fill="#F7F2E9" />
              </svg>
            </span>
            <div>
              <p className="judul text-3xl">BYCHICK<span style={{ color: "var(--color-ember)" }}>.</span></p>
              <p className="micro">Geprek &amp; Burger</p>
            </div>
          </div>
          <div className="text-right">
            <p className="judul text-xl">LAPORAN KEUANGAN</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-ink-2)" }}>
              Periode {tanggal(dari)} – {tanggal(sampai)}
            </p>
          </div>
        </div>

        {/* Info laporan */}
        <div className="grid grid-cols-2 gap-x-10 text-sm mt-4">
          <p>Dicetak pada: <b className="angka">{sekarang}</b></p>
          <p className="text-right">Oleh: <b>{session.name}</b> ({session.role})</p>
        </div>

        {/* Ringkasan */}
        <h2 className="judul text-lg mt-7 mb-2">A. Ringkasan</h2>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Penerimaan (transaksi selesai)", rupiah(ringkas.revenue)],
              ["Pengeluaran operasional", `(${rupiah(ringkas.expense)})`],
              ["Laba bersih", rupiah(laba)],
              ["Jumlah transaksi", `${ringkas.transaksi} transaksi`],
              ["Item terjual", `${ringkas.item} item`],
              ["Rata-rata per transaksi", rupiah(rataRata)],
            ].map(([k, v], i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-line)" }}>
                <td className="py-2" style={{ color: "var(--color-ink-2)" }}>{k}</td>
                <td className="py-2 text-right angka font-bold"
                  style={{ color: k.includes("Laba") ? (laba >= 0 ? "var(--color-daun)" : "var(--color-ember-2)") : "var(--color-ink)" }}>
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rincian per hari */}
        {perHari.length > 0 && (
          <>
            <h2 className="judul text-lg mt-7 mb-2">B. Rincian per hari</h2>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-ink)" }}>
                  <th className="text-left py-2 micro">Tanggal</th>
                  <th className="text-right py-2 micro">Transaksi</th>
                  <th className="text-right py-2 micro">Penerimaan</th>
                  <th className="text-right py-2 micro">Pengeluaran</th>
                  <th className="text-right py-2 micro">Laba hari</th>
                </tr>
              </thead>
              <tbody>
                {perHari.map((h) => (
                  <tr key={h.tgl} style={{ borderBottom: "1px solid var(--color-line)" }}>
                    <td className="py-1.5 angka">{tanggal(h.tgl)}</td>
                    <td className="py-1.5 text-right angka">{h.transaksi}</td>
                    <td className="py-1.5 text-right angka">{rupiah(h.revenue)}</td>
                    <td className="py-1.5 text-right angka" style={{ color: "var(--color-ink-2)" }}>{rupiah(h.expense)}</td>
                    <td className="py-1.5 text-right angka font-semibold"
                      style={{ color: h.revenue - h.expense >= 0 ? "var(--color-daun)" : "var(--color-ember-2)" }}>
                      {rupiah(h.revenue - h.expense)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderBottom: "3px double var(--color-ink)" }}>
                  <td className="py-2 font-bold">Total</td>
                  <td className="py-2 text-right angka font-bold">{ringkas.transaksi}</td>
                  <td className="py-2 text-right angka font-bold">{rupiah(ringkas.revenue)}</td>
                  <td className="py-2 text-right angka font-bold">{rupiah(ringkas.expense)}</td>
                  <td className="py-2 text-right angka font-bold">{rupiah(laba)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Pengeluaran per kategori */}
        {perKategori.length > 0 && (
          <>
            <h2 className="judul text-lg mt-7 mb-2">C. Pengeluaran per kategori</h2>
            <div className="grid grid-cols-2 gap-x-10 text-sm">
              {perKategori.map((k) => (
                <div key={k.kategori} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <span style={{ color: "var(--color-ink-2)" }}>{KATEGORI_LABEL[k.kategori] ?? k.kategori}</span>
                  <span className="angka font-semibold">{rupiah(k.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Menu terlaris */}
        {produkTop.length > 0 && (
          <>
            <h2 className="judul text-lg mt-7 mb-2">D. Menu terlaris</h2>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-ink)" }}>
                  <th className="text-left py-2 micro">No</th>
                  <th className="text-left py-2 micro">Menu</th>
                  <th className="text-right py-2 micro">Terjual</th>
                  <th className="text-right py-2 micro">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {produkTop.map((p, i) => (
                  <tr key={p.nama} style={{ borderBottom: "1px solid var(--color-line)" }}>
                    <td className="py-1.5 angka">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-1.5">{p.nama}</td>
                    <td className="py-1.5 text-right angka">{p.qty}</td>
                    <td className="py-1.5 text-right angka font-semibold">{rupiah(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Metode pembayaran */}
        {pembayaran.length > 0 && (
          <>
            <h2 className="judul text-lg mt-7 mb-2">E. Metode pembayaran</h2>
            <div className="grid grid-cols-3 gap-x-10 text-sm">
              {pembayaran.map((p) => (
                <div key={p.payment_method} className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <span style={{ color: "var(--color-ink-2)" }}>{p.payment_method === "CASH" ? "Tunai" : p.payment_method}</span>
                  <span className="angka font-semibold">{rupiah(p.revenue)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tanda tangan */}
        <div className="grid grid-cols-2 gap-x-16 mt-14 text-sm text-center">
          {[
            ["Dibuat oleh", session.name],
            ["Mengetahui", "Owner Bychick"],
          ].map(([k, n]) => (
            <div key={k}>
              <p className="micro mb-14">{k}</p>
              <p style={{ borderTop: "1px solid var(--color-ink)", display: "inline-block", padding: "0.4rem 2rem" }}>{n}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-10" style={{ color: "var(--color-ink-2)" }}>
          Dokumen ini dihasilkan otomatis oleh sistem kasir Bychick — sah tanpa tanda tangan basah bila dicetak dari sistem.
        </p>
      </div>
    </div>
  );
}
