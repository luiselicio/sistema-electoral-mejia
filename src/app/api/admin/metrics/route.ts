import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { buildAggregatedReport } from "@/server/analytics";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "analytics:view")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const surveyId = url.searchParams.get("surveyId") || undefined;

    const [submissions, participations, campaigns, surveys, byChannel, byQuality] = await Promise.all([
      prisma.surveySubmission.count(),
      prisma.participation.count(),
      prisma.campaign.count(),
      prisma.survey.count(),
      prisma.surveySubmission.groupBy({ by: ["channel"], _count: { _all: true } }),
      prisma.surveySubmission.groupBy({ by: ["quality"], _count: { _all: true } }),
    ]);

    const recent = await prisma.surveySubmission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        channel: true,
        quality: true,
        submittedAt: true,
        surveyVersion: { select: { survey: { select: { title: true } } } },
      },
    });

    const detailed = await buildAggregatedReport(surveyId);

    return NextResponse.json({
      ok: true,
      metrics: {
        totals: { submissions, participations, campaigns, surveys },
        byChannel: byChannel.map((r) => ({ channel: r.channel, count: r._count._all })),
        byQuality: byQuality.map((r) => ({ quality: r.quality, count: r._count._all })),
        recentSubmissions: recent.map((r) => ({
          id: r.id,
          channel: r.channel,
          quality: r.quality,
          submittedAt: r.submittedAt,
          surveyTitle: r.surveyVersion.survey.title,
        })),
        detailed,
      },
    });
  } catch (e) {
    console.error("admin metrics error", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}