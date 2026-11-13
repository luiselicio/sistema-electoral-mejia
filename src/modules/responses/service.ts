import { prisma } from "@/lib/prisma";
import type { Prisma, SubmissionChannel, SubmissionQuality } from "@prisma/client";

export type AnswerInput = {
  questionId: string;
  value: Prisma.InputJsonValue;
};

export type CreateSubmissionResult =
  | { ok: true; submissionId: string }
  | { ok: false; code: "INVALID_PARTICIPATION" | "ALREADY_USED" | "INVALID_SURVEY_VERSION" | "FORBIDDEN" | "ERROR"; message: string };

/**
 * Registra SurveySubmission y Answers de forma desacoplada:
 * - Solo usa participationId interno (sin cédula ni PII directa).
 * - Verifica que la participación esté activa, no usada y corresponda a la encuesta de la versión.
 * - Marca la participación como USED dentro de la misma transacción.
 */
export async function createSubmission(params: {
  participationId: string;
  surveyVersionId: string;
  channel: SubmissionChannel;
  answers: AnswerInput[];
  sectorId?: string | null;
  enumeratorId?: string | null;
  quality?: SubmissionQuality;
  qualityNotes?: string | null;
  startedAt?: Date | null;
}): Promise<CreateSubmissionResult> {
  const {
    participationId,
    surveyVersionId,
    channel,
    answers,
    sectorId,
    enumeratorId,
    quality,
    qualityNotes,
    startedAt,
  } = params;

  if (!answers || !Array.isArray(answers)) {
    return { ok: false, code: "ERROR", message: "Respuestas inválidas." };
  }

  try {
    const submission = await prisma.$transaction(async (tx) => {
      const participation = await tx.participation.findUnique({
        where: { id: participationId },
      });
      if (!participation) {
        throw new Error("INVALID_PARTICIPATION");
      }
      if (participation.status !== "ACTIVE" || participation.usedAt) {
        throw new Error("ALREADY_USED");
      }

      const version = await tx.surveyVersion.findUnique({
        where: { id: surveyVersionId },
        select: { id: true, surveyId: true },
      });
      if (!version || version.surveyId !== participation.surveyId) {
        throw new Error("INVALID_SURVEY_VERSION");
      }

      const existingSubmission = await tx.surveySubmission.findUnique({
        where: { participationId },
      });
      if (existingSubmission) {
        throw new Error("ALREADY_USED");
      }

      const created = await tx.surveySubmission.create({
        data: {
          participationId,
          surveyVersionId,
          channel,
          enumeratorId: enumeratorId ?? null,
          sectorId: sectorId ?? null,
          quality: quality ?? "VALID",
          qualityNotes: qualityNotes ?? null,
          startedAt: startedAt ?? null,
          submittedAt: new Date(),
          answers: {
            create: answers.map((a) => ({
              questionId: a.questionId,
              value: a.value as Prisma.InputJsonValue,
            })),
          },
        },
        select: { id: true },
      });

      await tx.participation.update({
        where: { id: participationId },
        data: { status: "USED", usedAt: new Date() },
      });

      return created;
    });

    return { ok: true, submissionId: submission.id };
  } catch (e: any) {
    const msg = e?.message;
    if (msg === "INVALID_PARTICIPATION") {
      return { ok: false, code: "INVALID_PARTICIPATION", message: "Participación no válida." };
    }
    if (msg === "ALREADY_USED") {
      return { ok: false, code: "ALREADY_USED", message: "La participación ya fue utilizada." };
    }
    if (msg === "INVALID_SURVEY_VERSION") {
      return {
        ok: false,
        code: "INVALID_SURVEY_VERSION",
        message: "La versión de encuesta no corresponde a la participación.",
      };
    }
    console.error("createSubmission error", e);
    return { ok: false, code: "ERROR", message: "No se pudo registrar la respuesta." };
  }
}