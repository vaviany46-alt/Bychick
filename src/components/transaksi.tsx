"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, Kosong, Modal } from "@/components/ui";
import { rupiah, tanggal, jam, PAYMENT_LABEL } from "@/lib/format";

type Order = {
  id: number; queue_number: string; kasir_name: string; customer_name: string | null;
  payment_method: string; cash_received: number | null; total: number; status: string;
  created_at: string; called_at: string | null; done_at: string | null; jumlah_item: number;
};
type Detail = { order: Order; items: Array<{ menu_name: string; qty: number; price: number; subtotal: number }> };

const FILTER = [
  ["", "Semua"],
  ["QUEUED", "Menunggu"],
  ["CALLED", "Dipanggil"],
  ["DONE", "Selesai"],
  ["CANCELLED", "Batal"],
] as const;

export default function TransaksiClient() {
  const [tgl, setTgl] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [muat, setMuat] = useState(true);

  const muatUlang = useCallback(async () => {
    const sp = new URLSearchParams({ tanggal: tgl });
    if (status) sp.set("status", status);
    const r = await fetch(`/api/orders?${sp}`);
    const d = await r.json().catch(() => ({}));
    setOrders(d.orders ?? []);
    setMuat(false);
  }, [tanggal, status]);

  useEffect(() => { muatUlang(); }, [muatUlang]);
  // Segarkan tiap 15 detik supaya panel antrian tetap hidup.
  useEffect(() => {
    const t = setInterval(muatUlang, 15_000);
    return () => clearInterval(t);
  }, [muatUlang]);

  async function ubahStatus(o: Order, s: "CALLED" | "DONE" | "CANCELLED") {
    await fetch(`/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    muatUlang();
  }

  async function bukaDetail(id: number) {
    // Detail item diambil dari list transaksi (endpoint orders tidak menyertakan item per order).
    const r = await fetch(`/api/orders/detail?id=${id}`);
    if (r.ok) setDetail(await r.json());
  }

  const menunggu = orders.filter((o) => o.status === "QUEUED").length;

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="micro">Kasir</p>
          <h1 className="judul text-3xl mt-1">Transaksi &amp; antrian</h1>
        </div>
        <div className="chip chip-antri text-sm">
          <span className="dot" />{menunggu} pesanan menunggu dipanggil
        </div>
      </header>

      <div className="kartu p-4 mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="micro block mb-1" htmlFor="f-tgl">Tanggal</label>
          <input id="f-tgl" type="date" className="input angka" value={tgl} onChange={(e) => setTgl(e.target.value)} />
        </div>
        <div>
          <label className="micro block mb-1" htmlFor="f-status">Status</label>
          <select id="f-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button onClick={muatUlang} className="btn btn-garis mt-auto">Segarkan</button>
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel w-full">
          <thead>
            <tr>
              <th>Antrian</th><th>Waktu</th><th>Item</th><th>Kasir</th><th>Bayar</th><th className="text-right">Total</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {muat ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: "var(--color-ink-2)" }}>Memuat…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8}><Kosong pesan="Tidak ada transaksi pada tanggal ini." /></td></tr>
            ) : orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <button onClick={() => bukaDetail(o.id)} className="angka font-bold text-base hover:underline" style={{ color: "var(--color-ember-2)" }}>
                    {o.queue_number}
                  </button>
                  {o.customer_name && <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>{o.customer_name}</p>}
                </td>
                <td className="angka">{jam(o.created_at)}</td>
                <td>{o.jumlah_item}</td>
                <td className="truncate max-w-32">{o.kasir_name}</td>
                <td>{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</td>
                <td className="angka text-right font-semibold">{rupiah(o.total)}</td>
                <td><Chip status={o.status} /></td>
                <td>
                  <div className="flex gap-1.5">
                    {o.status === "QUEUED" && (
                      <button onClick={() => ubahStatus(o, "CALLED")} className="btn btn-utama !px-3 !py-1.5 !text-xs">Panggil</button>
                    )}
                    {(o.status === "QUEUED" || o.status === "CALLED") && (
                      <button onClick={() => ubahStatus(o, "DONE")} className="btn btn-garis !px-3 !py-1.5 !text-xs">Selesai</button>
                    )}
                    {(o.status === "QUEUED" || o.status === "CALLED") && (
                      <button onClick={() => ubahStatus(o, "CANCELLED")} className="btn btn-bahaya !px-3 !py-1.5 !text-xs">Batal</button>
                    )}
                    {(o.status === "DONE" || o.status === "CANCELLED") && (
                      <button onClick={() => bukaDetail(o.id)} className="btn btn-garis !px-3 !py-1.5 !text-xs">Detail</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal detail struk */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Struk ${detail.order.queue_number}` : ""} lebar="24rem">
        {detail && (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-ink-2)" }}>
              {tanggal(detail.order.created_at)} · {jam(detail.order.created_at)} · Kasir {detail.order.kasir_name}
              {detail.order.customer_name && <> · Pelanggan {detail.order.customer_name}</>}
            </p>
            <ul className="flex flex-col gap-1.5 text-sm pb-3" style={{ borderBottom: "2px dashed var(--color-line)" }}>
              {detail.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{it.qty}× {it.menu_name}</span>
                  <span className="angka shrink-0">{rupiah(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-bold mt-3">
              <span>Total ({PAYMENT_LABEL[detail.order.payment_method]})</span>
              <span className="angka">{rupiah(detail.order.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
