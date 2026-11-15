"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Alert } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [tahun, setTahun] = useState<number | null>(null);
  useEffect(() => setTahun(new Date().getFullYear()), []);
  const [form, setForm] = useState({ name: "", username: "", password: "", konfirmasi: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (form.password !== form.konfirmasi) {
      setErr("Konfirmasi password tidak sama");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, username: form.username, password: form.password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Registrasi gagal"); return; }
    router.replace("/kasir");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel brand */}
      <div className="relative hidden lg:flex flex-col justify-between p-10" style={{ background: "var(--color-ink)" }}>
        <Logo light />
        <div>
          <h1 className="judul text-[3rem] text-[#f7f2e9]">
            Jadi bagian dari<br />
            <span style={{ color: "var(--color-kunyit)" }}>tim dapur Bychick.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: "#a5947f" }}>
            Akun yang didaftarkan lewat halaman ini berperan sebagai <b>kasir</b>.
            Hak akses admin hanya dapat diberikan oleh admin yang sudah ada.
          </p>
          <ul className="mt-6 flex flex-col gap-2.5 text-sm" style={{ color: "#cbbfb3" }}>
            {[
              "Password disimpan sebagai hash bcrypt (cost 12)",
              "Password minimal 8 karakter, ada huruf & angka",
              "Sesi berupa JWT di cookie HttpOnly",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-ember)" }} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs" style={{ color: "#6b5644" }}>© {tahun ?? ""} Bychick Geprek &amp; Burger</p>
      </div>

      {/* Panel form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm muncul">
          <div className="lg:hidden mb-8"><Logo /></div>
          <p className="micro mb-1">Registrasi</p>
          <h2 className="judul text-3xl mb-6">Buat akun kasir</h2>

          {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="micro block mb-1.5" htmlFor="name">Nama lengkap</label>
              <input id="name" className="input" required maxLength={60}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="mis. Dewi Lestari" />
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="r-username">Username</label>
              <input id="r-username" className="input" required pattern="[a-zA-Z0-9_.]{3,24}" title="3–24 karakter, huruf/angka/titik/underscore"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="mis. dewi" />
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="r-password">Password</label>
              <input id="r-password" type="password" className="input" required minLength={8}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 karakter, huruf & angka" />
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="r-konfirmasi">Ulangi password</label>
              <input id="r-konfirmasi" type="password" className="input" required
                value={form.konfirmasi} onChange={(e) => setForm({ ...form, konfirmasi: e.target.value })}
                placeholder="••••••••" />
            </div>
            <button className="btn btn-utama mt-2" disabled={loading}>
              {loading ? "Mendaftar…" : "Daftar & Masuk"}
            </button>
          </form>

          <p className="text-sm mt-6" style={{ color: "var(--color-ink-2)" }}>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-ember-2)" }}>
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
