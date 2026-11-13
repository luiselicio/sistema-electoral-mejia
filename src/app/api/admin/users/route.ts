import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { hashPassword } from "@/server/password";
import { logAudit } from "@/server/audit";
import type { UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = ["SUPERADMIN", "CAMPAIGN_ADMIN", "ANALYST", "ENUMERATOR"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(user.role === "SUPERADMIN" || user.role === "CAMPAIGN_ADMIN")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const [users, campaigns] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, assignments: { include: { campaign: { select: { id: true, name: true, canton: { select: { name: true } } } } } } },
      }),
      prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, canton: { select: { name: true } } } }),
    ]);
    // CAMPAIGN_ADMIN no debe ver/gestionar superadmins en listado sensible? permitimos ver básico
    return NextResponse.json({ ok: true, users, campaigns });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(actor.role === "SUPERADMIN" || actor.role === "CAMPAIGN_ADMIN")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, name, password, role } = body;
      if (!email || !name || !password || !role) return NextResponse.json({ ok: false, message: "Datos incompletos." }, { status: 400 });
      if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ ok: false, message: "Rol inválido." }, { status: 400 });
      if (role === "SUPERADMIN" && actor.role !== "SUPERADMIN") return NextResponse.json({ ok: false, message: "No autorizado para crear SUPERADMIN." }, { status: 403 });
      const created = await prisma.user.create({
        data: { email: String(email).toLowerCase(), name, passwordHash: hashPassword(password), role, active: true },
        select: { id: true, email: true, name: true, role: true, active: true },
      });
      await logAudit({ actorId: actor.id, action: "user.create", entityType: "User", entityId: created.id, metadata: { email: created.email, role: created.role } });
      return NextResponse.json({ ok: true, user: created }, { status: 201 });
    }

    if (action === "update") {
      const { userId, name, role, active } = body;
      if (!userId) return NextResponse.json({ ok: false, message: "userId requerido." }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return NextResponse.json({ ok: false, message: "Usuario no encontrado." }, { status: 404 });
      if (target.role === "SUPERADMIN" && actor.role !== "SUPERADMIN") return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
      if (role === "SUPERADMIN" && actor.role !== "SUPERADMIN") return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name ? { name } : {}),
          ...(role && ALLOWED_ROLES.includes(role) ? { role } : {}),
          ...(typeof active === "boolean" ? { active } : {}),
        },
        select: { id: true, email: true, name: true, role: true, active: true },
      });
      await logAudit({ actorId: actor.id, action: "user.update", entityType: "User", entityId: updated.id, metadata: { role: updated.role, active: updated.active } });
      return NextResponse.json({ ok: true, user: updated });
    }

    if (action === "assign") {
      const { userId, campaignId, assign } = body;
      if (!userId || !campaignId) return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
      if (assign) {
        await prisma.campaignAssignment.upsert({
          where: { userId_campaignId: { userId, campaignId } },
          update: {},
          create: { userId, campaignId },
        });
        await logAudit({ actorId: actor.id, action: "user.assign_campaign", entityType: "CampaignAssignment", entityId: `${userId}:${campaignId}`, metadata: { userId, campaignId } });
      } else {
        await prisma.campaignAssignment.deleteMany({ where: { userId, campaignId } });
        await logAudit({ actorId: actor.id, action: "user.unassign_campaign", entityType: "CampaignAssignment", entityId: `${userId}:${campaignId}`, metadata: { userId, campaignId } });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Acción inválida." }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    if (e?.code === "P2002") return NextResponse.json({ ok: false, message: "Correo ya existe." }, { status: 409 });
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}