"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Alert } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [tahun, setTahun] = useState<number | null>(null);
  useEffect(() => setTahun(new Date().getFullYear()), []);
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Login gagal"); return; }
    router.replace("/");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel brand */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden" style={{ background: "var(--color-ink)" }}>
        <Logo light />
        <div className="relative">
          <h1 className="judul text-[3.4rem] text-[#f7f2e9]">
            Kasir, antrian &amp; uang —
            <br />
            <span style={{ color: "var(--color-kunyit)" }}>satu papan.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: "#a5947f" }}>
            Transaksi kasir langsung tercetak nomor antriannya di layar TV,
            dan setiap rupiah tercatat di dashboard analisis keuangan.
          </p>
        </div>

        {/* Mockup karcis antrian */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 rotate-3">
          <div className="karcis w-64 p-5" style={{ borderRadius: "1.25rem" }}>
            <p className="micro" style={{ letterSpacing: "0.22em" }}>No. Antrian</p>
            <p className="angka font-bold my-2" style={{ fontSize: "3.5rem", color: "var(--color-ember)", lineHeight: 1 }}>A-007</p>
            <div className="karcis-sekat pt-3 mt-3 flex justify-between items-center text-xs" style={{ color: "var(--color-ink-2)" }}>
              <span>2 item · Rp31.000</span>
              <span className="chip chip-antri"><span className="dot" />Dipanggil</span>
            </div>
          </div>
          <div className="karcis w-64 p-4 mt-3 -rotate-6 opacity-80" style={{ borderRadius: "1.25rem" }}>
            <div className="flex justify-between text-xs" style={{ color: "var(--color-ink-2)" }}>
              <span className="micro">Penerimaan Hari Ini</span>
              <span className="chip chip-selesai"><span className="dot" />Live</span>
            </div>
            <p className="angka font-bold text-2xl mt-1.5" style={{ color: "var(--color-ink)" }}>Rp1.248.000</p>
            <svg viewBox="0 0 220 48" className="mt-2 w-full">
              <polyline
                points="0,40 30,34 60,36 90,26 120,30 150,18 180,20 220,8"
                fill="none" stroke="var(--color-ember)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs" style={{ color: "#6b5644" }}>© {tahun ?? ""} Bychick Geprek &amp; Burger</p>
      </div>

      {/* Panel form */}
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-sm muncul">
          <div className="lg:hidden mb-8"><Logo /></div>
          <p className="micro mb-1">Selamat datang kembali</p>
          <h2 className="judul text-3xl mb-6">Masuk ke kasir</h2>

          {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="micro block mb-1.5" htmlFor="username">Username</label>
              <input id="username" className="input" autoComplete="username" required
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="mis. kasir" />
            </div>
            <div>
              <label className="micro block mb-1.5" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" autoComplete="current-password" required
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" />
            </div>
            <button className="btn btn-utama mt-2" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </button>
          </form>

          <p className="text-sm mt-6" style={{ color: "var(--color-ink-2)" }}>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--color-ember-2)" }}>
              Daftar kasir baru
            </Link>
          </p>

          <div className="kartu mt-8 p-4 text-xs leading-relaxed" style={{ color: "var(--color-ink-2)", background: "var(--color-paper-2)", boxShadow: "none" }}>
            <p className="micro mb-1.5">Akun uji coba</p>
            Admin — <span className="angka">admin / Admin123!</span><br />
            Kasir — <span className="angka">kasir / Kasir123!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
