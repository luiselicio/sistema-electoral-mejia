import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { logAudit } from "@/server/audit";
import { buildAggregatedReport } from "@/server/analytics";

function csvEscape(val: any): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "exports:create")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const surveyId = url.searchParams.get("surveyId") || undefined;
    const report = await buildAggregatedReport(surveyId);
    if (!report) {
      return NextResponse.json({ ok: false, message: "No hay datos para exportar." }, { status: 404 });
    }

    const lines: string[] = [];
    const push = (row: any[]) => lines.push(row.map(csvEscape).join(","));

    push(["Reporte agregado - ELECTORAL DATA"]);
    push(["Encuesta", report.survey.title]);
    push(["Versión", report.version.version]);
    push(["Generado", report.generatedAt]);
    push(["Umbral k (supresión)", report.kThreshold]);
    push(["Total envíos (agregado)", report.totalSubmissions.suppressed ? "<10 (suprimido)" : report.totalSubmissions.count]);
    push([]);

    push(["Resultados por parroquia (conteo agregado)"]);
    push(["Parroquia", "Conteo"]);
    for (const p of report.territory.byParish) {
      push([p.parishName, p.suppressed ? "<10 (suprimido)" : p.count]);
    }
    push([]);

    push(["Resultados por sector (conteo agregado)"]);
    push(["Parroquia", "Sector", "Conteo"]);
    for (const s of report.territory.bySector) {
      push([s.parishName, s.sectorName, s.suppressed ? "<10 (suprimido)" : s.count]);
    }
    push([]);

    for (const q of report.questions) {
      push([`Pregunta: ${q.text}`]);
      push(["Tipo", q.type]);
      push(["Opción/Valor", "Conteo"]);
      for (const o of q.overall) {
        push([o.label, o.suppressed ? "<10 (suprimido)" : o.count]);
      }
      if (q.note) push(["Nota", q.note]);
      push([]);
      push(["Desglose por parroquia", "Opción/Valor", "Conteo"]);
      for (const p of q.byParish) {
        if (p.suppressed) {
          push([p.parishName, "TOTAL/DETALLE", "<10 (suprimido)"]);
        } else {
          if (q.type === "text" || (p.values?.length ?? 0) === 0) {
            push([p.parishName, "Respuestas (conteo)", p.total]);
          } else {
            for (const v of p.values || []) {
              push([p.parishName, v.label, v.suppressed ? "<10 (suprimido)" : v.count]);
            }
          }
        }
      }
      push([]);
    }

    const csv = "\uFEFF" + lines.join("\n"); // BOM para Excel
    await logAudit({
      actorId: user.id,
      action: "export.aggregated",
      entityType: "Survey",
      entityId: report.survey.id,
      metadata: { format: "csv", kThreshold: report.kThreshold, surveyVersion: report.version.id },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-agregado-${report.survey.id}.csv"`,
      },
    });
  } catch (e) {
    console.error("export error", e);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}