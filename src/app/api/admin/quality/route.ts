import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import type { SubmissionQuality } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.role, "campaigns:manage") || hasPermission(user.role, "users:manage") || hasPermission(user.role, "analytics:view"))) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const submissions = await prisma.surveySubmission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 200,
      select: {
        id: true,
        channel: true,
        quality: true,
        qualityNotes: true,
        submittedAt: true,
        surveyVersion: { select: { version: true, survey: { select: { title: true } } } },
        enumerator: { select: { id: true, name: true, email: true } },
        sector: { select: { name: true, parish: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ ok: true, submissions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(user.role === "SUPERADMIN" || user.role === "CAMPAIGN_ADMIN")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { submissionId, quality, reason } = body as { submissionId: string; quality: SubmissionQuality; reason: string };
    if (!submissionId || !quality || !reason || !String(reason).trim()) {
      return NextResponse.json({ ok: false, message: "submissionId, quality y motivo son requeridos." }, { status: 400 });
    }
    if (!["VALID", "OBSERVED", "REJECTED"].includes(quality)) {
      return NextResponse.json({ ok: false, message: "Calidad inválida." }, { status: 400 });
    }
    const prev = await prisma.surveySubmission.findUnique({ where: { id: submissionId }, select: { quality: true, qualityNotes: true } });
    if (!prev) return NextResponse.json({ ok: false, message: "Envío no encontrado." }, { status: 404 });

    const updated = await prisma.surveySubmission.update({
      where: { id: submissionId },
      data: { quality, qualityNotes: String(reason).trim() },
      select: { id: true, quality: true, qualityNotes: true },
    });

    await logAudit({
      actorId: user.id,
      action: "submission.quality.update",
      entityType: "SurveySubmission",
      entityId: submissionId,
      metadata: { from: prev.quality, to: quality, reason: String(reason).trim() },
    });

    return NextResponse.json({ ok: true, submission: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}