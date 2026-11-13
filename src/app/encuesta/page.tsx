"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isValidEcuadorianCedula, normalizeCedula, LOCAL_VALIDATION_NOTICE } from "@/lib/cedula";

type Option = { id: string; label: string; value: string; order: number; isSpecial: boolean; figureId?: string | null; figure?: { id: string; name: string; photoUrl?: string | null } | null };
type LogicRule = { id: string; sourceQuestionId: string; operator: string; value: any; action: string; targetType?: string | null; targetId?: string | null };
type Question = { id: string; text: string; type: string; required: boolean; order: number; options: Option[]; logicRules: LogicRule[]; sectionId?: string | null };
type SurveyData = {
  ok: boolean;
  survey?: { id: string; title: string; description?: string | null; campaign?: { name: string } };
  version?: { id: string; version: number; sections: any[]; questions: Question[] };
  privacy?: { title?: string | null; body: string; version: string } | null;
  territory?: { parishes: { id: string; name: string; sectors: { id: string; name: string; type: string | null }[] }[] };
  message?: string;
};

function evaluateCondition(rule: LogicRule, answers: Record<string, any>): boolean {
  const source = answers[rule.sourceQuestionId];
  const val = rule.value;
  switch (rule.operator) {
    case "equals":
      return source === val || (Array.isArray(val) ? val.includes(source) : false);
    case "not_equals":
      return source !== val;
    case "in":
      return Array.isArray(val) ? val.includes(source) : false;
    case "not_in":
      return Array.isArray(val) ? !val.includes(source) : true;
    case "present":
      return source !== undefined && source !== null && source !== "" && !(Array.isArray(source) && source.length === 0);
    case "empty":
      return source === undefined || source === null || source === "" || (Array.isArray(source) && source.length === 0);
    default:
      return false;
  }
}

