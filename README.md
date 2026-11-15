# Bychick POS — Kasir, Layar Antrian TV & Dashboard Analisis Keuangan

Aplikasi web **Bychick Geprek & Burger**: kasir (POS) yang otomatis menghasilkan **nomor antrian** untuk ditampilkan di **layar TV**, lengkap dengan **dashboard analisis keuangan** (grafik, rekap, ekspor CSV). Dibuat sebagai Tugas Besar mata kuliah Cyber Security dengan penerapan keamanan sesuai ketentuan.

## Fitur

| Fitur | Keterangan |
|---|---|
| Registrasi & Login | JWT di cookie **HttpOnly + Secure + SameSite**, password hash **bcrypt (cost 12)**, kebijakan password kuat |
| Hak akses (RBAC) | Peran **ADMIN** (laporan, menu, pengguna, log) dan **KASIR** (POS & transaksi), dijaga middleware + cek ulang tiap API |
| CRUD data | Menu (tambah/lihat/ubah/hapus), Pengguna, Transaksi (status antrian) — tersimpan di **SQLite** |
| Kasir (POS) | Katalog menu + keranjang, hitung total & kembalian, struk dengan nomor antrian harian (A-001 dst.) |
| Layar antrian TV | Halaman publik `/display`: nomor dipanggil besar + bunyi "ting", daftar antrian berikutnya, auto-refresh 5 detik, cocok dibuka fullscreen di browser TV |
| Dashboard keuangan | Penerimaan, transaksi, item terjual, rata-rata/transaksi, grafik per hari, menu terlaris, kontribusi kategori, metode pembayaran, kondisi antrian |
| Laporan & ekspor | Filter rentang tanggal (preset 7/30 hari + custom) dan **ekspor CSV** (detail transaksi / rekap harian) |
| Log aktivitas | Audit trail login, transaksi, perubahan data, ekspor — hanya bisa dilihat ADMIN |
| Keamanan tambahan | Rate limiting login/registrasi, proteksi CSRF (cek origin), security headers (CSP, HSTS, XCTO, XFO, dll.), validasi & sanitasi input dengan Zod, log percobaan login gagal |

## Teknologi

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS v4**
- **SQLite** via `better-sqlite3` (query parameterized — anti SQL Injection)
- Autentikasi: `jose` (JWT HS256) + `bcryptjs`; validasi: `zod`
- Grafik: `recharts`
- Akun seed dibuat otomatis saat database pertama kali diinisialisasi

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env    # lalu isi JWT_SECRET dengan string acak
npm run dev             # http://localhost:3000
```

Build produksi: `npm run build && npm start`.

Database SQLite dibuat otomatis di folder `data/` saat pertama kali dijalankan, termasuk:
- akun `admin / Admin123!` dan `kasir / Kasir123!` (password seed dari env),
- 16 menu contoh,
- 14 hari data transaksi demo untuk menghidupkan dashboard (matikan dengan `DEMO_SEED=0`).

## Konfigurasi Environment Variable

| Variabel | Fungsi | Catatan |
|---|---|---|
| `JWT_SECRET` | Menandatangani token sesi | Wajib diganti di produksi, minimal 16 karakter, jangan di-commit |
| `SQLITE_PATH` | Lokasi file SQLite | Default `./data/bychick.db` |
| `SEED_ADMIN_PASSWORD` / `SEED_KASIR_PASSWORD` | Password akun seed awal | Hanya berlaku saat database masih kosong |
| `DEMO_SEED` | Data demo dashboard | `0` untuk menonaktifkan |

Tidak ada secret yang ditulis di source code; semua lewat environment variable (`.env` di-ignore Git).

## URL Aplikasi

- Aplikasi: diisi sesuai hasil deploy (mis. `https://bychick.vercel.app`)
- Layar antrian TV: `<URL>/display` (publik, tanpa login)

## Deployment (HTTPS + FQDN)

Aplikasi ini memakai SQLite (file) sehingga paling mudah di-hosting sebagai **Node server**:

1. **Railway / Render** — deploy repo, set env `JWT_SECRET` (dan `DEMO_SEED=0`), domain + SSL otomatis. SQLite disimpan di persistent disk agar tidak hilang saat redeploy.
2. **Vercel** — berfungsi, namun filesystem serverless bersifat ephemeral (data reset); untuk produksi penuh, ganti ke Postgres (mis. Neon) dengan mengganti lapisan `src/lib/db.ts`.

Wajib HTTPS: Railway/Render/Vercel memberikan sertifikat valid otomatis pada domain yang diberikan.

## Penggunaan AI Agent (transparansi)

Sesuai ketentuan tugas, bagian dari kode ini dibantu **OpenCode (GLM)**:
- Perancangan struktur proyek, skema database, dan API autentikasi/transaksi/laporan.
- Penulisan middleware keamanan (security headers, RBAC, rate limiting, CSRF).
- Penyusunan README dan skenario uji keamanan.

Mahasiswa memverifikasi dengan membaca ulang kode, menjalankan aplikasi, dan melakukan self-testing (lihat bawah). Tidak ada secret/kredensial nyata yang dimasukkan ke prompt AI.

## Ringkasan Self-Testing Keamanan

| # | Skenario uji | Cara uji | Hasil |
|---|---|---|---|
| 1 | SQL Injection pada login & filter | Input `' OR 1=1--` pada username/parameter | Lolos — semua query *prepared statement* |
| 2 | XSS pada nama menu/pelanggan | Simpan `<script>alert(1)</script>` lalu lihat daftar | Lolos — React meng-escape output |
| 3 | RBAC / IDOR | Akun KASIR membuka `/admin/*` & `PATCH /api/menu` | Lolos — redirect + HTTP 403 |
| 4 | Password lemah ditolak | Registrasi dengan `12345678` | Lolos — Zod menolak (min. 8, ada huruf & angka) |
| 5 | Rate limiting login | 6× login salah berurutan | Lolos — HTTP 429 + `Retry-After` |
| 6 | Sesi & logout | Logout lalu akses `/admin/laporan` | Lolos — cookie dikosongkan, redirect ke login |
| 7 | Security headers | Cek response di DevTools / securityheaders.com | Lolos — CSP, HSTS (produksi), XCTO, XFO, Referrer-Policy |
| 8 | Secret di repositori | `git log -p` / cek `.gitignore` | Lolos — `.env` di-ignore, `.env.example` tanpa nilai asli |

Skenario lengkap + bukti tangkapan layar didokumentasikan dalam laporan PDF.

## Catatan Presentasi

Layar TV sebaiknya dibuka di browser fullscreen (F11) pada `https://<domain>/display` — polling tiap 5 detik dan berbunyi saat nomor baru dipanggil.
