"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chip, Kosong, Modal, Alert } from "@/components/ui";
import { rupiah, CATEGORY_LABEL } from "@/lib/format";

type Menu = { id: number; name: string; category: string; price: number; is_available: number };
type Line = { menu: Menu; qty: number };
type Receipt = {
  order: { id: number; queue_number: string; total: number; payment_method: string; cash_received: number | null; created_at: string; customer_name: string | null };
  items: Array<{ menu_name: string; qty: number; price: number; subtotal: number }>;
  kembalian: number;
};

const KATEGORI = ["SEMUA", "GEPREK", "BURGER", "MINUMAN", "SNAK"] as const;

export default function PosClient({ kasirName }: { kasirName: string }) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [kategori, setKategori] = useState<(typeof KATEGORI)[number]>("SEMUA");
  const [cari, setCari] = useState("");
  const [keranjang, setKeranjang] = useState<Line[]>([]);
  const [bayar, setBayar] = useState<"CASH" | "QRIS" | "DEBIT">("CASH");
  const [uang, setUang] = useState("");
  const [pelanggan, setPelanggan] = useState("");
  const [modalBayar, setModalBayar] = useState(false);
  const [struk, setStruk] = useState<Receipt | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/menu").then((r) => r.json()).then((d) => setMenus(d.menus ?? []));
  }, []);

  const tersaring = useMemo(
    () =>
      menus.filter(
        (m) =>
          (kategori === "SEMUA" || m.category === kategori) &&
          m.name.toLowerCase().includes(cari.toLowerCase().trim())
      ),
    [menus, kategori, cari]
  );

  const total = keranjang.reduce((s, l) => s + l.menu.price * l.qty, 0);
  const totalItem = keranjang.reduce((s, l) => s + l.qty, 0);
  const kembalian = bayar === "CASH" ? Math.max(0, (Number(uang) || 0) - total) : 0;

  function tambah(menu: Menu) {
    setErr("");
    setKeranjang((k) => {
      const ada = k.find((l) => l.menu.id === menu.id);
      if (ada) return k.map((l) => (l.menu.id === menu.id ? { ...l, qty: l.qty + 1 } : l));
      return [...k, { menu, qty: 1 }];
    });
  }
  function ubahQty(id: number, d: number) {
    setKeranjang((k) =>
      k.map((l) => (l.menu.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter((l) => l.qty > 0)
    );
  }

  async function checkout() {
    if (bayar === "CASH" && (Number(uang) || 0) < total) {
      setErr("Uang diterima kurang dari total tagihan");
      return;
    }
    setLoading(true); setErr("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: keranjang.map((l) => ({ menu_id: l.menu.id, qty: l.qty })),
        payment_method: bayar,
        cash_received: bayar === "CASH" ? Number(uang) : null,
        customer_name: pelanggan,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Checkout gagal"); return; }
    setModalBayar(false);
    setStruk({ order: data.order, items: data.order_items, kembalian: data.kembalian });
    setKeranjang([]); setUang(""); setPelanggan("");
  }

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Kasir · {kasirName}</p>
          <h1 className="judul text-3xl mt-1">Ambil pesanan, cetak antrian</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kasir/transaksi" className="btn btn-garis">Riwayat &amp; antrian</Link>
          <Link href="/display" target="_blank" className="btn btn-utama">Buka layar TV ↗</Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Katalog menu */}
        <section className="kartu p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {KATEGORI.map((k) => (
              <button key={k} onClick={() => setKategori(k)}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                style={kategori === k
                  ? { background: "var(--color-ink)", color: "#f7f2e9" }
                  : { background: "var(--color-paper-2)", color: "var(--color-ink-2)" }}>
                {k === "SEMUA" ? "Semua" : CATEGORY_LABEL[k]}
              </button>
            ))}
            <input className="input !w-44 ml-auto" placeholder="Cari menu…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>

          {tersaring.length === 0 ? (
            <Kosong pesan="Menu tidak ditemukan." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {tersaring.map((m) => (
                <button key={m.id} onClick={() => m.is_available && tambah(m)} disabled={!m.is_available}
                  className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                  style={m.is_available
                    ? { borderColor: "var(--color-line)", background: "#fff", cursor: "pointer" }
                    : { borderColor: "var(--color-line)", background: "var(--color-paper-2)", opacity: 0.55, cursor: "not-allowed" }}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold text-[15px] leading-snug">{m.name}</p>
                    {!m.is_available && <span className="chip chip-batal shrink-0">Habis</span>}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="micro">{CATEGORY_LABEL[m.category]}</span>
                    <span className="angka font-bold" style={{ color: "var(--color-ember-2)" }}>{rupiah(m.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Panel keranjang */}
        <aside className="kartu p-5 lg:sticky lg:top-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="judul text-lg">Pesanan</h2>
            <span className="chip chip-antri">{totalItem} item</span>
          </div>

          {keranjang.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--color-ink-2)" }}>
              Klik menu di kiri untuk menambah pesanan.
            </p>
          ) : (
            <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-line)" }}>
              {keranjang.map((l) => (
                <li key={l.menu.id} className="py-2.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{l.menu.name}</p>
                    <p className="angka text-xs" style={{ color: "var(--color-ink-2)" }}>{rupiah(l.menu.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => ubahQty(l.menu.id, -1)} className="w-7 h-7 rounded-lg border grid place-items-center hover:bg-[var(--color-paper-2)]" style={{ borderColor: "var(--color-line)" }}>−</button>
                    <span className="angka font-semibold w-5 text-center">{l.qty}</span>
                    <button onClick={() => ubahQty(l.menu.id, 1)} className="w-7 h-7 rounded-lg border grid place-items-center hover:bg-[var(--color-paper-2)]" style={{ borderColor: "var(--color-line)" }}>+</button>
                  </div>
                  <span className="angka font-semibold text-sm w-20 text-right shrink-0">{rupiah(l.menu.price * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="karcis-sekat pt-4 mt-2 flex justify-between items-baseline">
            <span className="micro">Total</span>
            <span className="angka font-bold text-2xl" style={{ color: "var(--color-ember-2)" }}>{rupiah(total)}</span>
          </div>

          <button className="btn btn-utama w-full mt-4" disabled={keranjang.length === 0} onClick={() => { setErr(""); setModalBayar(true); }}>
            Bayar → nomor antrian
          </button>
        </aside>
      </div>

      {/* Modal pembayaran */}
      <Modal open={modalBayar} onClose={() => setModalBayar(false)} title="Pembayaran">
        {err && <div className="mb-4"><Alert jenis="gagal">{err}</Alert></div>}
        <div className="mb-4 flex items-baseline justify-between rounded-xl p-4" style={{ background: "var(--color-paper-2)" }}>
          <span className="micro">Total tagihan</span>
          <span className="angka font-bold text-2xl">{rupiah(total)}</span>
        </div>

        <p className="micro mb-2">Metode pembayaran</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["CASH", "QRIS", "DEBIT"] as const).map((m) => (
            <button key={m} onClick={() => setBayar(m)}
              className="rounded-xl border py-2.5 text-sm font-semibold transition-colors"
              style={bayar === m
                ? { borderColor: "var(--color-ember)", background: "var(--color-ember-soft)", color: "var(--color-ember-2)" }
                : { borderColor: "var(--color-line)" }}>
              {m === "CASH" ? "Tunai" : m}
            </button>
          ))}
        </div>

        {bayar === "CASH" && (
          <div className="mb-4">
            <label className="micro block mb-1.5" htmlFor="uang">Uang diterima</label>
            <input id="uang" type="number" min={0} className="input angka" value={uang} onChange={(e) => setUang(e.target.value)} placeholder="0" />
            <div className="flex gap-2 mt-2">
              {[total, 50000, 100000, 200000].map((v, i) => (
                <button key={i} onClick={() => setUang(String(v))} className="btn btn-garis !px-3 !py-1.5 !text-xs">
                  {i === 0 ? "Uang pas" : rupiah(v)}
                </button>
              ))}
            </div>
            {uang && (
              <p className="mt-2.5 text-sm">
                Kembalian: <b className="angka" style={{ color: kembalian >= 0 ? "var(--color-daun)" : "var(--color-ember-2)" }}>{rupiah(kembalian)}</b>
                {kembalian < 0 && <span style={{ color: "var(--color-ember-2)" }}> — uang kurang</span>}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="micro block mb-1.5" htmlFor="pelanggan">Nama pelanggan (opsional)</label>
          <input id="pelanggan" className="input" maxLength={60} value={pelanggan} onChange={(e) => setPelanggan(e.target.value)} placeholder="Untuk panggilan personal" />
        </div>

        <button className="btn btn-utama w-full" onClick={checkout} disabled={loading || keranjang.length === 0}>
          {loading ? "Memproses…" : `Konfirmasi · ${rupiah(total)}`}
        </button>
      </Modal>

      {/* Struk / karcis antrian */}
      <Modal open={!!struk} onClose={() => setStruk(null)} title="Transaksi berhasil" lebar="24rem">
        {struk && (
          <div className="muncul">
            <div className="text-center mb-4">
              <p className="micro">Nomor antrian</p>
              <p className="angka font-bold denyut" style={{ fontSize: "4rem", color: "var(--color-ember)", lineHeight: 1.1 }}>{struk.order.queue_number}</p>
              <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>Tampil otomatis di layar TV</p>
            </div>
            <div className="karcis-sekat pt-4 mb-4">
              <ul className="flex flex-col gap-1.5 text-sm">
                {struk.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{it.qty}× {it.menu_name}</span>
                    <span className="angka shrink-0">{rupiah(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-bold mt-3 pt-2" style={{ borderTop: "1px dashed var(--color-line)" }}>
                <span>Total</span><span className="angka">{rupiah(struk.order.total)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1" style={{ color: "var(--color-ink-2)" }}>
                <span>Bayar ({struk.order.payment_method === "CASH" ? "Tunai" : struk.order.payment_method})</span>
                <span className="angka">{rupiah(struk.order.cash_received ?? struk.order.total)}</span>
              </div>
              {struk.order.payment_method === "CASH" && (
                <div className="flex justify-between font-semibold text-sm mt-1">
                  <span>Kembalian</span><span className="angka">{rupiah(struk.kembalian)}</span>
                </div>
              )}
            </div>
            <button className="btn btn-utama w-full" onClick={() => setStruk(null)}>Transaksi berikutnya</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
