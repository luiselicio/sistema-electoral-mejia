"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ActoresPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [org, setOrg] = useState({ name: "", shortName: "", description: "" });
  const [fig, setFig] = useState<any>({ name: "", organizationId: "", cantonId: "", condition: "FIGURE", verifiedSource: "", description: "", photoUrl: "", active: true });
  const [uploading, setUploading] = useState(false);
  const [editingFigId, setEditingFigId] = useState<string | null>(null);
  const [editFig, setEditFig] = useState<any | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/actors", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setData(j); else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function upload(file: File, target: "create" | "edit") {
    const setUp = target === "create" ? setUploading : setEditUploading;
    setUp(true);
    setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok || !j.ok) setErr(j.message || "Error al subir");
      else if (target === "create") setFig((f: any) => ({ ...f, photoUrl: j.url }));
      else setEditFig((f: any) => ({ ...f, photoUrl: j.url }));
    } finally { setUp(false); }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/actors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "organization", ...org }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Organización creada."); setOrg({ name: "", shortName: "", description: "" }); load(); }
  }

  async function createFig(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/actors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "figure", ...fig }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Figura creada."); setFig({ name: "", organizationId: "", cantonId: "", condition: "FIGURE", verifiedSource: "", description: "", photoUrl: "", active: true }); load(); }
  }

  function startEditFigure(f: any) {
    setEditingFigId(f.id);
    setEditFig({
      name: f.name || "",
      organizationId: f.organizationId || "",
      cantonId: f.cantonId || "",
      condition: f.condition || "FIGURE",
      verifiedSource: f.verifiedSource || "",
      description: f.description || "",
      photoUrl: f.photoUrl || "",
      active: f.active !== false,
    });
    setErr(null); setMsg(null);
  }

  async function saveFigureEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFigId || !editFig) return;
    setErr(null); setMsg(null);
    const res = await fetch("/api/admin/actors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "figure", id: editingFigId, ...editFig }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error al actualizar"); else { setMsg("Figura actualizada."); setEditingFigId(null); setEditFig(null); load(); }
  }

  async function del(type: string, id: string) {
    if (!confirm("¿Eliminar?")) return;
    const res = await fetch(`/api/admin/actors?type=${type}&id=${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "No se pudo eliminar"); else { setMsg("Eliminado."); if (editingFigId === id) { setEditingFigId(null); setEditFig(null); } load(); }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Actores políticos (A5)</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      <p className="mb-4 text-sm text-slate-600">No afirmar condición de candidato oficialmente inscrito sin fuente verificable. Imágenes locales (JPG/PNG/WebP, máx. 2MB) en <code>public/uploads/figures/</code>.</p>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={createOrg} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Organización política</h2>
          <input value={org.name} onChange={(e)=>setOrg({...org, name:e.target.value})} placeholder="Nombre" className="w-full rounded-lg border px-3 py-2" required />
          <input value={org.shortName} onChange={(e)=>setOrg({...org, shortName:e.target.value})} placeholder="Siglas (opcional)" className="w-full rounded-lg border px-3 py-2" />
          <textarea value={org.description} onChange={(e)=>setOrg({...org, description:e.target.value})} placeholder="Descripción" className="w-full rounded-lg border px-3 py-2" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Crear organización</button>
        </form>

        <form onSubmit={createFig} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Figura política (crear)</h2>
          <input value={fig.name} onChange={(e)=>setFig({...fig, name:e.target.value})} placeholder="Nombre" className="w-full rounded-lg border px-3 py-2" required />
          <select value={fig.organizationId} onChange={(e)=>setFig({...fig, organizationId:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option value="">Organización (opcional)</option>{(data?.organizations||[]).map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
          <select value={fig.cantonId} onChange={(e)=>setFig({...fig, cantonId:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option value="">Cantón (opcional)</option>{(data?.cantons||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={fig.condition} onChange={(e)=>setFig({...fig, condition:e.target.value})} className="w-full rounded-lg border px-3 py-2">
            <option value="FIGURE">Figura</option>
            <option value="POTENTIAL_PRE_CANDIDATE">Posible precandidato</option>
            <option value="OFFICIALLY_REGISTERED_CANDIDATE">Candidato oficialmente inscrito (requiere fuente)</option>
            <option value="OTHER">Otro</option>
          </select>
          <input value={fig.verifiedSource} onChange={(e)=>setFig({...fig, verifiedSource:e.target.value})} placeholder="Fuente verificable (si aplica)" className="w-full rounded-lg border px-3 py-2" />
          <div className="space-y-1">
            <label className="text-sm">Foto (local)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) upload(f, "create"); }} />
            {uploading && <p className="text-xs text-slate-500">Subiendo...</p>}
            {fig.photoUrl && <img src={fig.photoUrl} alt="foto" className="h-16 w-16 rounded object-cover" />}
          </div>
          <textarea value={fig.description} onChange={(e)=>setFig({...fig, description:e.target.value})} placeholder="Descripción" className="w-full rounded-lg border px-3 py-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fig.active !== false} onChange={(e)=>setFig({...fig, active:e.target.checked})} /> Activa</label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Crear figura</button>
        </form>
      </div>

      {editingFigId && editFig && (
        <form onSubmit={saveFigureEdit} className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Editar figura / candidato</h2><button type="button" onClick={()=>{ setEditingFigId(null); setEditFig(null); }} className="text-sm text-slate-700 hover:underline">Cancelar</button></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={editFig.name} onChange={(e)=>setEditFig({...editFig, name:e.target.value})} placeholder="Nombre" className="w-full rounded-lg border px-3 py-2" required />
            <select value={editFig.organizationId} onChange={(e)=>setEditFig({...editFig, organizationId:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option value="">Organización (opcional)</option>{(data?.organizations||[]).map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <select value={editFig.cantonId} onChange={(e)=>setEditFig({...editFig, cantonId:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option value="">Cantón (opcional)</option>{(data?.cantons||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={editFig.condition} onChange={(e)=>setEditFig({...editFig, condition:e.target.value})} className="w-full rounded-lg border px-3 py-2">
              <option value="FIGURE">Figura</option>
              <option value="POTENTIAL_PRE_CANDIDATE">Posible precandidato</option>
              <option value="OFFICIALLY_REGISTERED_CANDIDATE">Candidato oficialmente inscrito (requiere fuente)</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          <input value={editFig.verifiedSource} onChange={(e)=>setEditFig({...editFig, verifiedSource:e.target.value})} placeholder="Fuente verificable (si aplica)" className="w-full rounded-lg border px-3 py-2" />
          <div className="space-y-1">
            <label className="text-sm font-medium">Fotografía (cambiar/subir local)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) upload(f, "edit"); }} />
            {editUploading && <p className="text-xs text-slate-500">Subiendo...</p>}
            {editFig.photoUrl ? <img src={editFig.photoUrl} alt="foto" className="h-20 w-20 rounded object-cover border" /> : <p className="text-xs text-slate-500">Sin fotografía</p>}
          </div>
          <textarea value={editFig.description} onChange={(e)=>setEditFig({...editFig, description:e.target.value})} placeholder="Descripción" className="w-full rounded-lg border px-3 py-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editFig.active !== false} onChange={(e)=>setEditFig({...editFig, active:e.target.checked})} /> Activa</label>
          <div className="flex gap-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-white">Guardar cambios</button>
            <button type="button" onClick={()=>{ setEditingFigId(null); setEditFig(null); }} className="rounded-lg border px-4 py-2">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Organizaciones</h2>
          <ul className="space-y-2 text-sm">{(data?.organizations||[]).map((o:any)=>(<li key={o.id} className="flex items-center justify-between rounded border p-2"><span><b>{o.name}</b> {o.shortName?`(${o.shortName})`:""}</span><button onClick={()=>del("organization",o.id)} className="text-xs text-red-600 hover:underline">Eliminar</button></li>))}</ul>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Figuras / Candidatos</h2>
          <ul className="space-y-2 text-sm">{(data?.figures||[]).map((f:any)=>(<li key={f.id} className="flex items-center justify-between gap-2 rounded border p-2"><div className="flex items-center gap-2">{f.photoUrl ? <img src={f.photoUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-slate-200" />}<div><div className="font-medium">{f.name}</div><div className="text-xs text-slate-600">{f.condition} · {f.organization?.name||"Sin organización"} {f.canton?`· ${f.canton.name}`:""} · {f.active===false?"Inactiva":"Activa"}</div></div></div><div className="flex gap-2"><button onClick={()=>startEditFigure(f)} className="text-xs text-blue-700 hover:underline">Editar</button><button onClick={()=>del("figure",f.id)} className="text-xs text-red-600 hover:underline">Eliminar</button></div></li>))}</ul>
        </div>
      </div>
    </main>
  );
}