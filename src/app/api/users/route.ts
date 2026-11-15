import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { requireAuth, assertSameOrigin } from "@/lib/auth";
import { userSchema, zodMessage } from "@/lib/validation";
import { logAktivitas } from "@/lib/log";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, "ADMIN");
  if (error) return error;
  const users = db.prepare(
    "SELECT id, username, name, role, is_active, created_at FROM users ORDER BY id"
  ).all();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req, "ADMIN");
  if (error) return error;
  if (!assertSameOrigin(req)) return NextResponse.json({ error: "Origin tidak sah" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { username, name, role, password } = parsed.data;

  const ada = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (ada) return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const info = db.prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)")
    .run(username, name, hash, role);

  logAktivitas({ userId: Number(session!.sub), username: session!.username, action: "USER_TAMBAH", detail: `${username} (${role})`, req });
  const user = db.prepare("SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?").get(info.lastInsertRowid);
  return NextResponse.json({ user }, { status: 201 });
}
