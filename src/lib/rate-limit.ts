import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Rate limiting sederhana berbasis memori (sliding window per jendela waktu).
 * Dipakai pada endpoint sensitif seperti login & registrasi.
 */
export function rateLimit(req: Request, key: string, max: number, windowMs: number) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || now > b.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: max - 1, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > max) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfter: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { ok: true as const, remaining: max - b.count, retryAfter: 0 };
}

export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// Bersihkan bucket kedaluwarsa secara berkala agar memori tidak menumpuk.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 60_000).unref?.();
