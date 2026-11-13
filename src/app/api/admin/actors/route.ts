import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "figures:manage") || hasPermission(user.role, "analytics:view") || hasPermission(user.role, "surveys:manage"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const [organizations, figures, cantons] = await Promise.all([
      prisma.politicalOrganization.findMany({ orderBy: { name: "asc" } }),
      prisma.politicalFigure.findMany({ orderBy: { name: "asc" }, include: { organization: true, canton: true } }),
      prisma.canton.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return NextResponse.json({ ok: true, organizations, figures, cantons });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "figures:manage")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { type } = body;
    if (type === "organization") {
      const org = await prisma.politicalOrganization.create({
        data: { name: body.name, shortName: body.shortName || null, description: body.description || null, active: body.active !== false },
      });
      await logAudit({ actorId: user.id, action: "actor.organization.create", entityType: "PoliticalOrganization", entityId: org.id });
      return NextResponse.json({ ok: true, organization: org }, { status: 201 });
    }
    if (type === "figure") {
      const fig = await prisma.politicalFigure.create({
        data: {
          name: body.name,
          photoUrl: body.photoUrl || null,
          organizationId: body.organizationId || null,
          cantonId: body.cantonId || null,
          condition: body.condition || "FIGURE",
          verifiedSource: body.verifiedSource || null,
          description: body.description || null,
          active: body.active !== false,
        },
      });
      await logAudit({ actorId: user.id, action: "actor.figure.create", entityType: "PoliticalFigure", entityId: fig.id });
      return NextResponse.json({ ok: true, figure: fig }, { status: 201 });
    }
    return NextResponse.json({ ok: false, message: "Tipo inválido." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "figures:manage")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { type, id } = body;
    if (!type || !id) return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });

    if (type === "organization") {
      const prev = await prisma.politicalOrganization.findUnique({ where: { id } });
      if (!prev) return NextResponse.json({ ok: false, message: "Organización no encontrada." }, { status: 404 });
      const org = await prisma.politicalOrganization.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.shortName !== undefined ? { shortName: body.shortName || null } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.active !== undefined ? { active: !!body.active } : {}),
        },
      });
      await logAudit({ actorId: user.id, action: "actor.organization.update", entityType: "PoliticalOrganization", entityId: id, metadata: { name: org.name } });
      return NextResponse.json({ ok: true, organization: org });
    }

    if (type === "figure") {
      const prev = await prisma.politicalFigure.findUnique({ where: { id } });
      if (!prev) return NextResponse.json({ ok: false, message: "Figura no encontrada." }, { status: 404 });
      const fig = await prisma.politicalFigure.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl || null } : {}),
          ...(body.organizationId !== undefined ? { organizationId: body.organizationId || null } : {}),
          ...(body.cantonId !== undefined ? { cantonId: body.cantonId || null } : {}),
          ...(body.condition !== undefined ? { condition: body.condition } : {}),
          ...(body.verifiedSource !== undefined ? { verifiedSource: body.verifiedSource || null } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.active !== undefined ? { active: !!body.active } : {}),
        },
      });
      await logAudit({ actorId: user.id, action: "actor.figure.update", entityType: "PoliticalFigure", entityId: id, metadata: { name: fig.name, photoChanged: prev.photoUrl !== fig.photoUrl } });
      return NextResponse.json({ ok: true, figure: fig });
    }

    return NextResponse.json({ ok: false, message: "Tipo inválido." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "figures:manage")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!id || !type) return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
    if (type === "figure") {
      await prisma.politicalFigure.delete({ where: { id } });
      await logAudit({ actorId: user.id, action: "actor.figure.delete", entityType: "PoliticalFigure", entityId: id });
    } else if (type === "organization") {
      await prisma.politicalOrganization.delete({ where: { id } });
      await logAudit({ actorId: user.id, action: "actor.organization.delete", entityType: "PoliticalOrganization", entityId: id });
    } else {
      return NextResponse.json({ ok: false, message: "Tipo inválido." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "No se pudo eliminar." }, { status: 400 });
  }
}