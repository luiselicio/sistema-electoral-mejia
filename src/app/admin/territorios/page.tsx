"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CsvRow = { parishName: string; name: string; sectorType: string; valid: boolean; error?: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const start = /parro/i.test(lines[0]) ? 1 : 0;
  const rows: CsvRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const parishName = cols[0] || "";
    const name = cols[1] || "";
    const sectorType = (cols[2] || "sector").toLowerCase();
    const valid = !!parishName && !!name;
    rows.push({ parishName, name, sectorType: sectorType === "barrio" ? "barrio" : "sector", valid, error: valid ? undefined : "Parroquia y nombre requeridos" });
  }
  return rows;
}

export default function TerritoriosPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [parishName, setParishName] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [sectorType, setSectorType] = useState("sector");
  const [parishId, setParishId] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);

  async function load() {
    const res = await fetch("/api/admin/territories", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setData(j); else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function addParish(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/territories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "parish", name: parishName }) });
    const j = await res.json();
    if (!res.ok || !j.ok) { setErr(j.message || "Error"); return; }
    setParishName(""); setMsg("Parroquia creada."); load();
  }

  async function addSector(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    if (!parishId) { setErr("Seleccione parroquia."); return; }
    const res = await fetch("/api/admin/territories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sector", name: sectorName, parishId, sectorType }) });
    const j = await res.json();
    if (!res.ok || !j.ok) { setErr(j.message || "Error"); return; }
    setSectorName(""); setMsg("Sector/barrio creado."); load();
  }

  async function del(type: string, id: string) {
    if (!confirm("¿Eliminar?")) return;
    const res = await fetch(`/api/admin/territories?type=${type}&id=${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "No se pudo eliminar"); else { setMsg("Eliminado."); load(); }
  }

  function onCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result || ""); setCsvPreview(parseCsv(text)); };
    reader.readAsText(file, "utf-8");
  }

  async function importCsv() {
    const rows = csvPreview.filter((r) => r.valid);
    if (rows.length === 0) { setErr("No hay filas válidas."); return; }
    setErr(null); setMsg(null);
    const res = await fetch("/api/admin/territories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "importSectors", rows }) });
    const j = await res.json();
    if (!res.ok || !j.ok) { setErr(j.message || "Error"); return; }
    setMsg(`Importación completada. Creados: ${j.created}. Errores: ${(j.errors||[]).length}`);
    if ((j.errors||[]).length) setErr((j.errors as string[]).slice(0,5).join(" · "));
    setCsvPreview([]); load();
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Gestión de territorios (A4)</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      <p className="mb-4 text-sm text-slate-600">Cantón: {data?.canton?.name || "Mejía"}. Carga manual o importación CSV con vista previa.</p>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={addParish} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Agregar parroquia</h2>
          <input value={parishName} onChange={(e)=>setParishName(e.target.value)} placeholder="Nombre" className="w-full rounded-lg border px-3 py-2" required />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Crear</button>
        </form>
        <form onSubmit={addSector} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Agregar sector/barrio</h2>
          <select value={parishId} onChange={(e)=>setParishId(e.target.value)} className="w-full rounded-lg border px-3 py-2" required><option value="">Seleccione parroquia</option>{(data?.parishes||[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input value={sectorName} onChange={(e)=>setSectorName(e.target.value)} placeholder="Nombre" className="w-full rounded-lg border px-3 py-2" required />
          <select value={sectorType} onChange={(e)=>setSectorType(e.target.value)} className="w-full rounded-lg border px-3 py-2"><option value="sector">Sector</option><option value="barrio">Barrio</option></select>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Crear</button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Importación CSV con vista previa</h2>
        <p className="text-sm text-slate-600">Formato: parroquia,sector,tipo (sector|barrio). Cabecera opcional.</p>
        <input type="file" accept=".csv,text/csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onCsv(f); }} className="mt-2 text-sm" />
        {csvPreview.length>0 && <div className="mt-3">
          <div className="text-sm mb-2">Válidas: {csvPreview.filter(r=>r.valid).length}/{csvPreview.length}</div>
          <div className="max-h-56 overflow-auto border rounded">
            <table className="min-w-full text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-2 text-left">Parroquia</th><th className="p-2 text-left">Sector</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-left">Estado</th></tr></thead>
              <tbody>{csvPreview.map((r,i)=>(<tr key={i} className="border-b last:border-0"><td className="p-2">{r.parishName}</td><td className="p-2">{r.name}</td><td className="p-2">{r.sectorType}</td><td className="p-2">{r.valid?"OK":<span className="text-red-600">{r.error}</span>}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="mt-2 flex gap-2"><button onClick={importCsv} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Importar</button><button onClick={()=>setCsvPreview([])} className="rounded-lg border px-4 py-2">Cancelar</button></div>
        </div>}
      </div>

      <div className="mt-6 space-y-3">
        {(data?.parishes||[]).map((p:any)=>(<div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex justify-between"><h3 className="font-semibold">{p.name}</h3><button onClick={()=>del("parish",p.id)} className="text-xs text-red-600">Eliminar</button></div><ul className="mt-2 grid sm:grid-cols-2 gap-1 text-sm">{p.sectors.map((s:any)=>(<li key={s.id} className="flex justify-between border rounded px-2 py-1"><span>{s.name} ({s.type},{s.source})</span><button onClick={()=>del("sector",s.id)} className="text-xs text-red-600">Eliminar</button></li>))}</ul></div>))}
      </div>
    </main>
  );
}