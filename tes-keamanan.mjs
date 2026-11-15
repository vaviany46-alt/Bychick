/* Self-testing keamanan sederhana (sesuai ketentuan tugas). Jalankan: node tes-keamanan.mjs */
const BASE = "http://localhost:3000";
const hasil = [];

async function req(path, { method = "GET", body, cookie, origin } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  let text = await res.text();
  try { text = JSON.stringify(JSON.parse(text)); } catch {}
  return { status: res.status, text: text.slice(0, 140), headers: res.headers };
}

async function login(username, password) {
  const r = await req("/api/auth/login", { method: "POST", body: { username, password } });
  const c = r.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { cookie: c, status: r.status };
}

// 1. SQL Injection pada login
await hasil.push(["SQLi login", await req("/api/auth/login", { method: "POST", body: { username: "' OR 1=1--", password: "x" } })]);

// 2. SQL Injection pada parameter filter
await hasil.push(["SQLi filter", await req("/api/orders?tanggal=2025-01-01'%20OR%201=1--")]);

// 3. Password lemah ditolak
await hasil.push(["Password lemah", await req("/api/auth/register", { method: "POST", body: { username: "lemah123", name: "User Lemah", password: "12345678" } })]);

// 4. XSS tersimpan (menu bernama script) — harus tetap 201, output murni data JSON
const admin = await login("admin", "Admin123!");
await hasil.push(["XSS simpan", await req("/api/menu", { method: "POST", body: { name: "<script>alert(1)</script>", category: "SNAK", price: 1000 }, cookie: admin.cookie })]);

// 5. RBAC — akun kasir menyentuh API admin
const kasir = await login("kasir", "Kasir123!");
await hasil.push(["RBAC GET /api/users", await req("/api/users", { cookie: kasir.cookie })]);
await hasil.push(["RBAC POST /api/menu", await req("/api/menu", { method: "POST", body: { name: "Retas", category: "SNAK", price: 1000 }, cookie: kasir.cookie })]);
await hasil.push(["RBAC GET /api/logs", await req("/api/logs", { cookie: kasir.cookie })]);
await hasil.push(["RBAC IDOR PATCH user", await req("/api/users/1", { method: "PATCH", body: { is_active: false }, cookie: kasir.cookie })]);

// 6. Halaman admin dengan cookie kasir → harus redirect
await hasil.push(["RBAC halaman admin", await req("/admin/users", { cookie: kasir.cookie })]);

// 7. Tanpa sesi
await hasil.push(["Tanpa sesi", await req("/api/orders")]);

// 8. CSRF — origin asing pada mutasi
await hasil.push(["CSRF origin asing", await req("/api/auth/login", { method: "POST", body: { username: "admin", password: "Admin123!" }, origin: "https://evil.example" })]);

// 9. Security headers
const r9 = await req("/login");
hasil.push(["Security headers", { status: r9.status, text: ["csp:" + (r9.headers.get("content-security-policy") ? "ya" : "tidak"), "xcto:" + r9.headers.get("x-content-type-options"), "xfo:" + r9.headers.get("x-frame-options"), "rp:" + r9.headers.get("referrer-policy")].join(" ") }]);

// 10. Rate limiting login (6 percobaan gagal)
let terakhir;
for (let i = 0; i < 6; i++) terakhir = await req("/api/auth/login", { method: "POST", body: { username: "admin", password: "SalahPass1" } });
hasil.push(["Rate limit login", terakhir]);

// 11. Sesi tampered (JWT palsu) → 401
await hasil.push(["JWT palsu", await req("/api/orders", { cookie: "bychick_session=abc.def.ghi" })]);

for (const [nama, r] of hasil) console.log(`${nama.padEnd(22)} → ${r.status} | ${r.text}`);
