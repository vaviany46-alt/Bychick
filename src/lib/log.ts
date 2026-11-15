import type { NextRequest } from "next/server";
import db from "@/lib/db";

export type RequestLike = { headers: Headers } | NextRequest;

export type LogInput = {
  userId?: number | null;
  username?: string | null;
  action: string;
  detail?: string | null;
  req?: RequestLike;
};

/** Catat aktivitas ke tabel activity_logs (audit trail). */
export function logAktivitas({ userId = null, username = null, action, detail = null, req }: LogInput) {
  try {
    const ip =
      req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers?.get("x-real-ip") ||
      "local";
    db.prepare("INSERT INTO activity_logs (user_id, username, action, detail, ip) VALUES (?,?,?,?,?)")
      .run(userId, username, action, detail, ip);
  } catch {
    // Logging tidak boleh menggagalkan request utama.
  }
}
