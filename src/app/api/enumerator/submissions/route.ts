import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";

/**
 * Vista operativa del encuestador: solo sus registros y estado (sin contenido sensible de respuestas).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "submissions:view_own_status")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  const submissions = await prisma.surveySubmission.findMany({
    where: { enumeratorId: user.id },
    select: {
      id: true,
      channel: true,
      quality: true,
      submittedAt: true,
      createdAt: true,
      surveyVersion: {
        select: {
          id: true,
          version: true,
          survey: { select: { id: true, title: true, campaignId: true } },
        },
      },
      sector: {
        select: {
          id: true,
          name: true,
          parish: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, submissions });
}