import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "bychick_session";
export const SESSION_TTL_HOURS = 8;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET belum diset (min 16 karakter) di .env");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role: "ADMIN" | "KASIR";
};

export async function createToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      name: String(payload.name ?? ""),
      role: payload.role as "ADMIN" | "KASIR",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_HOURS * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Ambil sesi dari request (server component / route handler). */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Middleware untuk API route: wajib login, opsional wajib role. */
export async function requireAuth(req: Request, role?: "ADMIN" | "KASIR") {
  const bearer = req.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const token = bearer;
  if (!token) return { error: NextResponse.json({ error: "Belum login" }, { status: 401 }), session: null };
  const session = await verifyToken(token);
  if (!session) return { error: NextResponse.json({ error: "Sesi tidak valid / kedaluwarsa" }, { status: 401 }), session: null };
  if (role && session.role !== role) {
    return { error: NextResponse.json({ error: "Akses ditolak: khusus " + role }, { status: 403 }), session: null };
  }
  return { error: null as null, session };
}

/** Proteksi CSRF sederhana: pada request mutasi, origin harus sama dengan host. */
export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client tanpa origin (mis. curl saat uji) tetap dicek otorisasinya
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
