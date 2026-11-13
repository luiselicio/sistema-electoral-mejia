import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "surveys:manage") || hasPermission(user.role, "analytics:view"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const [surveys, campaigns] = await Promise.all([
      prisma.survey.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          campaign: { select: { id: true, name: true } },
          versions: {
            orderBy: { version: "desc" },
            include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
          },
        },
      }),
      prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return NextResponse.json({ ok: true, surveys, campaigns });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "surveys:manage")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "createSurvey") {
      const { campaignId, title, description } = body;
      if (!campaignId || !title) return NextResponse.json({ ok: false, message: "campaignId y title requeridos." }, { status: 400 });
      const survey = await prisma.survey.create({
        data: {
          campaignId, title, description: description || null, status: "DRAFT", channel: "BOTH",
          versions: { create: { version: 1, isPublished: false } },
        },
        include: { versions: true },
      });
      await logAudit({ actorId: user.id, action: "survey.create", entityType: "Survey", entityId: survey.id });
      return NextResponse.json({ ok: true, survey }, { status: 201 });
    }

    if (action === "addQuestion") {
      const { surveyVersionId, text, type, required, options } = body;
      if (!surveyVersionId || !text || !type) return NextResponse.json({ ok: false, message: "Datos incompletos." }, { status: 400 });
      const count = await prisma.question.count({ where: { surveyVersionId } });
      const q = await prisma.question.create({
        data: {
          surveyVersionId,
          text,
          type,
          required: !!required,
          order: count + 1,
          options: Array.isArray(options) && options.length ? {
            create: options.map((o: any, idx: number) => ({ label: o.label, value: o.value || `opt_${idx + 1}`, order: idx + 1, isSpecial: !!o.isSpecial })),
          } : undefined,
        },
        include: { options: true },
      });
      await logAudit({ actorId: user.id, action: "survey.question.add", entityType: "Question", entityId: q.id, metadata: { surveyVersionId } });
      return NextResponse.json({ ok: true, question: q }, { status: 201 });
    }

    if (action === "publish") {
      const { surveyId, surveyVersionId } = body;
      if (!surveyId || !surveyVersionId) return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.surveyVersion.updateMany({ where: { surveyId }, data: { isPublished: false } });
        await tx.surveyVersion.update({ where: { id: surveyVersionId }, data: { isPublished: true, publishedAt: new Date() } });
        await tx.survey.update({ where: { id: surveyId }, data: { status: "PUBLISHED" } });
      });
      await logAudit({ actorId: user.id, action: "survey.publish", entityType: "Survey", entityId: surveyId, metadata: { surveyVersionId } });
      return NextResponse.json({ ok: true });
    }

    if (action === "close") {
      const { surveyId } = body;
      await prisma.survey.update({ where: { id: surveyId }, data: { status: "CLOSED" } });
      await logAudit({ actorId: user.id, action: "survey.close", entityType: "Survey", entityId: surveyId });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Acción inválida." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}