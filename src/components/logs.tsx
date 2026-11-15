"use client";

import { useEffect, useState } from "react";
import { Kosong } from "@/components/ui";
import { tanggalJam } from "@/lib/format";

type Log = {
  id: number; username: string | null; action: string; detail: string | null;
  ip: string; created_at: string;
};

const WARNA_AKSI: Record<string, string> = {
  LOGIN: "chip-selesai",
  LOGIN_GAGAL: "chip-panggil",
  LOGIN_RATE_LIMIT: "chip-panggil",
  LOGOUT: "chip-batal",
  REGISTER: "chip-selesai",
  ORDER_BARU: "chip-antri",
  ORDER_CALLED: "chip-antri",
  ORDER_DONE: "chip-selesai",
  ORDER_CANCELLED: "chip-batal",
};

export default function LogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [muat, setMuat] = useState(true);

  useEffect(() => {
    fetch("/api/logs?batas=200")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setMuat(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="micro">Admin</p>
        <h1 className="judul text-3xl mt-1">Log aktivitas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-ink-2)" }}>
          Audit trail: 200 aktivitas terakhir (login, transaksi, perubahan data, ekspor).
        </p>
      </header>

      <div className="kartu overflow-x-auto">
        <table className="tabel w-full">
          <thead>
            <tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th><th>IP</th></tr>
          </thead>
          <tbody>
            {muat ? (
              <tr><td colSpan={5} className="text-center py-10">Memuat…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5}><Kosong pesan="Belum ada aktivitas." /></td></tr>
            ) : logs.map((l) => (
              <tr key={l.id}>
                <td className="angka text-xs whitespace-nowrap">{tanggalJam(l.created_at)}</td>
                <td className="angka">{l.username ? `@${l.username}` : "—"}</td>
                <td>
                  <span className={`chip ${WARNA_AKSI[l.action] ?? "chip-batal"}`}>
                    <span className="dot" />{l.action}
                  </span>
                </td>
                <td className="text-xs max-w-72 truncate" style={{ color: "var(--color-ink-2)" }}>{l.detail ?? "—"}</td>
                <td className="angka text-xs">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
