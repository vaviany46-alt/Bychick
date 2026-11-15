"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/* ── Logo ─────────────────────────────────────────────── */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <span
        className="grid place-items-center rounded-xl w-9 h-9 shrink-0"
        style={{ background: "var(--color-ember)", boxShadow: "inset 0 -3px 0 rgb(0 0 0 / .25)" }}
      >
        {/* Siluet kaki ayam (drumstick) */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M13.5 3.5c3.6-1.3 6.8.8 7 4.2.2 3-2 4.6-4.3 5.4l-4.6 1.6-3.3-3.3 1.6-4.6c.8-2.3 1.9-2.9 3.6-3.3Z"
            fill="#F7F2E9"
          />
          <path d="m8.3 11.4 4.3 4.3-2.4 2.4a2 2 0 1 1-1.6-1.6 2 2 0 1 1 1.6-1.6l-2.5-2.5 1.9-1.9Z" fill="#F7F2E9" />
        </svg>
      </span>
      <span className="leading-none">
        <span
          className="judul block text-[1.05rem]"
          style={{ color: light ? "#F7F2E9" : "var(--color-ink)" }}
        >
          BYCHICK<span style={{ color: "var(--color-kunyit)" }}>.</span>
        </span>
        <span className="micro" style={{ letterSpacing: "0.2em", fontSize: "0.55rem" }}>
          Geprek &amp; Burger
        </span>
      </span>
    </span>
  );
}

/* ── Chip status ──────────────────────────────────────── */
export function Chip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    QUEUED: ["chip-antri", "Menunggu"],
    CALLED: ["chip-panggil", "Dipanggil"],
    DONE: ["chip-selesai", "Selesai"],
    CANCELLED: ["chip-batal", "Dibatalkan"],
    ADMIN: ["chip-selesai", "Admin"],
    KASIR: ["chip-antri", "Kasir"],
  };
  const [cls, label] = map[status] ?? ["chip-batal", status];
  return (
    <span className={`chip ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

/* ── Ikon garis sederhana ─────────────────────────────── */
function Ikon({ d, ...p }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d={d} />
    </svg>
  );
}
const IKON = {
  kasir: "M3 9h18M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 9h2",
  transaksi: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 6h6M9 12h6",
  menu: "M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z",
  laporan: "M4 20V10m5 10V4m5 16v-7m5 7V8M2 20h20",
  dompet: "M20 7H4a2 2 0 0 1 0-4h13v4m3 0v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5m12 8h.01",
  tv: "M2 7h20v13H2zM8 3l4 4 4-4M9 13h6",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  logs: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  keluar: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
};

/* ── Shell aplikasi (sidebar) ─────────────────────────── */
type NavItem = { href: string; label: string; icon: keyof typeof IKON };
const NAV_ADMIN: NavItem[] = [
  { href: "/admin/laporan", label: "Analisis Keuangan", icon: "laporan" },
  { href: "/kasir", label: "Kasir", icon: "kasir" },
  { href: "/kasir/transaksi", label: "Transaksi", icon: "transaksi" },
  { href: "/admin/menu", label: "Kelola Menu", icon: "menu" },
  { href: "/admin/pengeluaran", label: "Pengeluaran", icon: "dompet" },
  { href: "/admin/users", label: "Pengguna", icon: "users" },
  { href: "/admin/logs", label: "Log Aktivitas", icon: "logs" },
];
const NAV_KASIR: NavItem[] = [
  { href: "/kasir", label: "Kasir", icon: "kasir" },
  { href: "/kasir/transaksi", label: "Transaksi", icon: "transaksi" },
  { href: "/kasir/pengeluaran", label: "Pengeluaran", icon: "dompet" },
];

export function Shell({
  user,
  children,
}: {
  user: { name: string; username: string; role: "ADMIN" | "KASIR" };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [keluar, setKeluar] = useState(false);
  const nav = user.role === "ADMIN" ? NAV_ADMIN : NAV_KASIR;

  async function logout() {
    setKeluar(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen p-4 gap-1" style={{ background: "var(--color-ink)" }}>
        <div className="px-2 pt-2 pb-5">
          <Logo light />
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const aktif = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={
                  aktif
                    ? { background: "var(--color-ember)", color: "#fff" }
                    : { color: "#cbbfb3" }
                }
              >
                <Ikon d={IKON[n.icon]} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Link
            href="/display"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium mb-3"
            style={{ color: "#cbbfb3" }}
          >
            <Ikon d={IKON.tv} />
            Layar Antrian <span className="micro" style={{ color: "var(--color-kunyit)" }}>TV ↗</span>
          </Link>
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgb(255 255 255 / .06)" }}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "#F7F2E9" }}>{user.name}</p>
              <p className="text-xs truncate" style={{ color: "#98887a" }}>@{user.username} · {user.role}</p>
            </div>
            <button onClick={logout} disabled={keluar} title="Keluar" className="grid place-items-center w-9 h-9 rounded-lg shrink-0 hover:opacity-80" style={{ background: "rgb(200 64 31 / .25)", color: "#f3b8a8" }}>
              <Ikon d={IKON.keluar} />
            </button>
          </div>
        </div>
      </aside>

      {/* Bar atas mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-2 px-3 py-2.5 overflow-x-auto" style={{ background: "var(--color-ink)" }}>
        <Logo light />
        <nav className="flex gap-1 ml-2">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={path === n.href ? { background: "var(--color-ember)", color: "#fff" } : { color: "#cbbfb3" }}>
              {n.label}
            </Link>
          ))}
          <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ color: "#f3b8a8" }}>
            Keluar
          </button>
        </nav>
      </div>

      <main className="flex-1 min-w-0 md:p-8 p-3 pt-16 md:pt-8">{children}</main>
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, lebar }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; lebar?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgb(34 23 18 / .55)" }} onClick={onClose}>
      <div
        className="kartu w-full muncul max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: lebar ?? "28rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
          <h3 className="judul text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--color-paper-2)] text-lg leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Status kosong ────────────────────────────────────── */
export function Kosong({ pesan, aksi }: { pesan: string; aksi?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center mb-3" style={{ background: "var(--color-paper-2)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
      </div>
      <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>{pesan}</p>
      {aksi && <div className="mt-3">{aksi}</div>}
    </div>
  );
}

/* ── Skeleton loading ─────────────────────────────────── */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/* ── Alert inline ─────────────────────────────────────── */
export function Alert({ jenis, children }: { jenis: "gagal" | "sukses"; children: React.ReactNode }) {
  const style =
    jenis === "gagal"
      ? { background: "var(--color-ember-soft)", color: "var(--color-ember-2)", border: "1px solid #f2c8bc" }
      : { background: "var(--color-daun-soft)", color: "var(--color-daun)", border: "1px solid #c6dcc6" };
  return (
    <div className="rounded-xl px-4 py-3 text-sm font-medium muncul" style={style}>
      {children}
    </div>
  );
}
