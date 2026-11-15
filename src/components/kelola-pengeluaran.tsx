"use client";

import { useCallback, useEffect, useState } from "react";
import { Kosong, Modal, Alert, Skeleton } from "@/components/ui";
import { rupiah, tanggal } from "@/lib/format";

type Expense = {
  id: number; keterangan: string; kategori: string; jumlah: number;
  expense_date: string; created_at: string;
};
type Form = { id?: number; keterangan: string; kategori: string; jumlah: string; expense_date: string };

const KATEGORI: Array<[string, string]> = [
  ["BAHAN", "Bahan baku"],
  ["GAJI", "Gaji"],
  ["LISTRIK", "Listrik & air"],
  ["SEWA", "Sewa tempat"],
  ["LAIN", "Lainnya"],
];
const WARNA_KATEGORI: Record<string, string> = {
  BAHAN: "chip-antri", GAJI: "chip-selesai", LISTRIK: "chip-panggil", SEWA: "chip-batal", LAIN: "chip-batal",
};
const kosong = (): Form => ({
  keterangan: "", kategori: "BAHAN", jumlah: "",
  expense_date: new Date().toISOString().slice(0, 10),
});

export default function PengeluaranClient() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [total, setTotal] = useState(0);
  const [rentang, setRentang] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return { dari: d.toISOString().slice(0, 10), sampai: new Date().toISOString().slice(0, 10) };
  });
  const [form, setForm] = useState<Form>(kosong());
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    const r = await fetch(`/api/expenses?dari=${rentang.dari}&sampai=${rentang.sampai}`);
    const d = await r.json().catch(() => ({}));
    setExpenses(d.expenses ?? []);
    setTotal(d.total ?? 0);
  }, [rentang]);

  useEffect(() => { muat(); }, [muat]);

  function bukaTambah() { setForm(kosong()); setErr(""); setModal(true); }
  function bukaUbah(e: Expense) {
    setForm({ id: e.id, keterangan: e.keterangan, kategori: e.kategori, jumlah: String(e.jumlah), expense_date: e.expense_date.slice(0, 10) });
    setErr(""); setModal(true);
  }

  async function simpan(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(""); setPesan("");
    const payload = {
      keterangan: form.keterangan, kategori: form.kategori,
      jumlah: Number(form.jumlah), expense_date: form.expense_date,
    };
    const res = await fetch(form.id ? `/api/expenses/${form.id}` : "/api/expenses", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error || "Gagal menyimpan"); return; }
    setModal(false);
    setPesan(form.id ? "Pengeluaran diperbarui." : "Pengeluaran dicatat.");
    muat();
  }

  async function hapus(e: Expense) {
    if (!confirm(`Hapus pengeluaran "${e.keterangan}"?`)) return;
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || "Gagal menghapus"); return; }
    setPesan("Pengeluaran dihapus.");
    muat();
  }

  const perKategori = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.kategori] = (acc[e.kategori] ?? 0) + e.jumlah;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Admin</p>
          <h1 className="judul text-3xl mt-1">Pengeluaran</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-2)" }}>
            Beban operasional otomatis dihitung sebagai pengurang laba di dashboard analisis.
          </p>
        </div>
        <button onClick={bukaTambah} className="btn btn-utama">+ Catat pengeluaran</button>
      </header>

      {pesan && <div className="mb-4"><Alert jenis="sukses">{pesan}</Alert></div>}

      {/* Ringkasan */}
      <div className="grid md:grid-cols-[auto_1fr] gap-4 mb-5">
        <div className="kartu p-5 min-w-56">
          <p className="micro mb-1">Total {tanggal(rentang.dari)} – {tanggal(rentang.sampai)}</p>
          <p className="angka font-bold text-3xl" style={{ color: "var(--color-ember-2)" }}>{rupiah(total)}</p>
        </div>
        <div className="kartu p-5">
          <p className="micro mb-2.5">Per kategori</p>
          <div className="flex flex-wrap gap-2">
            {KATEGORI.map(([k, l]) => (
              <span key={k} className={`chip ${WARNA_KATEGORI[k]}`} style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}>
                <span className="dot" />{l} · {rupiah(perKategori[k] ?? 0)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="kartu p-4 mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="micro block mb-1" htmlFor="e-dari">Dari</label>
          <input id="e-dari" type="date" className="input angka !w-40 !py-1.5" value={rentang.dari}
            onChange={(e) => setRentang({ ...rentang, dari: e.target.value })} />
        </div>
        <div>
          <label className="micro block mb-1" htmlFor="e-sampai">Sampai</label>
          <input id="e-sampai" type="date" className="input angka !w-40 !py-1.5" value={rentang.sampai}
            onChange={(e) => setRentang({ ...rentang, sampai: e.target.value })} />
        </div>
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel w-full">
          <thead>
            <tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="text-right">Jumlah</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {expenses === null ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><Skeleton className="h-6 my-1" /></td></tr>
              ))
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5}><Kosong pesan="Belum ada pengeluaran pada rentang ini." /></td></tr>
            ) : expenses.map((e) => (
              <tr key={e.id}>
                <td className="angka text-xs whitespace-nowrap">{tanggal(e.expense_date)}</td>
                <td className="font-medium">{e.keterangan}</td>
                <td><span className={`chip ${WARNA_KATEGORI[e.kategori]}`}>{KATEGORI.find(([k]) => k === e.kategori)?.[1] ?? e.kategori}</span></td>
                <td className="angka text-right font-semibold" style={{ color: "var(--color-ember-2)" }}>{rupiah(e.jumlah)}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button onClick={() => bukaUbah(e)} className="btn btn-garis !px-3 !py-1.5 !text-xs">Ubah</button>
                    <button onClick={() => hapus(e)} className="btn btn-bahaya !px-3 !py-1.5 !text-xs">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? "Ubah pengeluaran" : "Catat pengeluaran"}>
        {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}
        <form onSubmit={simpan} className="flex flex-col gap-4">
          <div>
            <label className="micro block mb-1.5" htmlFor="p-ket">Keterangan</label>
            <input id="p-ket" className="input" required maxLength={80} value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="mis. Belanja ayam & minyak" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="micro block mb-1.5" htmlFor="p-kat">Kategori</label>
              <select id="p-kat" className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                {KATEGORI.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="p-jml">Jumlah (Rp)</label>
              <input id="p-jml" type="number" min={500} className="input angka" required value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value })} placeholder="50000" />
            </div>
          </div>
          <div>
            <label className="micro block mb-1.5" htmlFor="p-tgl">Tanggal</label>
            <input id="p-tgl" type="date" className="input angka" value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <button className="btn btn-utama">{form.id ? "Simpan perubahan" : "Catat pengeluaran"}</button>
        </form>
      </Modal>
    </div>
  );
}
