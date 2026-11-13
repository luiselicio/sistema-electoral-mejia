import { prisma } from "@/lib/prisma";

const K_THRESHOLD = 10;

type ValueCount = { label: string; value: string; count: number | null; suppressed?: boolean };

function suppressCount(n: number): { count: number | null; suppressed: boolean } {
  if (n < K_THRESHOLD) return { count: null, suppressed: true };
  return { count: n, suppressed: false };
}

function normalizeValue(v: any): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)];
}

export async function buildAggregatedReport(surveyId?: string) {
  // Usar última versión publicada de la encuesta activa/indicada
  const survey = surveyId
    ? await prisma.survey.findUnique({ where: { id: surveyId }, select: { id: true, title: true } })
    : await prisma.survey.findFirst({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } });
  if (!survey) return null;

  const version = await prisma.surveyVersion.findFirst({
    where: { surveyId: survey.id, isPublished: true },
    orderBy: { version: "desc" },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
    },
  });
  if (!version) return null;

  const submissions = await prisma.surveySubmission.findMany({
    where: { surveyVersionId: version.id, quality: "VALID" },
    select: {
      id: true,
      sectorId: true,
      sector: { select: { id: true, name: true, parishId: true, parish: { select: { id: true, name: true } } } },
      answers: { select: { questionId: true, value: true } },
    },
  });

  const totalSubmissions = submissions.length;

  // Breakdown territorios (parroquia/sector) con supresión k<10
  const byParishMap = new Map<string, { parishId: string; parishName: string; count: number }>();
  const bySectorMap = new Map<string, { sectorId: string; sectorName: string; parishName: string; count: number }>();
  for (const s of submissions) {
    if (s.sector?.parish) {
      const p = byParishMap.get(s.sector.parish.id) || { parishId: s.sector.parish.id, parishName: s.sector.parish.name, count: 0 };
      p.count++; byParishMap.set(s.sector.parish.id, p);
    }
    if (s.sector) {
      const sec = bySectorMap.get(s.sector.id) || { sectorId: s.sector.id, sectorName: s.sector.name, parishName: s.sector.parish?.name || "-", count: 0 };
      sec.count++; bySectorMap.set(s.sector.id, sec);
    }
  }

  const byParish = Array.from(byParishMap.values()).map((p) => ({ ...p, ...suppressCount(p.count) })).sort((a,b)=> (a.parishName||"").localeCompare(b.parishName||""));
  const bySector = Array.from(bySectorMap.values()).map((s) => ({ ...s, ...suppressCount(s.count) })).sort((a,b)=> (a.parishName+a.sectorName).localeCompare(b.parishName+b.sectorName));

  const questionReports = version.questions.map((q) => {
    const optionLabel = new Map(q.options.map((o) => [o.value, o.label]));
    // overall
    const overallCounts = new Map<string, number>();
    const byParishCounts = new Map<string, Map<string, number>>(); // parishId -> value -> count
    const bySectorCounts = new Map<string, Map<string, number>>(); // sectorId -> value -> count

    for (const s of submissions) {
      const ans = s.answers.find((a) => a.questionId === q.id);
      if (!ans) continue;
      const values = normalizeValue(ans.value);
      for (const val of values) {
        overallCounts.set(val, (overallCounts.get(val) || 0) + 1);
        if (s.sector?.parishId) {
          const m = byParishCounts.get(s.sector.parishId) || new Map<string, number>();
          m.set(val, (m.get(val) || 0) + 1);
          byParishCounts.set(s.sector.parishId, m);
        }
        if (s.sectorId) {
          const m = bySectorCounts.get(s.sectorId) || new Map<string, number>();
          m.set(val, (m.get(val) || 0) + 1);
          bySectorCounts.set(s.sectorId, m);
        }
      }
    }

    const totalAnswered = Array.from(overallCounts.values()).reduce((a,b)=>a+b,0);
    const overall: ValueCount[] = Array.from(overallCounts.entries()).map(([value, count]) => {
      const sc = suppressCount(count);
      return { label: optionLabel.get(value) || value, value, count: sc.count, suppressed: sc.suppressed };
    }).sort((a,b)=> (b.count ?? -1) - (a.count ?? -1));

    // For text/open questions, do not list raw texts; show only counts/availability (privacy)
    const isOpen = q.type === "text" || q.options.length === 0;

    const parishBreakdown = byParish.map((p) => {
      if (p.suppressed) return { parishId: p.parishId, parishName: p.parishName, suppressed: true, total: null, values: [] as ValueCount[] };
      const m = byParishCounts.get(p.parishId) || new Map<string, number>();
      const values = isOpen ? [] : Array.from(m.entries()).map(([value, count]) => {
        const sc = suppressCount(count);
        return { label: optionLabel.get(value) || value, value, count: sc.count, suppressed: sc.suppressed };
      });
      return { parishId: p.parishId, parishName: p.parishName, suppressed: false, total: p.count, values };
    });

    const sectorBreakdown = bySector.map((s) => {
      if (s.suppressed) return { sectorId: s.sectorId, sectorName: s.sectorName, parishName: s.parishName, suppressed: true, total: null, values: [] as ValueCount[] };
      const m = bySectorCounts.get(s.sectorId) || new Map<string, number>();
      const values = isOpen ? [] : Array.from(m.entries()).map(([value, count]) => {
        const sc = suppressCount(count);
        return { label: optionLabel.get(value) || value, value, count: sc.count, suppressed: sc.suppressed };
      });
      return { sectorId: s.sectorId, sectorName: s.sectorName, parishName: s.parishName, suppressed: false, total: s.count, values };
    });

    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      totalAnswered: suppressCount(totalAnswered),
      overall: isOpen ? [{ label: "Respuestas (texto abierto)", value: "_text", ...suppressCount(totalAnswered) }] : overall,
      byParish: parishBreakdown,
      bySector: sectorBreakdown,
      note: isOpen ? "Detalle de texto no mostrado para proteger privacidad; solo conteo agregado." : undefined,
    };
  });

  return {
    survey: { id: survey.id, title: survey.title },
    version: { id: version.id, version: version.version },
    kThreshold: K_THRESHOLD,
    totalSubmissions: suppressCount(totalSubmissions),
    territory: { byParish, bySector },
    questions: questionReports,
    generatedAt: new Date().toISOString(),
  };
}