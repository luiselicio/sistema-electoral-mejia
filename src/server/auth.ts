import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User, UserRole } from "@prisma/client";

const SESSION_COOKIE = "ed_session";

type SessionPayload = {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado");
  return secret;
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64url");
}

function sign(data: string): string {
  return base64url(createHmac("sha256", getAuthSecret()).update(data).digest());
}

export function createSessionToken(user: Pick<User, "id" | "role">, ttlSeconds = 60 * 60 * 8): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: user.id, role: user.role, iat: now, exp: now + ttlSeconds };
  const body = base64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sub || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) return null;
  return user;
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export type AuthUser = User;