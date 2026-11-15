import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * Endpoint publik untuk layar antrian TV. Tidak butuh login.
 * Hanya memaparkan nomor antrian — tanpa data pelanggan/keuangan.
 */
export async function GET() {
  const now = new Date().toISOString().slice(0, 10);

  const dipanggil = db.prepare(`
    SELECT id, queue_number, called_at FROM orders
    WHERE date(created_at) = ? AND status = 'CALLED'
    ORDER BY called_at DESC LIMIT 1`).get(now);

  const menunggu = (db.prepare(`
    SELECT id, queue_number FROM orders
    WHERE date(created_at) = ? AND status = 'QUEUED'
    ORDER BY id ASC LIMIT 12`).all(now) as Array<{ id: number; queue_number: string }>);

  const selesai = db.prepare(`
    SELECT queue_number FROM orders
    WHERE date(created_at) = ? AND status = 'DONE'
    ORDER BY done_at DESC LIMIT 6`).all(now);

  const selesaiHariIni = db.prepare(`
    SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = ? AND status = 'DONE'`).get(now) as { c: number };

  // Estimasi waktu tunggu: rata-rata jeda antar panggilan hari ini (menit).
  const calls = db.prepare(`
    SELECT called_at FROM orders
    WHERE date(created_at) = ? AND called_at IS NOT NULL AND status IN ('CALLED','DONE')
    ORDER BY called_at ASC LIMIT 30`).all(now) as Array<{ called_at: string }>;
  let gap = 0;
  for (let i = 1; i < calls.length; i++) {
    gap += (new Date(calls[i].called_at.replace(" ", "T")).getTime() -
            new Date(calls[i - 1].called_at.replace(" ", "T")).getTime()) / 60000;
  }
  gap = calls.length > 1 ? gap / (calls.length - 1) : 0;
  // Fallback: rata-rata durasi pesanan selesai (dibuat → selesai), minimal 4 menit.
  if (!gap) {
    const durasi = db.prepare(`
      SELECT AVG((julianday(done_at) - julianday(created_at)) * 1440) AS m
      FROM orders WHERE date(created_at) = ? AND status = 'DONE' AND done_at IS NOT NULL`).get(now) as { m: number | null };
    gap = durasi.m && durasi.m > 0 ? durasi.m : 8;
  }
  const perAntrian = Math.min(180, Math.max(2, Math.round(gap)));

  return NextResponse.json(
    {
      dipanggil: dipanggil ?? null,
      menunggu: menunggu.map((m, i) => ({ ...m, estimasi: Math.min(180, (i + 1) * perAntrian) })),
      estimasi_per_antrian: perAntrian,
      selesai: selesai.map((r) => (r as { queue_number: string }).queue_number),
      total_selesai: selesaiHariIni.c,
      waktu: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
