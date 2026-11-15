import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { expenseSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  // Ubah data hanya untuk admin — kasir cukup mencatat & menghapus salah catat hari ini.
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const lama = db.prepare("SELECT * FROM expenses WHERE id = ?").get(idNum) as { keterangan: string } | undefined;
  if (!lama) return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { keterangan, kategori, jumlah, expense_date } = parsed.data;

  db.prepare("UPDATE expenses SET keterangan=?, kategori=?, jumlah=?, expense_date=? WHERE id=?")
    .run(keterangan, kategori, jumlah, expense_date ?? new Date().toISOString().slice(0, 10), idNum);

  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "PENGELUARAN_UBAH", detail: `#${idNum} ${keterangan}`, req });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req);
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const lama = db.prepare("SELECT keterangan, expense_date FROM expenses WHERE id = ?").get(idNum) as
    { keterangan: string; expense_date: string } | undefined;
  if (!lama) return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });

  // Kasir hanya boleh menghapus pengeluaran hari ini; admin bebas.
  if (session!.role !== "ADMIN" && lama.expense_date !== new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "Kasir hanya boleh menghapus pengeluaran hari ini" }, { status: 403 });
  }

  db.prepare("DELETE FROM expenses WHERE id = ?").run(idNum);
  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "PENGELUARAN_HAPUS", detail: `#${idNum} ${lama.keterangan}`, req });
  return NextResponse.json({ ok: true });
}
