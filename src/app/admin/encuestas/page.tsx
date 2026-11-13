"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EncuestasPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newSurvey, setNewSurvey] = useState({ campaignId: "", title: "", description: "" });
  const [qForm, setQForm] = useState<any>({ surveyVersionId: "", text: "", type: "single_choice", required: true, optionsText: "" });

  async function load() {
    const res = await fetch("/api/admin/surveys", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) { setData(j); if (!newSurvey.campaignId && j.campaigns?.[0]) setNewSurvey((s)=>({...s, campaignId: j.campaigns[0].id})); } else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function createSurvey(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createSurvey", ...newSurvey }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Encuesta creada (borrador + versión 1)."); setNewSurvey({ ...newSurvey, title: "", description: "" }); load(); }
  }

  function parseOptions(text: string, type: string) {
    if (type === "text" || type === "scale") return [];
    // formato: etiqueta|valor por línea (valor opcional)
    return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l, idx) => {
      const [label, value] = l.split("|").map((x) => x?.trim());
      return { label: label || value || `Opción ${idx+1}`, value: value || label || `opt_${idx+1}` };
    });
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const options = parseOptions(qForm.optionsText, qForm.type);
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addQuestion", surveyVersionId: qForm.surveyVersionId, text: qForm.text, type: qForm.type, required: qForm.required, options }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Pregunta agregada."); setQForm({ ...qForm, text: "", optionsText: "" }); load(); }
  }

  async function publish(surveyId: string, surveyVersionId: string) {
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", surveyId, surveyVersionId }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Encuesta publicada."); load(); }
  }
  async function closeSurvey(surveyId: string) {
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", surveyId }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Encuesta cerrada."); load(); }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Constructor de encuestas (básico) y publicación</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={createSurvey} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Crear encuesta</h2>
          <select value={newSurvey.campaignId} onChange={(e)=>setNewSurvey({...newSurvey, campaignId:e.target.value})} className="w-full rounded-lg border px-3 py-2" required>
            <option value="">Campaña</option>
            {(data?.campaigns||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={newSurvey.title} onChange={(e)=>setNewSurvey({...newSurvey, title:e.target.value})} placeholder="Título" className="w-full rounded-lg border px-3 py-2" required />
          <textarea value={newSurvey.description} onChange={(e)=>setNewSurvey({...newSurvey, description:e.target.value})} placeholder="Descripción" className="w-full rounded-lg border px-3 py-2" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Crear (borrador)</button>
        </form>

        <form onSubmit={addQuestion} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Agregar pregunta a versión</h2>
          <select value={qForm.surveyVersionId} onChange={(e)=>setQForm({...qForm, surveyVersionId:e.target.value})} className="w-full rounded-lg border px-3 py-2" required>
            <option value="">Seleccione versión (encuesta)</option>
            {(data?.surveys||[]).flatMap((s:any)=>s.versions.map((v:any)=>(<option key={v.id} value={v.id}>{s.title} — v{v.version} {v.isPublished?"(publicada)":""}</option>)))}
          </select>
          <input value={qForm.text} onChange={(e)=>setQForm({...qForm, text:e.target.value})} placeholder="Texto de la pregunta" className="w-full rounded-lg border px-3 py-2" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={qForm.type} onChange={(e)=>setQForm({...qForm, type:e.target.value})} className="rounded-lg border px-3 py-2"><option value="single_choice">Opción única</option><option value="multiple_choice">Opción múltiple</option><option value="text">Texto</option><option value="scale">Escala/número</option></select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={qForm.required} onChange={(e)=>setQForm({...qForm, required:e.target.checked})} /> Obligatoria</label>
          </div>
          <textarea value={qForm.optionsText} onChange={(e)=>setQForm({...qForm, optionsText:e.target.value})} placeholder={"Opciones (una por línea). Formato: etiqueta|valor (opcional). Ej:\nMachachi|parish_id\nPrefiero no responder|prefiero_no_responder"} className="w-full rounded-lg border px-3 py-2" rows={4} />
          <p className="text-xs text-slate-500">Para texto/escala no se requieren opciones. Constructor básico; reglas condicionales avanzadas pueden configurarse en evoluciones posteriores.</p>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Agregar pregunta</button>
        </form>
      </div>

      <div className="mt-6 space-y-4">
        {(data?.surveys||[]).map((s:any)=>(
          <div key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-semibold">{s.title}</h2><p className="text-sm text-slate-600">{s.campaign?.name} · Estado: {s.status}</p></div>
              <div className="flex gap-2">{s.versions[0] && <button onClick={()=>publish(s.id, s.versions[0].id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">Publicar última versión</button>}<button onClick={()=>closeSurvey(s.id)} className="rounded-lg border px-3 py-1.5 text-sm">Cerrar</button></div>
            </div>
            {s.versions.map((v:any)=>(
              <div key={v.id} className="mt-3 rounded-lg border p-3">
                <div className="text-sm font-medium">Versión {v.version} {v.isPublished && <span className="text-green-700">(publicada)</span>}</div>
                <ul className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                  {v.questions.map((q:any)=>(<li key={q.id}><span className="font-medium">{q.text}</span> <span className="text-slate-500">[{q.type}{q.required?"*":""}]</span>{q.options?.length>0 && <span className="text-slate-500"> — {q.options.length} opciones</span>}</li>))}
                  {v.questions.length===0 && <li className="list-none text-slate-500">Sin preguntas.</li>}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}