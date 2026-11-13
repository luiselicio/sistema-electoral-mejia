import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/server/password";
import { createSessionToken, sessionCookieOptions } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { checkRateLimit, getClientIp } from "@/server/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}`, 15, 15 * 60 * 1000); // 15 intentos / 15 min por IP (A1)
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, message: "Demasiados intentos de inicio de sesión. Intente más tarde." },
        { status: 429 },
      );
    }
    const body = await req.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Credenciales requeridas." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user || !user.active || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ ok: false, message: "Credenciales inválidas." }, { status: 401 });
    }

    const token = createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    const opts = sessionCookieOptions();
    res.cookies.set({ ...opts, value: token });
    await logAudit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}