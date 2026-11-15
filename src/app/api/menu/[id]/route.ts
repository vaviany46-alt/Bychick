import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { menuSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const menuId = Number(id);
  if (!Number.isInteger(menuId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const lama = db.prepare("SELECT * FROM menus WHERE id = ?").get(menuId) as { name: string } | undefined;
  if (!lama) return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = menuSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { name, category, price, is_available } = parsed.data;

  db.prepare("UPDATE menus SET name=?, category=?, price=?, is_available=? WHERE id=?")
    .run(name, category, price, is_available ? 1 : 0, menuId);

  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "MENU_UBAH", detail: `#${menuId} → ${name} (${category}, Rp${price}, ${is_available ? "tersedia" : "habis"})`, req });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const { id } = await ctx.params;
  const menuId = Number(id);
  if (!Number.isInteger(menuId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  // Menu yang sudah terpakai di transaksi tidak dihapus permanen (integritas data),
  // cukup dinonaktifkan agar tidak muncul lagi di kasir.
  const dipakai = db.prepare("SELECT COUNT(*) AS c FROM order_items WHERE menu_id = ?").get(menuId) as { c: number };
  if (dipakai.c > 0) {
    db.prepare("UPDATE menus SET is_available = 0 WHERE id = ?").run(menuId);
    logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "MENU_NONAKTIF", detail: `#${menuId} dipakai di transaksi → dinonaktifkan`, req });
    return NextResponse.json({ ok: true, softDelete: true, message: "Menu pernah terpakai di transaksi, jadi dinonaktifkan (bukan dihapus)." });
  }

  db.prepare("DELETE FROM menus WHERE id = ?").run(menuId);
  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "MENU_HAPUS", detail: `#${menuId}`, req });
  return NextResponse.json({ ok: true });
}