export default function EncuestaPage() {
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"cedula" | "form" | "done">("cedula");
  const [cedula, setCedula] = useState("");
  const [cedulaError, setCedulaError] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sectorId, setSectorId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/survey/active", { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } catch {
        setData({ ok: false, message: "No se pudo cargar la encuesta." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const parishQuestion = useMemo(() => {
    const qs = data?.version?.questions ?? [];
    return qs.find((q) => /parroquia/i.test(q.text) && q.type === "single_choice") || null;
  }, [data]);
  const sectorQuestion = useMemo(() => {
    const qs = data?.version?.questions ?? [];
    return qs.find((q) => (q as any).config?.dynamic === "sector_by_parish" || /barrio|sector específico/i.test(q.text)) || null;
  }, [data]);

  const selectedParishId = parishQuestion ? (answers[parishQuestion.id] as string | undefined) : undefined;
  const availableSectors = useMemo(() => {
    if (!selectedParishId) return [];
    const p = data?.territory?.parishes?.find((x) => x.id === selectedParishId);
    return p?.sectors ?? [];
  }, [data, selectedParishId]);

  useEffect(() => {
    setSectorId("");
    if (sectorQuestion) setAnswers((prev) => ({ ...prev, [sectorQuestion.id]: "" }));
  }, [selectedParishId, sectorQuestion?.id]);

  const visibility = useMemo(() => {
    const qs = data?.version?.questions ?? [];
    const map: Record<string, boolean> = {};
    qs.forEach((q) => (map[q.id] = true));
    qs.forEach((q) => {
      (q.logicRules || []).forEach((rule) => {
        const match = evaluateCondition(rule, answers);
        if (!rule.targetId) return;
        if (rule.action === "show") map[rule.targetId] = match;
        if (rule.action === "hide") map[rule.targetId] = !match;
        // jump/require pueden extenderse; base A3
      });
    });
    return map;
  }, [data, answers]);

  async function startParticipation(e: React.FormEvent) {
    e.preventDefault();
    setCedulaError(null);
    if (!data?.survey?.id) return;
    const norm = normalizeCedula(cedula);
    if (!isValidEcuadorianCedula(norm)) {
      setCedulaError("Cédula inválida. Verifique los 10 dígitos y el dígito verificador.");
      return;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/public/participation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: data.survey.id, cedula: norm }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setCedulaError(json.message || "No se pudo iniciar la participación.");
        return;
      }
      setParticipationId(json.participationId);
      setStep("form");
    } catch {
      setCedulaError("Error de conexión.");
    } finally {
      setStarting(false);
    }
  }

  function setAnswer(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!data?.version || !participationId) return;

    const qs = data.version.questions || [];
    for (const q of qs) {
      if (visibility[q.id] === false) continue;
      if (q.required) {
        const v = answers[q.id];
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) {
          setSubmitError(`Por favor complete la pregunta obligatoria: "${q.text}"`);
          return;
        }
      }
    }
    if (sectorQuestion && selectedParishId && availableSectors.length > 0 && !sectorId) {
      setSubmitError("Seleccione el barrio o sector correspondiente a la parroquia.");
      return;
    }

    const payloadAnswers = qs
      .filter((q) => visibility[q.id] !== false)
      .map((q) => ({ questionId: q.id, value: answers[q.id] ?? null }))
      .filter((a) => a.value !== null && a.value !== "");

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participationId,
          surveyVersionId: data.version.id,
          channel: "PUBLIC",
          answers: payloadAnswers,
          sectorId: sectorId || null,
          startedAt,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSubmitError(json.message || "No se pudo enviar la encuesta.");
        return;
      }
      setStep("done");
    } catch {
      setSubmitError("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl p-6">Cargando encuesta...</main>;
  }
  if (!data?.ok || !data.survey || !data.version) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Encuesta no disponible</h1>
          <p className="mt-2 text-slate-600">{data?.message || "Intente más tarde."}</p>
          <Link href="/" className="mt-4 inline-block text-blue-700 hover:underline">Volver</Link>
        </div>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <h1 className="text-2xl font-bold text-green-900">Respuesta registrada</h1>
          <p className="mt-2 text-green-800">Gracias por participar. Su respuesta fue registrada de forma confidencial.</p>
          <Link href="/" className="mt-4 inline-block text-blue-700 hover:underline">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-700 hover:underline">← Inicio</Link>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold">{data.survey.title}</h1>
        {data.survey.description && <p className="mt-1 text-slate-600">{data.survey.description}</p>}

        {step === "cedula" && (
          <form onSubmit={startParticipation} className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">{data.privacy?.title || "Aviso de privacidad"}</div>
              <p className="mt-1 whitespace-pre-wrap">{data.privacy?.body || "Sus respuestas se tratarán bajo un modelo confidencial o seudonimizado."}</p>
              <p className="mt-2 text-xs text-slate-600">{LOCAL_VALIDATION_NOTICE}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Número de cédula ecuatoriana</label>
              <input
                inputMode="numeric"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ingrese 10 dígitos"
                maxLength={10}
                required
              />
              <p className="mt-1 text-xs text-slate-500">La cédula se usa para validar participación y evitar duplicados; no se almacena en texto plano junto a sus respuestas.</p>
            </div>
            {cedulaError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{cedulaError}</div>}
            <button type="submit" disabled={starting} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {starting ? "Validando..." : "Continuar"}
            </button>
          </form>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="mt-6 space-y-6">
            {data.version.questions.map((q) => {
              if (visibility[q.id] === false) return null;
              const isParishQ = parishQuestion?.id === q.id;
              const isSectorQ = sectorQuestion?.id === q.id;
              const maxSel = (q as any).config?.maxSelections;
              return (
                <div key={q.id} className="space-y-2">
                  <label className="block font-medium text-slate-900">
                    {q.text} {q.required && <span className="text-red-600">*</span>}
                  </label>
                  {isSectorQ && q.type === "single_choice" && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                      {!selectedParishId ? (
                        <p className="text-sm text-slate-600">Seleccione primero la parroquia (Pregunta 1).</p>
                      ) : availableSectors.length === 0 ? (
                        <p className="text-sm text-slate-600">No hay sectores registrados para la parroquia seleccionada.</p>
                      ) : (
                        <select
                          value={sectorId}
                          onChange={(e) => { setSectorId(e.target.value); setAnswer(q.id, e.target.value); }}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                        >
                          <option value="">Seleccione un barrio o sector</option>
                          {availableSectors.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                      <p className="mt-1 text-xs text-slate-600">Lógica condicional (A3): opciones mostradas según la parroquia.</p>
                    </div>
                  )}
                  {!isSectorQ && q.type === "single_choice" && (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                          <input type="radio" name={q.id} value={opt.value} checked={answers[q.id] === opt.value} onChange={() => setAnswer(q.id, opt.value)} className="h-4 w-4 shrink-0" />
                          {opt.figure?.photoUrl ? (
                            <img src={opt.figure.photoUrl} alt={opt.figure.name || opt.label} className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : opt.figureId ? (
                            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">Sin foto</div>
                          ) : null}
                          <span className="text-slate-900">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      {maxSel && <p className="text-xs text-slate-500">Seleccione hasta {maxSel} opciones.</p>}
                      {q.options.map((opt) => {
                        const arr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                        const checked = arr.includes(opt.value);
                        return (
                          <label key={opt.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                            <input type="checkbox" checked={checked} onChange={(e) => {
                              let next = e.target.checked ? [...arr, opt.value] : arr.filter((v) => v !== opt.value);
                              if (e.target.checked && maxSel && next.length > maxSel) return;
                              setAnswer(q.id, next);
                            }} className="h-4 w-4" />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "text" && (
                    <textarea value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" rows={3} />
                  )}
                  {q.type === "scale" && (
                    <input type="number" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  )}
                </div>
              );
            })}

            {submitError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {submitting ? "Enviando..." : "Enviar respuestas"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}