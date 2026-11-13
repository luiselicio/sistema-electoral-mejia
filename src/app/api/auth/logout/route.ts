import { NextResponse } from "next/server";
import { getCurrentUser, sessionCookieOptions } from "@/server/auth";
import { logAudit } from "@/server/audit";

export async function POST() {
  const user = await getCurrentUser();
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions();
  res.cookies.set({ ...opts, value: "", maxAge: 0 });
  if (user) {
    await logAudit({ actorId: user.id, action: "auth.logout", entityType: "User", entityId: user.id });
  }
  return res;
}