import { z } from "zod";

/**
 * Skema validasi + sanitasi input.
 * Semua string dipangkas & dibersihkan dari karakter kontrol; output HTML
 * di-escape di sisi render sehingga XSS lewat input ini tidak dieksekusi.
 */
const cleanString = (min: number, max: number) =>
  z
    .string()
    .transform((s) =>
      s
        // buang karakter kontrol & bracket HTML agar tidak ada markup tersimpan
        .replace(/[\u0000-\u001f\u007f<>]/g, "")
        .trim()
    )
    .refine((s) => s.length >= min && s.length <= max, {
      message: `Panjang harus ${min}-${max} karakter`,
    });

export const usernameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya huruf, angka, titik, underscore")
  .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").trim())
  .refine((s) => s.length >= 3 && s.length <= 24, { message: "Username harus 3-24 karakter" });

export const registerSchema = z.object({
  username: usernameSchema,
  name: cleanString(3, 60),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72)
    .regex(/[a-zA-Z]/, "Password harus memuat huruf")
    .regex(/[0-9]/, "Password harus memuat angka"),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(72),
});

export const menuSchema = z.object({
  name: cleanString(2, 60),
  category: z.enum(["GEPREK", "BURGER", "MINUMAN", "SNAK"]),
  price: z.coerce.number().int().min(500, "Harga minimal Rp500").max(10_000_000),
  is_available: z.coerce.boolean().optional().default(true),
});

export const orderSchema = z.object({
  customer_name: cleanString(0, 60).optional().or(z.literal("")),
  payment_method: z.enum(["CASH", "QRIS", "DEBIT"]),
  cash_received: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  discount: z.coerce.number().int().min(0).max(10_000_000).optional().default(0),
  with_tax: z.coerce.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        menu_id: z.coerce.number().int().positive(),
        qty: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, "Keranjang tidak boleh kosong")
    .max(50),
});

export const expenseSchema = z.object({
  keterangan: cleanString(3, 80),
  kategori: z.enum(["BAHAN", "GAJI", "LISTRIK", "SEWA", "LAIN"]),
  jumlah: z.coerce.number().int().min(500, "Jumlah minimal Rp500").max(1_000_000_000),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["CALLED", "DONE", "CANCELLED"]),
});

export const userSchema = z.object({
  username: usernameSchema,
  name: cleanString(3, 60),
  role: z.enum(["ADMIN", "KASIR"]),
  password: z.string().min(8).max(72).regex(/[a-zA-Z]/).regex(/[0-9]/),
});

export const userUpdateSchema = z.object({
  name: cleanString(3, 60).optional(),
  role: z.enum(["ADMIN", "KASIR"]).optional(),
  is_active: z.coerce.boolean().optional(),
  password: z.string().min(8).max(72).regex(/[a-zA-Z]/).regex(/[0-9]/).optional().or(z.literal("")),
});

/** Format pesan error zod menjadi string ringkas. */
export function zodMessage(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ");
}
