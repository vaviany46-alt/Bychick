"use client";

import { useEffect, useRef, useState } from "react";

type QueueData = {
  dipanggil: { id: number; queue_number: string; called_at: string } | null;
  menunggu: Array<{ id: number; queue_number: string }>;
  selesai: string[];
  total_selesai: number;
  waktu: string;
};

/**
 * Layar antrian untuk TV (dibuka fullscreen, halaman publik tanpa login).
 * Auto-refresh tiap 5 detik + bunyi "ting" saat nomor baru dipanggil.
 */
export default function DisplayPage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [jam, setJam] = useState("");
  const [tanggalLabel, setTanggalLabel] = useState("");
  const nomorSebelumnya = useRef<string | null>(null);

  useEffect(() => {
    async function muat() {
      const r = await fetch("/api/queue", { cache: "no-store" });
      if (!r.ok) return;
      const d: QueueData = await r.json();
      setData(d);
      const nomor = d.dipanggil?.queue_number ?? null;
      if (nomor && nomorSebelumnya.current && nomor !== nomorSebelumnya.current) bunyi();
      if (nomor) nomorSebelumnya.current = nomor;
    }
    muat();
    const t = setInterval(muat, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setJam(d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setTanggalLabel(d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  function bunyi() {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.6);
    } catch {
      // Autoplay diblokir browser — biarkan senyap.
    }
  }

  const dipanggil = data?.dipanggil ?? null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* Bar atas */}
      <header className="flex items-center justify-between px-10 py-6" style={{ borderBottom: "1px solid rgb(247 242 233 / .12)" }}>
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-xl w-11 h-11" style={{ background: "var(--color-ember)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M13.5 3.5c3.6-1.3 6.8.8 7 4.2.2 3-2 4.6-4.3 5.4l-4.6 1.6-3.3-3.3 1.6-4.6c.8-2.3 1.9-2.9 3.6-3.3Z" fill="#F7F2E9" />
              <path d="m8.3 11.4 4.3 4.3-2.4 2.4a2 2 0 1 1-1.6-1.6 2 2 0 1 1 1.6-1.6l-2.5-2.5 1.9-1.9Z" fill="#F7F2E9" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="judul text-2xl" style={{ color: "#f7f2e9" }}>BYCHICK<span style={{ color: "var(--color-kunyit)" }}>.</span></p>
            <p className="micro" style={{ color: "#98887a" }}>Geprek &amp; Burger</p>
          </div>
        </div>
        <div className="text-right">
          <p className="angka font-bold text-4xl" style={{ color: "#f7f2e9" }}>{jam}</p>
          <p className="micro" style={{ color: "#98887a" }}>{tanggalLabel}</p>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-[1.5fr_1fr] gap-8 p-10 items-stretch">
        {/* Nomor dipanggil */}
        <section className="rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: "var(--color-ember)", boxShadow: "inset 0 -6px 0 rgb(0 0 0 / .2)" }}>
          <p className="micro text-center" style={{ color: "rgb(247 242 233 / .8)", letterSpacing: "0.3em" }}>Sekarang dipanggil</p>
          <p key={dipanggil?.queue_number} className="angka font-bold muncul text-center"
            style={{ fontSize: "clamp(6rem, 22vw, 15rem)", color: "#f7f2e9", lineHeight: 1.05 }}>
            {dipanggil ? dipanggil.queue_number : "—"}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <span className="w-3 h-3 rounded-full denyut" style={{ background: "#f7f2e9" }} />
            <p className="text-lg font-semibold" style={{ color: "rgb(247 242 233 / .9)" }}>
              {dipanggil ? "Silakan menuju kasir untuk pesanan Anda" : "Menunggu panggilan…"}
            </p>
          </div>
        </section>

        {/* Daftar menunggu + riwayat */}
        <section className="flex flex-col gap-6 min-w-0">
          <div className="rounded-3xl p-6 flex-1" style={{ background: "rgb(247 242 233 / .05)" }}>
            <div className="flex justify-between items-center mb-4">
              <p className="micro" style={{ color: "#cbbfb3" }}>Antrian berikutnya</p>
              <span className="chip chip-antri">{data?.menunggu.length ?? 0} menunggu</span>
            </div>
            {data?.menunggu.length ? (
              <div className="grid grid-cols-2 gap-3">
                {data.menunggu.slice(0, 8).map((m) => (
                  <div key={m.id} className="rounded-2xl px-4 py-3 flex items-center justify-between"
                    style={{ background: "rgb(247 242 233 / .08)" }}>
                    <span className="angka font-bold text-2xl" style={{ color: "var(--color-kunyit)" }}>{m.queue_number}</span>
                    <span className="micro" style={{ color: "#98887a" }}>Menunggu</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-lg" style={{ color: "#98887a" }}>Tidak ada antrian</p>
            )}
          </div>

          <div className="rounded-3xl p-6" style={{ background: "rgb(247 242 233 / .05)" }}>
            <div className="flex justify-between items-center mb-3">
              <p className="micro" style={{ color: "#cbbfb3" }}>Baru selesai</p>
              <span className="micro" style={{ color: "#98887a" }}>{data?.total_selesai ?? 0} pesanan selesai hari ini</span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-9">
              {data?.selesai.length
                ? data.selesai.map((n) => (
                    <span key={n} className="chip chip-selesai text-sm !text-base !py-1 !px-3"
                      style={{ background: "rgb(62 124 79 / .25)", color: "#a7d2ae", borderColor: "transparent" }}>
                      <span className="dot" />{n}
                    </span>
                  ))
                : <p className="text-sm" style={{ color: "#98887a" }}>Belum ada.</p>}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-10 py-4 text-center" style={{ borderTop: "1px solid rgb(247 242 233 / .12)" }}>
        <p className="text-sm" style={{ color: "#98887a" }}>
          Ambil nomor antrian di kasir — pesanan tampil otomatis di layar ini.
        </p>
      </footer>
    </div>
  );
}
