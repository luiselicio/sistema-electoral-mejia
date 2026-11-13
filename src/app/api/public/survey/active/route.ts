import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const survey = await prisma.survey.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { id: true, name: true, cantonId: true } },
      },
    });

    if (!survey) {
      return NextResponse.json({ ok: false, message: "No hay encuesta activa." }, { status: 404 });
    }

    const version = await prisma.surveyVersion.findFirst({
      where: { surveyId: survey.id, isPublished: true },
      orderBy: { version: "desc" },
      include: {
        sections: { orderBy: { order: "asc" } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
              include: {
                figure: {
                  select: {
                    id: true,
                    name: true,
                    photoUrl: true,
                    organization: { select: { name: true, shortName: true } },
                  },
                },
              },
            },
            logicRules: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ ok: false, message: "La encuesta no tiene una versión publicada." }, { status: 404 });
    }

    const privacy = await prisma.privacyContent.findFirst({
      where: { active: true, key: "survey_notice" },
      orderBy: { createdAt: "desc" },
    });

    let parishes: { id: string; name: string; sectors: { id: string; name: string; type: string | null }[] }[] = [];
    if (survey.campaign.cantonId) {
      const rows = await prisma.parish.findMany({
        where: { cantonId: survey.campaign.cantonId },
        orderBy: { name: "asc" },
        include: { sectors: { orderBy: { name: "asc" }, select: { id: true, name: true, type: true } } },
      });
      parishes = rows.map((p) => ({ id: p.id, name: p.name, sectors: p.sectors }));
    }

    return NextResponse.json({
      ok: true,
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        channel: survey.channel,
        privacyVersion: survey.privacyVersion,
        methodologyNote: survey.methodologyNote,
        campaign: survey.campaign,
      },
      version: {
        id: version.id,
        version: version.version,
        sections: version.sections,
        questions: version.questions,
      },
      privacy: privacy
        ? { title: privacy.title, body: privacy.body, version: privacy.version }
        : null,
      territory: { parishes },
    });
  } catch (e) {
    console.error("active survey error", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}