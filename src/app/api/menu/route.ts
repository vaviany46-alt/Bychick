import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { menuSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;
  const menus = db.prepare("SELECT * FROM menus ORDER BY category, name").all();
  return NextResponse.json({ menus });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = menuSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { name, category, price, is_available } = parsed.data;

  const info = db
    .prepare("INSERT INTO menus (name, category, price, is_available) VALUES (?,?,?,?)")
    .run(name, category, price, is_available ? 1 : 0);

  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "MENU_TAMBAH", detail: `${name} (${category}, Rp${price})`, req });
  const menu = db.prepare("SELECT * FROM menus WHERE id = ?").get(info.lastInsertRowid);
  return NextResponse.json({ menu }, { status: 201 });
}
