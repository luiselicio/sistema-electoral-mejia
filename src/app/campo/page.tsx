"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isValidEcuadorianCedula, normalizeCedula, LOCAL_VALIDATION_NOTICE } from "@/lib/cedula";

type Option = { id: string; label: string; value: string; order: number };
type LogicRule = { id: string; sourceQuestionId: string; operator: string; value: any; action: string; targetId?: string | null };
type Question = { id: string; text: string; type: string; required: boolean; order: number; options: Option[]; logicRules: LogicRule[] };
type SurveyData = any;

function evaluateCondition(rule: LogicRule, answers: Record<string, any>): boolean {
  const source = answers[rule.sourceQuestionId];
  const val = rule.value;
  switch (rule.operator) {
    case "equals": return source === val || (Array.isArray(val) ? val.includes(source) : false);
    case "not_equals": return source !== val;
    case "in": return Array.isArray(val) ? val.includes(source) : false;
    case "not_in": return Array.isArray(val) ? !val.includes(source) : true;
    case "present": return source !== undefined && source !== null && source !== "" && !(Array.isArray(source) && source.length === 0);
    case "empty": return source === undefined || source === null || source === "" || (Array.isArray(source) && source.length === 0);
    default: return false;
  }
}

export default function CampoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<"estado" | "captura">("estado");
  const [regs, setRegs] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [step, setStep] = useState<"cedula" | "form" | "done">("cedula");
  const [cedula, setCedula] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sectorId, setSectorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  async function loadMe() {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) { router.push("/login"); return; }
    const j = await res.json();
    if (j.user?.role !== "ENUMERATOR") { router.push("/admin"); return; }
    setUser(j.user);
  }

  async function loadRegs() {
    setLoadingRegs(true);
    try {
      const res = await fetch("/api/enumerator/submissions", { cache: "no-store" });
      const j = await res.json();
      if (j.ok) setRegs(j.submissions || []);
    } finally { setLoadingRegs(false); }
  }

  useEffect(() => { loadMe(); }, []);
  useEffect(() => { if (user) loadRegs(); }, [user]);

  async function loadSurvey() {
    const res = await fetch("/api/public/survey/active", { cache: "no-store" });
    const j = await res.json();
    setSurveyData(j);
  }

  useEffect(() => { if (tab === "captura" && !surveyData) loadSurvey(); }, [tab, surveyData]);

  const parishQuestion = useMemo(() => (surveyData?.version?.questions ?? []).find((q: Question) => /parroquia/i.test(q.text) && q.type === "single_choice") || null, [surveyData]);
  const sectorQuestion = useMemo(() => (surveyData?.version?.questions ?? []).find((q: any) => q?.config?.dynamic === "sector_by_parish" || /barrio|sector específico/i.test(q?.text || "")) || null, [surveyData]);
  const selectedParishId = parishQuestion ? answers[parishQuestion.id] : undefined;
  const availableSectors = useMemo(() => {
    if (!selectedParishId) return [];
    const p = surveyData?.territory?.parishes?.find((x: any) => x.id === selectedParishId);
    return p?.sectors ?? [];
  }, [surveyData, selectedParishId]);
  useEffect(() => {
    setSectorId("");
    if (sectorQuestion) setAnswers((prev) => ({ ...prev, [sectorQuestion.id]: "" }));
  }, [selectedParishId, sectorQuestion?.id]);

  const visibility = useMemo(() => {
    const qs: Question[] = surveyData?.version?.questions ?? [];
    const map: Record<string, boolean> = {};
    qs.forEach((q) => (map[q.id] = true));
    qs.forEach((q) => (q.logicRules || []).forEach((rule) => {
      const match = evaluateCondition(rule, answers);
      if (!rule.targetId) return;
      if (rule.action === "show") map[rule.targetId] = match;
      if (rule.action === "hide") map[rule.targetId] = !match;
    }));
    return map;
  }, [surveyData, answers]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function startCapture(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    if (!surveyData?.survey?.id) return;
    const norm = normalizeCedula(cedula);
    if (!isValidEcuadorianCedula(norm)) { setErr("Cédula inválida (formato/dígito verificador)."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/public/participation/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyId: surveyData.survey.id, cedula: norm }) });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.message || "No se pudo iniciar."); return; }
      setParticipationId(j.participationId);
      setStep("form");
    } catch { setErr("Error de conexión."); } finally { setBusy(false); }
  }

  async function submitCapture(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!surveyData?.version || !participationId) return;
    const qs: Question[] = surveyData.version.questions || [];
    for (const q of qs) {
      if (visibility[q.id] === false) continue;
      if (q.required) {
        const v = answers[q.id];
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) { setErr(`Complete la pregunta obligatoria: "${q.text}"`); return; }
      }
    }
    if (sectorQuestion && selectedParishId && availableSectors.length > 0 && !sectorId) { setErr("Seleccione barrio/sector."); return; }
    const payloadAnswers = qs.filter((q) => visibility[q.id] !== false).map((q) => ({ questionId: q.id, value: answers[q.id] ?? null })).filter((a) => a.value !== null && a.value !== "");
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participationId, surveyVersionId: surveyData.version.id, channel: "ENUMERATOR", answers: payloadAnswers, sectorId: sectorId || null, startedAt }) });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.message || "No se pudo enviar."); return; }
      setStep("done"); setMsg("Registro enviado correctamente."); loadRegs();
    } catch { setErr("Error de conexión."); } finally { setBusy(false); }
  }

  function resetCapture() {
    setStep("cedula"); setCedula(""); setParticipationId(null); setAnswers({}); setSectorId(""); setErr(null); setMsg(null);
  }

  if (!user) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Panel de campo</h1>
          <p className="text-sm text-slate-600">{user.name} · Encuestador</p>
        </div>
        <button onClick={logout} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Salir</button>
      </div>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("estado")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "estado" ? "bg-blue-600 text-white" : "border bg-white"}`}>Mi actividad</button>
        <button onClick={() => setTab("captura")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "captura" ? "bg-blue-600 text-white" : "border bg-white"}`}>Nueva captura</button>
      </div>

      {tab === "estado" && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Estado de mis registros</h2>
            <button onClick={loadRegs} className="text-sm text-blue-700 hover:underline">Actualizar</button>
          </div>
          <p className="mb-3 text-xs text-slate-500">Solo se muestra su actividad operativa (sin contenido de respuestas ni estadísticas sensibles).</p>
          {loadingRegs ? <p>Cargando...</p> : regs.length === 0 ? <p className="text-slate-600">No hay registros todavía.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-slate-600"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Encuesta</th><th className="py-2 pr-3">Territorio</th><th className="py-2 pr-3">Calidad</th></tr></thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{new Date(r.submittedAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{r.surveyVersion?.survey?.title || "-"}</td>
                      <td className="py-2 pr-3">{r.sector?.parish?.name ? `${r.sector.parish.name} / ${r.sector.name}` : "-"}</td>
                      <td className="py-2 pr-3">{r.quality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "captura" && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          {!surveyData?.ok ? <p>{surveyData?.message || "Cargando encuesta..."}</p> : step === "done" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{msg}</div>
              <button onClick={resetCapture} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Nueva captura</button>
            </div>
          ) : step === "cedula" ? (
            <form onSubmit={startCapture} className="space-y-4">
              <h2 className="font-semibold">Nueva captura presencial</h2>
              <p className="text-sm text-slate-600">{surveyData.survey.title}</p>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{LOCAL_VALIDATION_NOTICE}</div>
              <div>
                <label className="block text-sm font-medium">Cédula del participante</label>
                <input value={cedula} onChange={(e) => setCedula(e.target.value)} maxLength={10} inputMode="numeric" className="mt-1 w-full rounded-lg border px-3 py-3 text-lg" placeholder="10 dígitos" required />
              </div>
              {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
              <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-60">{busy ? "Validando..." : "Iniciar captura"}</button>
            </form>
          ) : (
            <form onSubmit={submitCapture} className="space-y-5">
              <h2 className="font-semibold">Registro de respuestas</h2>
              {(surveyData.version.questions || []).map((q: any) => {
                if (visibility[q.id] === false) return null;
                const isSectorQ = sectorQuestion?.id === q.id;
                const maxSel = q?.config?.maxSelections;
                return (
                  <div key={q.id} className="space-y-2">
                    <label className="block font-medium">{q.text} {q.required && <span className="text-red-600">*</span>}</label>
                    {isSectorQ && q.type === "single_choice" && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                        {!selectedParishId ? <p className="text-sm text-slate-600">Seleccione primero la parroquia (Pregunta 1).</p> : availableSectors.length === 0 ? <p className="text-sm text-slate-600">No hay sectores registrados para la parroquia seleccionada.</p> : (
                          <select value={sectorId} onChange={(e) => { setSectorId(e.target.value); setAnswers((p) => ({ ...p, [q.id]: e.target.value })); }} className="mt-1 w-full rounded-lg border bg-white px-3 py-2">
                            <option value="">Seleccione barrio/sector</option>
                            {availableSectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                    {!isSectorQ && q.type === "single_choice" && (
                      <div className="space-y-2">
                        {q.options.map((opt: any) => (
                          <label key={opt.id} className="flex items-center gap-3 rounded-lg border p-3">
                            <input type="radio" name={q.id} checked={answers[q.id] === opt.value} onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.value }))} className="shrink-0" />
                            {opt.figure?.photoUrl ? (
                              <img src={opt.figure.photoUrl} alt={opt.figure.name || opt.label} className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0" />
                            ) : opt.figureId ? (
                              <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">Sin foto</div>
                            ) : null}
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === "multiple_choice" && (
                      <div className="space-y-2">
                        {maxSel && <p className="text-xs text-slate-500">Seleccione hasta {maxSel} opciones.</p>}
                        {q.options.map((opt: any) => {
                          const arr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                          const checked = arr.includes(opt.value);
                          return (
                            <label key={opt.id} className="flex items-center gap-2 rounded-lg border p-3">
                              <input type="checkbox" checked={checked} onChange={(e) => {
                                let next = e.target.checked ? [...arr, opt.value] : arr.filter((v) => v !== opt.value);
                                if (e.target.checked && maxSel && next.length > maxSel) return;
                                setAnswers((p) => ({ ...p, [q.id]: next }));
                              }} />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "text" && <textarea value={answers[q.id] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} className="w-full rounded-lg border px-3 py-2" rows={3} />}
                    {q.type === "scale" && <input type="number" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />}
                  </div>
                );
              })}
              {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
              <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-60">{busy ? "Enviando..." : "Guardar registro"}</button>
            </form>
          )}
        </div>
      )}
      <div className="mt-4"><Link href="/" className="text-sm text-blue-700 hover:underline">← Inicio</Link></div>
    </main>
  );
}