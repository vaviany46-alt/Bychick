import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Proxy global (pengganti middleware di Next 16):
 * 1. Security headers di semua respons (CSP, XCTO, XFO, Referrer-Policy, dll).
 * 2. Pagar halaman berdasarkan sesi & peran (ADMIN/KASIR).
 * Otorisasi API tetap dicek ulang di setiap route handler (defense in depth).
 */
function verify(token: string, secret: string) {
  return jwtVerify(token, new TextEncoder().encode(secret)).catch(() => null);
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("bychick_session")?.value;
  const payload = token && process.env.JWT_SECRET ? await verify(token, process.env.JWT_SECRET) : null;
  const role = payload?.payload?.role as string | undefined;

  let res: NextResponse | undefined;

  // Halaman admin hanya untuk ADMIN
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = payload ? "/" : "/login";
    url.search = "";
    res = NextResponse.redirect(url);
  }
  // Halaman kasir butuh login (admin juga boleh)
  else if (pathname.startsWith("/kasir") && !payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    res = NextResponse.redirect(url);
  }
  // Sudah login tidak perlu lihat login/register lagi
  else if ((pathname === "/login" || pathname === "/register") && payload) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/register" && role !== "ADMIN" ? "/kasir" : "/admin/laporan";
    res = NextResponse.redirect(url);
  }

  const headers = new Headers({
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "off",
    ...(process.env.NODE_ENV === "production"
      ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }
      : {}),
  });

  if (res) for (const [k, v] of headers) res.headers.set(k, v);
  else {
    res = NextResponse.next();
    for (const [k, v] of headers) res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
