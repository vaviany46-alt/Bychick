import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { userUpdateSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as
    | { id: number; username: string; role: string; is_active: number }
    | undefined;
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { name, role, is_active, password } = parsed.data;

  // Sistem harus selalu punya minimal 1 admin aktif.
  const adminAktif = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='ADMIN' AND is_active=1").get() as { c: number };
  const menonaktifkanAdmin = target.role === "ADMIN" && (is_active === false || (role !== undefined && role !== "ADMIN"));
  if (menonaktifkanAdmin && adminAktif.c <= 1) {
    return NextResponse.json({ error: "Sistem wajib memiliki minimal satu admin aktif" }, { status: 409 });
  }

  if (name !== undefined) db.prepare("UPDATE users SET name=? WHERE id=?").run(name, userId);
  if (role !== undefined) db.prepare("UPDATE users SET role=? WHERE id=?").run(role, userId);
  if (is_active !== undefined) db.prepare("UPDATE users SET is_active=? WHERE id=?").run(is_active ? 1 : 0, userId);
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, userId);
  }

  logAktivitas({
    userId: Number(session!.sub), username: session!.username,
    action: "USER_UBAH", detail: `@${target.username} (nama/role/status/password diperbarui)`, req,
  });
  const user = db.prepare("SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?").get(userId);
  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  if (userId === Number(session!.sub)) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 409 });
  }

  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as { username: string; role: string } | undefined;
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  // Admin terakhir tidak boleh dihapus
  if (target.role === "ADMIN") {
    const adminAktif = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='ADMIN' AND is_active=1").get() as { c: number };
    if (adminAktif.c <= 1) return NextResponse.json({ error: "Sistem wajib memiliki minimal satu admin aktif" }, { status: 409 });
  }

  // Pengguna dengan riwayat transaksi hanya dinonaktifkan (integritas data).
  const dipakai = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE kasir_id = ?").get(userId) as { c: number };
  if (dipakai.c > 0) {
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(userId);
    logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "USER_NONAKTIF", detail: `@${target.username} punya riwayat transaksi → dinonaktifkan`, req });
    return NextResponse.json({ ok: true, softDelete: true, message: "Pengguna punya riwayat transaksi, jadi dinonaktifkan (bukan dihapus)." });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "USER_HAPUS", detail: `@${target.username}`, req });
  return NextResponse.json({ ok: true });
}
