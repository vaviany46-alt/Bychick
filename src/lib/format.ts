export function rupiah(n: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

export function tanggal(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function jam(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function tanggalJam(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Menunggu",
  CALLED: "Dipanggil",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  DEBIT: "Debit",
};

export const CATEGORY_LABEL: Record<string, string> = {
  GEPREK: "Geprek",
  BURGER: "Burger",
  MINUMAN: "Minuman",
  SNAK: "Snak",
};
