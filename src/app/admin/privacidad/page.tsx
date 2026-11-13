"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PrivacidadPage() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "survey_notice", version: "v2", title: "Aviso de privacidad", body: "", active: true });

  async function load() {
    const res = await fetch("/api/admin/privacy", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setItems(j.items || []); else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/privacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Versión de privacidad guardada."); load(); }
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Textos legales y privacidad (A8)</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      <p className="mb-4 text-sm text-slate-600">Versionado de aviso/consentimiento/finalidad. Contenido sujeto a revisión jurídica; no activa cumplimiento automático. Incluir nota: validación local de cédula no acredita identidad/habilitación electoral.</p>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input value={form.key} onChange={(e)=>setForm({...form, key:e.target.value})} placeholder="key (ej. survey_notice)" className="rounded-lg border px-3 py-2" required />
          <input value={form.version} onChange={(e)=>setForm({...form, version:e.target.value})} placeholder="versión (ej. v2)" className="rounded-lg border px-3 py-2" required />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form, active:e.target.checked})} /> Activa</label>
        </div>
        <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} placeholder="Título" className="w-full rounded-lg border px-3 py-2" />
        <textarea value={form.body} onChange={(e)=>setForm({...form, body:e.target.value})} placeholder="Contenido del aviso/consentimiento..." className="w-full rounded-lg border px-3 py-2" rows={6} required />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Guardar versión</button>
      </form>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Historial/versiones</h2>
        <ul className="space-y-3">
          {items.map((i)=>(
            <li key={i.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{i.key}</span><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{i.version}</span>{i.active && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">activa</span>}<span className="text-xs text-slate-500">{new Date(i.createdAt).toLocaleString()}</span></div>
              {i.title && <div className="text-sm font-medium mt-1">{i.title}</div>}
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{i.body}</p>
            </li>
          ))}
          {items.length===0 && <li className="text-slate-500">Sin registros.</li>}
        </ul>
      </div>
    </main>
  );
}