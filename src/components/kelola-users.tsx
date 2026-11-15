"use client";

import { useEffect, useState } from "react";
import { Chip, Kosong, Modal, Alert } from "@/components/ui";
import { tanggal } from "@/lib/format";

type User = { id: number; username: string; name: string; role: "ADMIN" | "KASIR"; is_active: number; created_at: string };
type Form = { id?: number; name: string; username: string; role: "ADMIN" | "KASIR"; password: string };

const kosong: Form = { name: "", username: "", role: "KASIR", password: "" };

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<Form>(kosong);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [pesan, setPesan] = useState("");
  const [muat, setMuat] = useState(true);

  async function muatUlang() {
    const r = await fetch("/api/users");
    const d = await r.json().catch(() => ({}));
    setUsers(d.users ?? []);
    setMuat(false);
  }
  useEffect(() => { muatUlang(); }, []);

  function bukaTambah() { setForm(kosong); setErr(""); setModal(true); }
  function bukaUbah(u: User) {
    setForm({ id: u.id, name: u.name, username: u.username, role: u.role, password: "" });
    setErr(""); setModal(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setPesan("");
    const payload: Record<string, unknown> = { name: form.name, role: form.role };
    if (!form.id) { payload.username = form.username; payload.password = form.password; }
    else if (form.password) payload.password = form.password;

    const res = await fetch(form.id ? `/api/users/${form.id}` : "/api/users", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error || "Gagal menyimpan"); return; }
    setModal(false);
    setPesan(form.id ? "Pengguna diperbarui." : "Pengguna ditambahkan.");
    muatUlang();
  }

  async function toggleAktif(u: User) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { alert(d.error || "Gagal"); return; }
    muatUlang();
  }

  async function hapus(u: User) {
    if (!confirm(`Hapus akun @${u.username}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { alert(d.error || "Gagal menghapus"); return; }
    if (d.message) alert(d.message);
    setPesan("Pengguna dihapus.");
    muatUlang();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Admin</p>
          <h1 className="judul text-3xl mt-1">Pengguna &amp; hak akses</h1>
        </div>
        <button onClick={bukaTambah} className="btn btn-utama">+ Pengguna baru</button>
      </header>

      {pesan && <div className="mb-4"><Alert jenis="sukses">{pesan}</Alert></div>}

      <div className="kartu overflow-x-auto">
        <table className="tabel w-full">
          <thead>
            <tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {muat ? (
              <tr><td colSpan={6} className="text-center py-10">Memuat…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}><Kosong pesan="Belum ada pengguna." /></td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="angka">@{u.username}</td>
                <td><Chip status={u.role} /></td>
                <td>
                  {u.is_active
                    ? <span className="chip chip-selesai"><span className="dot" />Aktif</span>
                    : <span className="chip chip-batal"><span className="dot" />Nonaktif</span>}
                </td>
                <td className="text-xs" style={{ color: "var(--color-ink-2)" }}>{tanggal(u.created_at)}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button onClick={() => bukaUbah(u)} className="btn btn-garis !px-3 !py-1.5 !text-xs">Ubah</button>
                    <button onClick={() => toggleAktif(u)} className="btn btn-garis !px-3 !py-1.5 !text-xs">
                      {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button onClick={() => hapus(u)} className="btn btn-bahaya !px-3 !py-1.5 !text-xs">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? `Ubah @${form.username}` : "Pengguna baru"}>
        {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}
        <form onSubmit={simpan} className="flex flex-col gap-4">
          <div>
            <label className="micro block mb-1.5" htmlFor="u-nama">Nama lengkap</label>
            <input id="u-nama" className="input" required maxLength={60} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="micro block mb-1.5" htmlFor="u-user">Username</label>
              <input id="u-user" className="input" required pattern="[a-zA-Z0-9_.]{3,24}" title="3–24 karakter, huruf/angka/titik/underscore"
                disabled={!!form.id} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="u-role">Peran</label>
              <select id="u-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Form["role"] })}>
                <option value="KASIR">Kasir</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="micro block mb-1.5" htmlFor="u-pass">
              Password {form.id ? "(kosongkan bila tidak diubah)" : ""}
            </label>
            <input id="u-pass" type="password" className="input" minLength={form.password ? 8 : undefined}
              required={!form.id} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 karakter, huruf & angka" />
          </div>
          <button className="btn btn-utama">{form.id ? "Simpan perubahan" : "Tambah pengguna"}</button>
        </form>
      </Modal>
    </div>
  );
}
