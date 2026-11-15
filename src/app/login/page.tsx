"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [tahun, setTahun] = useState<number | null>(null);
  useEffect(() => setTahun(new Date().getFullYear()), []);
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [lihatSandi, setLihatSandi] = useState(false);

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
    <div className="relative min-h-screen overflow-hidden flex flex-col" style={{ background: "var(--color-paper)" }}>
      {/* Dekorasi latar */}
      <div className="absolute inset-0 pola-titik" style={{ opacity: 0.55 }} aria-hidden />
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full" style={{ background: "var(--color-ember-soft)", filter: "blur(10px)" }} aria-hidden />
      <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full" style={{ background: "var(--color-kunyit-soft)", filter: "blur(10px)" }} aria-hidden />

      {/* Logo kiri atas */}
      <header className="relative z-10 flex items-center gap-2.5 px-8 pt-7">
        <span className="grid place-items-center rounded-xl w-10 h-10" style={{ background: "var(--color-ember)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M13.5 3.5c3.6-1.3 6.8.8 7 4.2.2 3-2 4.6-4.3 5.4l-4.6 1.6-3.3-3.3 1.6-4.6c.8-2.3 1.9-2.9 3.6-3.3Z" fill="#F7F2E9" />
            <path d="m8.3 11.4 4.3 4.3-2.4 2.4a2 2 0 1 1-1.6-1.6 2 2 0 1 1 1.6-1.6l-2.5-2.5 1.9-1.9Z" fill="#F7F2E9" />
          </svg>
        </span>
        <p className="judul text-xl">BYCHICK<span style={{ color: "var(--color-ember)" }}>.</span></p>
      </header>

      {/* Isi tengah */}
      <main className="relative z-10 flex-1 grid place-items-center px-6 py-10">
        <div className="w-full max-w-[25rem] relative muncul">

          {/* Karcis dekoratif di belakang kartu */}
          <div className="karcis absolute -right-10 -top-8 w-36 p-3 rotate-6 hidden sm:block select-none pointer-events-none"
            style={{ boxShadow: "0 14px 30px -18px rgb(34 23 18 / .35)" }}>
            <p className="micro" style={{ letterSpacing: "0.2em", fontSize: "0.55rem" }}>No. Antrian</p>
            <p className="angka font-bold my-1" style={{ fontSize: "2.2rem", color: "var(--color-ember)", lineHeight: 1 }}>A-07</p>
            <div className="karcis-sekat pt-2 mt-2 flex justify-between text-[0.6rem]" style={{ color: "var(--color-ink-2)" }}>
              <span className="angka">2 item</span>
              <span className="chip chip-antri" style={{ fontSize: "0.5rem", padding: "0.1rem 0.4rem" }}><span className="dot" />Live</span>
            </div>
          </div>

          {/* Kartu form */}
          <div className="kartu p-8 relative">
            <p className="micro">Papan kasir · {tahun ?? ""}</p>
            <h1 className="judul text-4xl mt-2 mb-1">Masuk.</h1>
            <p className="text-sm mb-6" style={{ color: "var(--color-ink-2)" }}>
              Satu pintu untuk kasir, antrian, dan analisis keuangan.
            </p>

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
                <div className="relative">
                  <input id="password" type={lihatSandi ? "text" : "password"} className="input !pr-16" autoComplete="current-password" required
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setLihatSandi((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 micro !normal-case !tracking-normal text-xs px-2 py-1 rounded-md"
                    style={{ color: "var(--color-ember-2)" }}>
                    {lihatSandi ? "Sembunyi" : "Lihat"}
                  </button>
                </div>
              </div>
              <button className="btn btn-utama mt-1 !py-3 !text-[15px]" disabled={loading}>
                {loading ? "Memproses…" : "Masuk ke kasir"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1" style={{ borderTop: "1px solid var(--color-line)" }} />
              <span className="micro" style={{ letterSpacing: "0.1em" }}>belum punya akun?</span>
              <span className="flex-1" style={{ borderTop: "1px solid var(--color-line)" }} />
            </div>
            <Link href="/register" className="btn btn-garis w-full">
              Daftar kasir baru
            </Link>
          </div>

          {/* Akun uji coba */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { r: "Admin", u: "admin", p: "Admin123!" },
              { r: "Kasir", u: "kasir", p: "Kasir123!" },
            ].map((a) => (
              <button key={a.r} type="button"
                onClick={() => setForm({ username: a.u, password: a.p })}
                className="kartu px-3.5 py-2.5 text-left hover:-translate-y-0.5 transition-transform"
                style={{ background: "var(--color-paper)", boxShadow: "none" }}
                title="Klik untuk isi otomatis">
                <p className="micro" style={{ fontSize: "0.55rem" }}>{a.r} · klik isi otomatis</p>
                <p className="angka text-xs font-semibold mt-0.5 truncate">{a.u} / {a.p}</p>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center pb-6">
        <p className="micro" style={{ letterSpacing: "0.18em" }}>Bychick Geprek &amp; Burger · Sistem kasir &amp; antrian</p>
      </footer>
    </div>
  );
}
