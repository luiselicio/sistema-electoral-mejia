import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata,
      },
    });
  } catch (e) {
    // La auditoría no debe romper el flujo principal; registrar en consola.
    console.error("Audit log error", e);
  }
}