import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { registerSchema, zodMessage } from "@/lib/validation";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { assertSameOrigin, createToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { logAktivitas } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Permintaan tidak sah (origin)" }, { status: 403 });
  }
  const rl = rateLimit(req, "register", 3, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }
  const { username, name, password } = parsed.data;

  const ada = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (ada) {
    return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
  }

  // Registrasi publik selalu KASIR; pembuatan ADMIN hanya lewat halaman Pengguna (admin).
  const hash = await bcrypt.hash(password, 12);
  const info = db
    .prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, 'KASIR')")
    .run(username, name, hash);

  const token = await createToken({
    sub: String(info.lastInsertRowid),
    username,
    name,
    role: "KASIR",
  });

  logAktivitas({ userId: Number(info.lastInsertRowid), username, action: "REGISTER", detail: "Registrasi akun kasir baru", req });

  const res = NextResponse.json(
    { user: { username, name, role: "KASIR" } },
    { status: 201 }
  );
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
