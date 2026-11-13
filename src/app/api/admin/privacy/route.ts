import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "surveys:manage") || hasPermission(user.role, "users:manage") || hasPermission(user.role, "campaigns:manage"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const items = await prisma.privacyContent.findMany({ orderBy: [{ key: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "surveys:manage") || hasPermission(user.role, "campaigns:manage") || hasPermission(user.role, "users:manage"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { key, version, title, body: content, active } = body;
    if (!key || !version || !content) {
      return NextResponse.json({ ok: false, message: "key, version y body son requeridos." }, { status: 400 });
    }
    if (active) {
      await prisma.privacyContent.updateMany({ where: { key }, data: { active: false } });
    }
    const item = await prisma.privacyContent.create({
      data: {
        key,
        version,
        title: title || null,
        body: content,
        active: !!active,
        effectiveAt: active ? new Date() : null,
      },
    });
    await logAudit({ actorId: user.id, action: "privacy.version.create", entityType: "PrivacyContent", entityId: item.id, metadata: { key, version, active: !!active } });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "No se pudo guardar (¿versión duplicada?)." }, { status: 400 });
  }
}