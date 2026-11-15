"use client";

import Link from "next/link";

/** Toolbar di atas laporan cetak — tersembunyi saat dicetak/di-PDF-kan. */
export default function ToolbarCetak({ dari, sampai }: { dari: string; sampai: string }) {
  return (
    <div className="print:hidden sticky top-4 z-10 flex justify-center mb-6">
      <div className="kartu px-4 py-3 flex items-center gap-3 shadow-lg">
        <span className="micro">Mode cetak — toolbar ini tidak ikut tercetak</span>
        <Link href={`/admin/laporan`} className="btn btn-garis !py-1.5 !text-xs">← Kembali</Link>
        <button onClick={() => window.print()} className="btn btn-utama !py-1.5 !text-xs">
          Cetak / Simpan PDF
        </button>
        <span className="angka text-xs" style={{ color: "var(--color-ink-2)" }}>{dari} s/d {sampai}</span>
      </div>
    </div>
  );
}
