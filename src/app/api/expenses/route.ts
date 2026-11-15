import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { expenseSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

/** Daftar pengeluaran dengan filter rentang tanggal (dari, sampai). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, "ADMIN");
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const hariIni = new Date().toISOString().slice(0, 10);
  const dari = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("dari") || "") ? sp.get("dari")! : hariIni;
  const sampai = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("sampai") || "") ? sp.get("sampai")! : hariIni;

  const expenses = db.prepare(
    "SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, id DESC LIMIT 300"
  ).all(dari, sampai);
  const total = db.prepare(
    "SELECT COALESCE(SUM(jumlah),0) AS t FROM expenses WHERE expense_date BETWEEN ? AND ?"
  ).get(dari, sampai) as { t: number };

  return NextResponse.json({ expenses, total: total.t, rentang: { dari, sampai } });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { keterangan, kategori, jumlah, expense_date } = parsed.data;

  const info = db.prepare(
    "INSERT INTO expenses (keterangan, kategori, jumlah, expense_date, user_id) VALUES (?,?,?,?,?)"
  ).run(keterangan, kategori, jumlah, expense_date ?? new Date().toISOString().slice(0, 10), Number(session!.sub));

  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "PENGELUARAN_TAMBAH", detail: `${keterangan} Rp${jumlah}`, req });
  return NextResponse.json({ expense: db.prepare("SELECT * FROM expenses WHERE id = ?").get(info.lastInsertRowid) }, { status: 201 });
}
