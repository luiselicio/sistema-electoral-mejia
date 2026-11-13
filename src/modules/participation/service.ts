import { prisma } from "@/lib/prisma";
import {
  deriveProtectedIdentity,
  isValidEcuadorianCedula,
  normalizeCedula,
  LOCAL_VALIDATION_NOTICE,
} from "./identity";

export type StartParticipationResult =
  | {
      ok: true;
      participationId: string;
      surveyId: string;
      notice: string;
    }
  | {
      ok: false;
      code: "INVALID_CEDULA" | "SURVEY_NOT_FOUND" | "DUPLICATE" | "ERROR";
      message: string;
      notice?: string;
    };

/**
 * Inicia participación confidencial/seudonimizada:
 * 1) Valida cédula localmente (10 dígitos + verificador).
 * 2) Deriva hash protegido (HMAC-SHA256).
 * 3) Verifica duplicado por encuesta (A1).
 * 4) Emite participation_id interno opaco.
 * No almacena la cédula en texto plano.
 */
export async function startParticipation(params: {
  surveyId: string;
  cedula: string;
}): Promise<StartParticipationResult> {
  const { surveyId, cedula } = params;
  const normalized = normalizeCedula(cedula);

  if (!isValidEcuadorianCedula(normalized)) {
    return {
      ok: false,
      code: "INVALID_CEDULA",
      message:
        "Cédula inválida. Verifique los 10 dígitos y el dígito verificador.",
      notice: LOCAL_VALIDATION_NOTICE,
    };
  }

  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) {
    return { ok: false, code: "SURVEY_NOT_FOUND", message: "Encuesta no encontrada." };
  }

  const identityHash = deriveProtectedIdentity(normalized);

  try {
    const participation = await prisma.$transaction(async (tx) => {
      const existing = await tx.participantIdentity.findUnique({
        where: { surveyId_identityHash: { surveyId, identityHash } },
        include: {
          participation: {
            include: { submission: { select: { id: true } } },
          },
        },
      });

      if (existing) {
        const part = existing.participation;
        const hasCompletedSubmission = !!part?.submission || part?.status === "USED";
        if (hasCompletedSubmission) {
          throw new Error("DUPLICATE_COMPLETED");
        }
        // Participación previa iniciada pero inconclusa/abandonada (sin envío final):
        // permitir retomar/reintentar con la misma participación.
        if (part && part.status === "ACTIVE") {
          return part;
        }
        // Estado no retomable (p.ej. revocada) sin envío: bloquear de forma conservadora.
        if (part) {
          throw new Error("DUPLICATE_COMPLETED");
        }
        // Inconsistencia: identidad sin participación; crear participación retomable.
        const recovered = await tx.participation.create({
          data: {
            surveyId,
            participantIdentityId: existing.id,
            status: "ACTIVE",
          },
        });
        return recovered;
      }

      const identity = await tx.participantIdentity.create({
        data: {
          surveyId,
          identityHash,
          localFormatValid: true,
        },
      });

      const part = await tx.participation.create({
        data: {
          surveyId,
          participantIdentityId: identity.id,
          status: "ACTIVE",
        },
      });

      return part;
    });

    return {
      ok: true,
      participationId: participation.id,
      surveyId: participation.surveyId,
      notice: LOCAL_VALIDATION_NOTICE,
    };
  } catch (e: any) {
    if (e?.message === "DUPLICATE_COMPLETED" || e?.code === "P2002") {
      return {
        ok: false,
        code: "DUPLICATE",
        message: "Ya existe una participación registrada para esta encuesta.",
        notice: LOCAL_VALIDATION_NOTICE,
      };
    }
    console.error("startParticipation error", e);
    return { ok: false, code: "ERROR", message: "No se pudo iniciar la participación." };
  }
}