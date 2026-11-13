"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CalidadPage() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/quality", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setItems(j.submissions || []); else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function updateQuality(submissionId: string, quality: string) {
    const reason = reasons[submissionId] || "";
    if (!reason.trim()) { setErr("Debe indicar un motivo para el cambio de calidad."); return; }
    setErr(null); setMsg(null);
    const res = await fetch("/api/admin/quality", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, quality, reason }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Calidad actualizada y auditada."); load(); }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Control de calidad de envíos (A10)</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      <p className="mb-4 text-sm text-slate-600">Revise metadatos y actualice estado de calidad (VALID, OBSERVED, REJECTED) con motivo. Cada cambio queda auditado. La analítica agregada contabiliza únicamente envíos <strong>VALID</strong>.</p>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Fecha</th><th className="p-2">Encuesta</th><th className="p-2">Canal</th><th className="p-2">Encuestador</th><th className="p-2">Territorio</th><th className="p-2">Calidad</th><th className="p-2">Acción (motivo requerido)</th></tr></thead>
          <tbody>
            {items.map((s)=>(
              <tr key={s.id} className="border-b align-top last:border-0">
                <td className="p-2 whitespace-nowrap">{new Date(s.submittedAt).toLocaleString()}</td>
                <td className="p-2">{s.surveyVersion?.survey?.title} (v{s.surveyVersion?.version})</td>
                <td className="p-2">{s.channel}</td>
                <td className="p-2">{s.enumerator?.name || <span className="text-slate-500">Público</span>}</td>
                <td className="p-2">{s.sector?.parish?.name ? `${s.sector.parish.name} / ${s.sector.name}` : "-"}</td>
                <td className="p-2 font-medium">{s.quality}{s.qualityNotes && <div className="text-xs text-slate-500 mt-1">Motivo: {s.qualityNotes}</div>}</td>
                <td className="p-2 min-w-[280px]">
                  <input value={reasons[s.id] || ""} onChange={(e)=>setReasons({...reasons, [s.id]: e.target.value})} placeholder="Motivo del cambio" className="mb-2 w-full rounded border px-2 py-1" />
                  <div className="flex flex-wrap gap-1">
                    <button onClick={()=>updateQuality(s.id, "VALID")} className="rounded bg-green-600 px-2 py-1 text-xs text-white">VALID</button>
                    <button onClick={()=>updateQuality(s.id, "OBSERVED")} className="rounded bg-amber-600 px-2 py-1 text-xs text-white">OBSERVED</button>
                    <button onClick={()=>updateQuality(s.id, "REJECTED")} className="rounded bg-red-600 px-2 py-1 text-xs text-white">REJECTED</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td className="p-3 text-slate-500" colSpan={7}>Sin envíos.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}