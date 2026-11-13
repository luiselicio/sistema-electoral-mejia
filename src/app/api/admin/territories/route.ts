import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "territories:manage") && !hasPermission(user.role, "campaigns:manage") && !hasPermission(user.role, "analytics:view")) {
    // lectura también útil para admin/analistas en contexto; gestión estricta en mutaciones
  }
  try {
    const canton = await prisma.canton.findFirst({ where: { name: "Mejía" }, include: { province: true } });
    if (!canton) return NextResponse.json({ ok: false, message: "Cantón no encontrado." }, { status: 404 });
    const parishes = await prisma.parish.findMany({
      where: { cantonId: canton.id },
      orderBy: { name: "asc" },
      include: { sectors: { orderBy: { name: "asc" } } },
    });
    return NextResponse.json({ ok: true, canton, parishes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "territories:manage") || hasPermission(user.role, "campaigns:manage"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { type } = body;
    if (type === "parish") {
      const canton = await prisma.canton.findFirst({ where: { name: "Mejía" } });
      if (!canton) return NextResponse.json({ ok: false, message: "Cantón no encontrado." }, { status: 404 });
      const parish = await prisma.parish.create({ data: { name: body.name, cantonId: canton.id } });
      await logAudit({ actorId: user.id, action: "territory.parish.create", entityType: "Parish", entityId: parish.id, metadata: { name: parish.name } });
      return NextResponse.json({ ok: true, parish }, { status: 201 });
    }
    if (type === "sector") {
      const sector = await prisma.sector.create({
        data: { name: body.name, parishId: body.parishId, type: body.sectorType || "sector", source: "manual", verified: false },
      });
      await logAudit({ actorId: user.id, action: "territory.sector.create", entityType: "Sector", entityId: sector.id, metadata: { name: sector.name, parishId: body.parishId } });
      return NextResponse.json({ ok: true, sector }, { status: 201 });
    }
    if (type === "importSectors") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (rows.length === 0) return NextResponse.json({ ok: false, message: "Sin filas para importar." }, { status: 400 });
      // rows: { parishName, name, sectorType? }
      const parishes = await prisma.parish.findMany({ where: { canton: { name: "Mejía" } }, select: { id: true, name: true } });
      const byName = new Map(parishes.map((p) => [p.name.toLowerCase().trim(), p.id]));
      let created = 0; const errors: string[] = [];
      for (const r of rows) {
        const pName = String(r.parishName || "").toLowerCase().trim();
        const sName = String(r.name || "").trim();
        const sType = (String(r.sectorType || "sector").trim() || "sector");
        const parishId = byName.get(pName);
        if (!parishId) { errors.push(`Parroquia no encontrada: ${r.parishName}`); continue; }
        if (!sName) { errors.push("Nombre de sector vacío"); continue; }
        try {
          await prisma.sector.create({ data: { name: sName, parishId, type: sType, source: "import_csv", verified: false } });
          created++;
        } catch { errors.push(`No se pudo crear: ${sName}`); }
      }
      await logAudit({ actorId: user.id, action: "territory.sector.import", entityType: "Sector", metadata: { created, errors: errors.length } });
      return NextResponse.json({ ok: true, created, errors });
    }
    return NextResponse.json({ ok: false, message: "Tipo inválido." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "territories:manage") || hasPermission(user.role, "campaigns:manage"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!id || !type) return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
    if (type === "sector") {
      await prisma.sector.delete({ where: { id } });
      await logAudit({ actorId: user.id, action: "territory.sector.delete", entityType: "Sector", entityId: id });
      return NextResponse.json({ ok: true });
    }
    if (type === "parish") {
      await prisma.parish.delete({ where: { id } });
      await logAudit({ actorId: user.id, action: "territory.parish.delete", entityType: "Parish", entityId: id });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, message: "Tipo inválido." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "No se pudo eliminar (verifique dependencias)." }, { status: 400 });
  }
}