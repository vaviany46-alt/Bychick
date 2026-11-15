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

  const menunggu = db.prepare(`
    SELECT id, queue_number FROM orders
    WHERE date(created_at) = ? AND status = 'QUEUED'
    ORDER BY id ASC LIMIT 12`).all(now);

  const selesai = db.prepare(`
    SELECT queue_number FROM orders
    WHERE date(created_at) = ? AND status = 'DONE'
    ORDER BY done_at DESC LIMIT 6`).all(now);

  const selesaiHariIni = db.prepare(`
    SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = ? AND status = 'DONE'`).get(now) as { c: number };

  return NextResponse.json(
    {
      dipanggil: dipanggil ?? null,
      menunggu,
      selesai: selesai.map((r) => (r as { queue_number: string }).queue_number),
      total_selesai: selesaiHariIni.c,
      waktu: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
