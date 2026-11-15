import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/** Log aktivitas (audit trail) — hanya ADMIN. */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, "ADMIN");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const batas = Math.min(Number(sp.get("batas")) || 100, 300);
  const logs = db.prepare("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?").all(batas);
  return NextResponse.json({ logs });
}
