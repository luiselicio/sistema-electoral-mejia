import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "audit:view")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    console.error("admin audit error", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}