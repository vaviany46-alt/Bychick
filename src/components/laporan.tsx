"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui";
import { rupiah, tanggal } from "@/lib/format";

type Summary = {
  rentang: { dari: string; sampai: string };
  ringkas: { revenue: number; expense: number; laba: number; transaksi: number; item_terjual: number; rata_rata: number };
  insight: {
    hari_terbaik: { tanggal: string; revenue: number } | null;
    jam_terbaik: string | null;
    pertumbuhan: number | null;
    periode_lalu: { dari: string; sampai: string; revenue: number };
  };
  series: Array<{ tanggal: string; revenue: number; expense: number }>;
  per_jam: Array<{ jam: string; transaksi: number; revenue: number }>;
  produk_top: Array<{ nama: string; qty: number; revenue: number }>;
  kategori: Array<{ kategori: string; revenue: number }>;
  pembayaran: Array<{ payment_method: string; jumlah: number; revenue: number }>;
  status: Array<{ status: string; jumlah: number }>;
};

const WARNA_KATEGORI = ["#c8401f", "#eda93c", "#3e7c4f", "#54463c"];
const PRESET = [
  { id: "hari", label: "Hari ini" },
  { id: "7", label: "7 hari" },
  { id: "30", label: "30 hari" },
];

function rentangDari(preset: string) {
  const hariIni = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "hari") return { dari: fmt(hariIni), sampai: fmt(hariIni) };
  const d = new Date(hariIni);
  d.setDate(d.getDate() - (preset === "7" ? 6 : 29));
  return { dari: fmt(d), sampai: fmt(hariIni) };
}

