# Bychick POS — Kasir, Layar Antrian TV & Dashboard Analisis Keuangan

Aplikasi web **Bychick Geprek & Burger**: kasir (POS) yang otomatis menghasilkan **nomor antrian** untuk ditampilkan di **layar TV**, lengkap dengan **dashboard analisis keuangan** (grafik, rekap, ekspor CSV). Dibuat sebagai Tugas Besar mata kuliah Cyber Security dengan penerapan keamanan sesuai ketentuan.

## Fitur

| Fitur | Keterangan |
|---|---|
| Registrasi & Login | JWT di cookie **HttpOnly + Secure + SameSite**, password hash **bcrypt (cost 12)**, kebijakan password kuat |
| Hak akses (RBAC) | Peran **ADMIN** (laporan, menu, pengguna, log) dan **KASIR** (POS & transaksi), dijaga middleware + cek ulang tiap API |
| CRUD data | Menu (tambah/lihat/ubah/hapus), Pengguna, Transaksi (status antrian) — tersimpan di **SQLite** |
| Kasir (POS) | Katalog menu + keranjang, **diskon & PPN 11%**, hitung total & kembalian, struk siap cetak dengan nomor antrian harian (A-001 dst.) |
| Layar antrian TV | Halaman publik `/display`: nomor dipanggil besar + bunyi "ting", daftar antrian berikutnya, auto-refresh 5 detik, cocok dibuka fullscreen di browser TV |
| Dashboard keuangan | Penerimaan vs **pengeluaran & laba bersih** (margin), grafik per hari (dua seri), **ramai per jam**, menu terlaris, kontribusi kategori, metode pembayaran, kondisi antrian, **panel wawasan** (hari terbaik, jam ramai, pertumbuhan vs periode lalu) |
| Laporan cetak PDF | Halaman `/admin/laporan/cetak` bergaya A4 (kop surat, ringkasan, rincian per hari, pengeluaran per kategori, menu terlaris, metode bayar, tanda tangan) — tombol "Cetak / Simpan PDF" memakai dialog print browser |
| Layar antrian TV | Halaman publik `/display`: nomor dipanggil besar + bunyi "ting", daftar antrian berikutnya **dengan estimasi waktu tunggu** (dihitung dari jeda panggilan nyata), **slide promo berputar otomatis** dengan indikator, auto-refresh 5 detik |
| Pengeluaran | **Kasir mencatat harian** (hanya hari ini, tanpa backdate) di `/kasir/pengeluaran`; **admin melihat rekap lengkap** dengan filter rentang di `/admin/pengeluaran` — beban otomatis mengurangi laba di dashboard |
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
- Penulisan proteksi keamanan (security headers via `proxy.ts`, RBAC, rate limiting, CSRF, sanitasi input).
- Penyusunan README, skrip `tes-keamanan.mjs`, dan dokumentasi laporan.

Mahasiswa memverifikasi dengan membaca ulang kode, menjalankan aplikasi, dan melakukan self-testing (lihat bawah). Tidak ada secret/kredensial nyata yang dimasukkan ke prompt AI.

## Ringkasan Self-Testing Keamanan

Hasil nyata dari skrip `tes-keamanan.mjs` (jalankan `node tes-keamanan.mjs` saat server aktif):

| # | Skenario uji | Cara uji | Hasil |
|---|---|---|---|
| 1 | SQL Injection pada login & filter | Input `' OR 1=1--` pada username/parameter | Lolos — HTTP 401, semua query *prepared statement* |
| 2 | XSS tersimpan pada nama menu | Simpan `<script>alert(1)</script>` | Diperbaiki — awalnya tersimpan mentah (harmless di React), kini tag `< >` dibuang saat input (sanitasi Zod) |
| 3 | RBAC / IDOR | Akun KASIR memanggil `GET /api/users`, `POST /api/menu`, `GET /api/logs`, `PATCH /api/users/1` | Lolos — semua HTTP 403; halaman `/admin/*` redirect (307) |
| 4 | Password lemah ditolak | Registrasi dengan `12345678` | Lolos — HTTP 400 (min. 8 karakter, wajib huruf & angka) |
| 5 | Rate limiting login | 6× login salah berurutan | Lolos — HTTP 429 + `Retry-After`, tercatat di audit log |
| 6 | CSRF | `POST /api/auth/login` dengan header `Origin: https://evil.example` | Lolos — HTTP 403 (cek origin pada semua mutasi) |
| 7 | Sesi & token | JWT palsu `abc.def.ghi` di cookie | Lolos — HTTP 401 "Sesi tidak valid"; logout mengosongkan cookie |
| 8 | Security headers | Cek header respons | Lolos — CSP, XCTO `nosniff`, XFO `DENY`, `Referrer-Policy`, HSTS (produksi) |
| 9 | Secret di repositori | `git ls-files` / cek `.gitignore` | Lolos — `.env` tidak ter-track, hanya `.env.example` tanpa nilai asli |
| 10 | Audit dependensi | `npm audit` | 7 *moderate* — seluruhnya di `devDependencies` (typescript-eslint/minimatch, dev tooling), **bukan kode produksi** |

Skenario lengkap + bukti tangkapan layar didokumentasikan dalam laporan PDF (minimal 5 skenario: skenario, cara uji, hasil, perbaikan).

## Catatan Presentasi

Layar TV sebaiknya dibuka di browser fullscreen (F11) pada `https://<domain>/display` — polling tiap 5 detik dan berbunyi saat nomor baru dipanggil.
