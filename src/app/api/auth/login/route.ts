import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { loginSchema, zodMessage } from "@/lib/validation";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { assertSameOrigin, createToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { logAktivitas } from "@/lib/log";

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Permintaan tidak sah (origin)" }, { status: 403 });
  }
  // Rate limiting: maksimal 5 percobaan login per menit per IP.
  const rl = rateLimit(req, "login", 5, 60_000);
  if (!rl.ok) {
    logAktivitas({ action: "LOGIN_RATE_LIMIT", detail: "Percobaan login melebihi batas", req });
    return tooMany(rl.retryAfter);
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as
    | { id: number; username: string; name: string; password_hash: string; role: "ADMIN" | "KASIR"; is_active: number }
    | undefined;

  // Pesan error generik agar tidak membocorkan keberadaan username (user enumeration).
  const gagal = NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  if (!user) return gagal;
  if (!user.is_active) {
    return NextResponse.json({ error: "Akun dinonaktifkan. Hubungi admin." }, { status: 403 });
  }

  const cocok = await bcrypt.compare(password, user.password_hash);
  if (!cocok) {
    logAktivitas({ userId: user.id, username, action: "LOGIN_GAGAL", detail: "Password salah", req });
    return gagal;
  }

  const token = await createToken({
    sub: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
  });

  logAktivitas({ userId: user.id, username: user.username, action: "LOGIN", detail: `Login sebagai ${user.role}`, req });

  const res = NextResponse.json({
    user: { username: user.username, name: user.name, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