export default function LaporanClient() {
  const [preset, setPreset] = useState("7");
  const [rentang, setRentang] = useState(() => rentangDari("7"));
  const [data, setData] = useState<Summary | null>(null);
  const [muat, setMuat] = useState(true);

  const ambilData = useCallback(async (r: { dari: string; sampai: string }) => {
    setMuat(true);
    const res = await fetch(`/api/reports/summary?dari=${r.dari}&sampai=${r.sampai}`);
    if (res.ok) setData(await res.json());
    setMuat(false);
  }, []);

  useEffect(() => { ambilData(rentangDari("7")); }, [ambilData]);

  function gantiPreset(p: string) {
    setPreset(p);
    const r = rentangDari(p);
    setRentang(r);
    ambilData(r);
  }

  function ekspor(jenis: "transaksi" | "rekap") {
    window.open(`/api/reports/export?dari=${rentang.dari}&sampai=${rentang.sampai}&jenis=${jenis}`, "_blank");
  }

  const seri = (data?.series ?? []).map((s) => ({
    ...s,
    label: tanggal(s.tanggal).replace(/\s\d{4}$/, ""),
  }));
  const perJam = (data?.per_jam ?? []).map((j) => ({ ...j, label: `${j.jam}.00` }));
  const maxProduk = Math.max(1, ...(data?.produk_top.map((p) => p.revenue) ?? [1]));
  const margin = data && data.ringkas.revenue > 0 ? Math.round((data.ringkas.laba / data.ringkas.revenue) * 100) : 0;
  const labaPositif = (data?.ringkas.laba ?? 0) >= 0;

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Admin · {tanggal(rentang.dari)} – {tanggal(rentang.sampai)}</p>
          <h1 className="judul text-3xl mt-1">Analisis keuangan</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => ekspor("rekap")} className="btn btn-garis">Ekspor rekap CSV</button>
          <button onClick={() => ekspor("transaksi")} className="btn btn-utama">Ekspor transaksi CSV</button>
        </div>
      </header>

      {/* Filter */}
      <div className="kartu p-3 mb-5 flex flex-wrap items-center gap-2">
        {PRESET.map((p) => (
          <button key={p.id} onClick={() => gantiPreset(p.id)}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
            style={preset === p.id
              ? { background: "var(--color-ink)", color: "#f7f2e9" }
              : { background: "var(--color-paper-2)", color: "var(--color-ink-2)" }}>
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" className="input angka !w-40 !py-1.5" value={rentang.dari}
            onChange={(e) => { const r = { ...rentang, dari: e.target.value }; setRentang(r); setPreset(""); ambilData(r); }} />
          <span className="micro">s/d</span>
          <input type="date" className="input angka !w-40 !py-1.5" value={rentang.sampai}
            onChange={(e) => { const r = { ...rentang, sampai: e.target.value }; setRentang(r); setPreset(""); ambilData(r); }} />
        </div>
      </div>

      {muat && !data ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-72" />
          <div className="grid lg:grid-cols-2 gap-5">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : data && (
        <>
          {/* Kartu utama */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <div className="kartu p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-ember)" }} />
                <span className="micro">Penerimaan</span>
              </div>
              <p className="angka font-bold text-[1.7rem] leading-tight">{rupiah(data.ringkas.revenue)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>
                {data.insight.pertumbuhan === null ? "Transaksi selesai" : (
                  <span style={{ color: data.insight.pertumbuhan >= 0 ? "var(--color-daun)" : "var(--color-ember-2)", fontWeight: 700 }}>
                    {data.insight.pertumbuhan >= 0 ? "▲" : "▼"} {Math.abs(data.insight.pertumbuhan)}% vs periode lalu
                  </span>
                )}
              </p>
            </div>
            <div className="kartu p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-abu)" }} />
                <span className="micro">Pengeluaran</span>
              </div>
              <p className="angka font-bold text-[1.7rem] leading-tight">{rupiah(data.ringkas.expense)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>Beban operasional</p>
            </div>
            <div className="kartu p-5" style={{ borderColor: labaPositif ? "#c6dcc6" : "#f2c8bc", background: labaPositif ? "linear-gradient(180deg,#fff 60%,var(--color-daun-soft))" : "linear-gradient(180deg,#fff 60%,var(--color-ember-soft))" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: labaPositif ? "var(--color-daun)" : "var(--color-ember)" }} />
                <span className="micro">Laba bersih</span>
              </div>
              <p className="angka font-bold text-[1.7rem] leading-tight" style={{ color: labaPositif ? "var(--color-daun)" : "var(--color-ember-2)" }}>
                {rupiah(data.ringkas.laba)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>Margin {margin}% dari penerimaan</p>
            </div>
            <div className="kartu p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-ink)" }} />
                <span className="micro">Transaksi</span>
              </div>
              <p className="angka font-bold text-[1.7rem] leading-tight">{data.ringkas.transaksi}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>{data.ringkas.item_terjual} item · rata-rata {rupiah(data.ringkas.rata_rata)}</p>
            </div>
          </div>

          {/* Grafik utama: penerimaan vs pengeluaran */}
          <div className="kartu p-5 mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="judul text-lg">Penerimaan vs pengeluaran per hari</h2>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "var(--color-ember)" }} />Penerimaan</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "var(--color-abu)" }} />Pengeluaran</span>
              </div>
            </div>
            {seri.length === 0 ? (
              <p className="text-center py-14" style={{ color: "var(--color-ink-2)" }}>Belum ada data pada rentang ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={seri} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#54463c" }} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} />
                  <YAxis tickFormatter={(v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}rb` : String(v))}
                    tick={{ fontSize: 11, fill: "#54463c" }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    cursor={{ fill: "rgb(200 64 31 / .05)" }}
                    formatter={((v: unknown, n: unknown) => [
                      rupiah(Number(v)),
                      n === "revenue" ? "Penerimaan" : "Pengeluaran",
                    ]) as never}
                    labelStyle={{ color: "#221712", fontWeight: 700 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e0d4c2", fontSize: 13 }}
                  />
                  <Bar dataKey="revenue" fill="var(--color-ember)" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="expense" fill="var(--color-abu)" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Insight + jam sibuk */}
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5 mb-5">
            <div className="kartu p-5 flex flex-col gap-4">
              <h2 className="judul text-lg">Wawasan</h2>
              <div className="rounded-xl p-4" style={{ background: "var(--color-paper-2)" }}>
                <p className="micro mb-1">Hari terbaik</p>
                {data.insight.hari_terbaik ? (
                  <>
                    <p className="angka font-bold text-xl">{rupiah(data.insight.hari_terbaik.revenue)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>{tanggal(data.insight.hari_terbaik.tanggal)}</p>
                  </>
                ) : <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>Belum ada data</p>}
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--color-paper-2)" }}>
                <p className="micro mb-1">Jam paling ramai</p>
                <p className="angka font-bold text-xl">{data.insight.jam_terbaik ?? "—"}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>Siapkan stok lebih banyak di jam ini</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--color-paper-2)" }}>
                <p className="micro mb-1">Pertumbuhan</p>
                {data.insight.pertumbuhan === null ? (
                  <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                    Tidak ada pembanding (periode lalu nol transaksi)
                  </p>
                ) : (
                  <>
                    <p className="angka font-bold text-xl" style={{ color: data.insight.pertumbuhan >= 0 ? "var(--color-daun)" : "var(--color-ember-2)" }}>
                      {data.insight.pertumbuhan >= 0 ? "+" : ""}{data.insight.pertumbuhan}%
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
                      dibanding {tanggal(data.insight.periode_lalu.dari)} – {tanggal(data.insight.periode_lalu.sampai)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="kartu p-5">
              <h2 className="judul text-lg mb-4">Ramai per jam</h2>
              {perJam.length === 0 ? (
                <p className="text-center py-14" style={{ color: "var(--color-ink-2)" }}>Belum ada transaksi selesai.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perJam} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#54463c" }} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#54463c" }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgb(237 169 60 / .1)" }}
                      formatter={((v: unknown) => [Number(v), "Transaksi"]) as never}
                      labelStyle={{ color: "#221712", fontWeight: 700 }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e0d4c2", fontSize: 13 }}
                    />
                    <Bar dataKey="transaksi" fill="var(--color-kunyit)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Produk terlaris */}
            <div className="kartu p-5">
              <h2 className="judul text-lg mb-4">Menu paling laku</h2>
              {data.produk_top.length === 0 ? (
                <p className="text-center py-10" style={{ color: "var(--color-ink-2)" }}>Belum ada data.</p>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {data.produk_top.map((p, i) => (
                    <li key={p.nama}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-medium truncate">
                          <span className="angka font-bold mr-2" style={{ color: "var(--color-abu)" }}>{String(i + 1).padStart(2, "0")}</span>
                          {p.nama}
                        </span>
                        <span className="angka text-sm font-semibold shrink-0 ml-2">{rupiah(p.revenue)}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-paper-2)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(4, (p.revenue / maxProduk) * 100)}%`, background: i === 0 ? "var(--color-ember)" : "var(--color-kunyit)" }} />
                      </div>
                      <p className="micro mt-1" style={{ letterSpacing: "0.08em" }}>{p.qty} porsi terjual</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Donut kategori */}
            <div className="kartu p-5 flex flex-col">
              <h2 className="judul text-lg mb-2">Kontribusi kategori</h2>
              {data.kategori.length === 0 ? (
                <p className="text-center py-10" style={{ color: "var(--color-ink-2)" }}>Belum ada data.</p>
              ) : (
                <div className="flex items-center gap-6 flex-1">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={data.kategori} dataKey="revenue" nameKey="kategori" innerRadius={58} outerRadius={92} paddingAngle={3} stroke="none">
                        {data.kategori.map((_, i) => (
                          <Cell key={i} fill={WARNA_KATEGORI[i % WARNA_KATEGORI.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={((v: unknown) => rupiah(Number(v))) as never}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e0d4c2", fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex flex-col gap-2.5 flex-1">
                    {data.kategori.map((k, i) => (
                      <li key={k.kategori} className="flex items-center gap-2.5 text-sm">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: WARNA_KATEGORI[i % WARNA_KATEGORI.length] }} />
                        <span className="font-medium flex-1">{k.kategori}</span>
                        <span className="angka">{rupiah(k.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Metode bayar & status antrian */}
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div className="kartu p-5">
              <h2 className="judul text-lg mb-4">Metode pembayaran</h2>
              {data.pembayaran.length === 0 ? (
                <p className="text-center py-6" style={{ color: "var(--color-ink-2)" }}>Belum ada data.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {data.pembayaran.map((p) => (
                    <div key={p.payment_method} className="rounded-xl p-3.5" style={{ background: "var(--color-paper-2)" }}>
                      <p className="micro mb-1">{p.payment_method === "CASH" ? "Tunai" : p.payment_method}</p>
                      <p className="angka font-bold">{rupiah(p.revenue)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>{p.jumlah} transaksi</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="kartu p-5">
              <h2 className="judul text-lg mb-4">Kondisi antrian</h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { s: "DONE", l: "Selesai", c: "var(--color-daun)" },
                  { s: "CALLED", l: "Dipanggil", c: "var(--color-ember)" },
                  { s: "QUEUED", l: "Menunggu", c: "var(--color-kunyit)" },
                  { s: "CANCELLED", l: "Batal", c: "var(--color-abu)" },
                ].map((x) => {
                  const d = data.status.find((st) => st.status === x.s);
                  return (
                    <div key={x.s} className="rounded-xl p-3.5 text-center" style={{ background: "var(--color-paper-2)" }}>
                      <p className="angka font-bold text-2xl" style={{ color: x.c }}>{d?.jumlah ?? 0}</p>
                      <p className="micro mt-1">{x.l}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
