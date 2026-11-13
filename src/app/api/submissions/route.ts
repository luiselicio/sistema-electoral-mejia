import { NextResponse } from "next/server";
import { createSubmission } from "@/modules/responses/service";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import type { SubmissionChannel } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      participationId,
      surveyVersionId,
      channel,
      answers,
      sectorId,
      startedAt,
    } = body ?? {};

    if (!participationId || !surveyVersionId || !channel || !Array.isArray(answers)) {
      return NextResponse.json(
        { ok: false, code: "BAD_REQUEST", message: "Datos incompletos." },
        { status: 400 },
      );
    }
    if (channel !== "PUBLIC" && channel !== "ENUMERATOR") {
      return NextResponse.json(
        { ok: false, code: "BAD_REQUEST", message: "Canal inválido." },
        { status: 400 },
      );
    }

    let enumeratorId: string | null = null;
    const user = await getCurrentUser();

    if (channel === "ENUMERATOR") {
      if (!user || !hasPermission(user.role, "submissions:capture")) {
        return NextResponse.json(
          { ok: false, code: "FORBIDDEN", message: "No autorizado para captura por encuestador." },
          { status: 403 },
        );
      }
      enumeratorId = user.id;
    }

    const result = await createSubmission({
      participationId,
      surveyVersionId,
      channel: channel as SubmissionChannel,
      answers,
      sectorId: sectorId ?? null,
      enumeratorId,
      startedAt: startedAt ? new Date(startedAt) : null,
    });

    if (!result.ok) {
      const status =
        result.code === "INVALID_PARTICIPATION" ? 400 :
        result.code === "ALREADY_USED" ? 409 :
        result.code === "INVALID_SURVEY_VERSION" ? 400 :
        result.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json(result, { status });
    }

    await logAudit({
      actorId: user?.id ?? null,
      action: "submission.create",
      entityType: "SurveySubmission",
      entityId: result.submissionId,
      metadata: { channel, surveyVersionId, hasEnumerator: Boolean(enumeratorId) },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("submission create error", e);
    return NextResponse.json(
      { ok: false, code: "ERROR", message: "Error interno." },
      { status: 500 },
    );
  }
}