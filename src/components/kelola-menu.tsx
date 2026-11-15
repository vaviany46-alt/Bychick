"use client";

import { useEffect, useMemo, useState } from "react";
import { Kosong, Modal, Alert } from "@/components/ui";
import { rupiah, CATEGORY_LABEL } from "@/lib/format";

type Menu = { id: number; name: string; category: string; price: number; is_available: number };
type Form = { id?: number; name: string; category: Menu["category"]; price: string; is_available: boolean };

const KATEGORI = ["GEPREK", "BURGER", "MINUMAN", "SNAK"] as const;
const kosong: Form = { name: "", category: "GEPREK", price: "", is_available: true };

export default function MenuClient() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [form, setForm] = useState<Form>(kosong);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [pesan, setPesan] = useState("");
  const [cari, setCari] = useState("");
  const [muat, setMuat] = useState(true);

  async function muatUlang() {
    const r = await fetch("/api/menu");
    const d = await r.json().catch(() => ({}));
    setMenus(d.menus ?? []);
    setMuat(false);
  }
  useEffect(() => { muatUlang(); }, []);

  const tersaring = useMemo(
    () => menus.filter((m) => m.name.toLowerCase().includes(cari.toLowerCase().trim())),
    [menus, cari]
  );

  function bukaTambah() { setForm(kosong); setErr(""); setModal(true); }
  function bukaUbah(m: Menu) {
    setForm({ id: m.id, name: m.name, category: m.category as Form["category"], price: String(m.price), is_available: !!m.is_available });
    setErr(""); setModal(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setPesan("");
    const payload = { name: form.name, category: form.category, price: Number(form.price), is_available: form.is_available };
    const res = await fetch(form.id ? `/api/menu/${form.id}` : "/api/menu", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error || "Gagal menyimpan"); return; }
    setModal(false);
    setPesan(form.id ? "Menu diperbarui." : "Menu ditambahkan.");
    muatUlang();
  }

  async function hapus(m: Menu) {
    if (!confirm(`Hapus menu "${m.name}"?`)) return;
    const res = await fetch(`/api/menu/${m.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { alert(d.error || "Gagal menghapus"); return; }
    if (d.message) alert(d.message);
    setPesan("Menu dihapus.");
    muatUlang();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Admin</p>
          <h1 className="judul text-3xl mt-1">Kelola menu</h1>
        </div>
        <button onClick={bukaTambah} className="btn btn-utama">+ Menu baru</button>
      </header>

      {pesan && <div className="mb-4"><Alert jenis="sukses">{pesan}</Alert></div>}

      <div className="kartu p-4 mb-4">
        <input className="input" placeholder="Cari menu…" value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel w-full">
          <thead>
            <tr><th>Menu</th><th>Kategori</th><th className="text-right">Harga</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {muat ? (
              <tr><td colSpan={5} className="text-center py-10">Memuat…</td></tr>
            ) : tersaring.length === 0 ? (
              <tr><td colSpan={5}><Kosong pesan="Belum ada menu." /></td></tr>
            ) : tersaring.map((m) => (
              <tr key={m.id}>
                <td className="font-medium">{m.name}</td>
                <td><span className="chip chip-antri">{CATEGORY_LABEL[m.category]}</span></td>
                <td className="angka text-right font-semibold">{rupiah(m.price)}</td>
                <td>
                  {m.is_available
                    ? <span className="chip chip-selesai"><span className="dot" />Tersedia</span>
                    : <span className="chip chip-batal"><span className="dot" />Habis</span>}
                </td>
                <td>
                  <div className="flex gap-1.5">
                    <button onClick={() => bukaUbah(m)} className="btn btn-garis !px-3 !py-1.5 !text-xs">Ubah</button>
                    <button onClick={() => hapus(m)} className="btn btn-bahaya !px-3 !py-1.5 !text-xs">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? "Ubah menu" : "Menu baru"}>
        {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}
        <form onSubmit={simpan} className="flex flex-col gap-4">
          <div>
            <label className="micro block mb-1.5" htmlFor="m-nama">Nama menu</label>
            <input id="m-nama" className="input" required maxLength={60} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mis. Geprek Sambal Bawang L3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="micro block mb-1.5" htmlFor="m-kat">Kategori</label>
              <select id="m-kat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Form["category"] })}>
                {KATEGORI.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="m-harga">Harga (Rp)</label>
              <input id="m-harga" type="number" min={500} className="input angka" required value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#c8401f]" checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            <span className="text-sm font-medium">Tersedia di kasir</span>
          </label>
          <button className="btn btn-utama">{form.id ? "Simpan perubahan" : "Tambah menu"}</button>
        </form>
      </Modal>
    </div>
  );
}
