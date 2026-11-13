"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UsuariosPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "ENUMERATOR" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const j = await res.json();
    if (j.ok) setData(j); else setErr(j.message || "Error");
  }
  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Usuario creado."); setForm({ email: "", name: "", password: "", role: "ENUMERATOR" }); load(); }
  }

  async function updateUser(userId: string, patch: any) {
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", userId, ...patch }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg("Usuario actualizado."); load(); }
  }

  async function toggleAssign(userId: string, campaignId: string, assign: boolean) {
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", userId, campaignId, assign }) });
    const j = await res.json();
    if (!res.ok || !j.ok) setErr(j.message || "Error"); else { setMsg(assign ? "Asignado a campaña." : "Asignación removida."); load(); }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Gestión de usuarios y asignaciones (A7)</h1><Link href="/admin" className="text-sm text-blue-700 hover:underline">← Volver</Link></div>
      <p className="mb-4 text-sm text-slate-600">Creación de usuarios internos, roles, activación/desactivación y asignación de encuestadores a campañas/territorio (Mejía). Todas las acciones quedan auditadas.</p>
      {msg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <form onSubmit={createUser} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-5">
        <input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Nombre" className="rounded-lg border px-3 py-2" required />
        <input type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="Correo" className="rounded-lg border px-3 py-2" required />
        <input type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} placeholder="Contraseña" className="rounded-lg border px-3 py-2" required />
        <select value={form.role} onChange={(e)=>setForm({...form, role:e.target.value})} className="rounded-lg border px-3 py-2">
          <option value="ENUMERATOR">Encuestador</option>
          <option value="ANALYST">Analista</option>
          <option value="CAMPAIGN_ADMIN">Admin campaña</option>
          <option value="SUPERADMIN">Superadmin</option>
        </select>
        <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{busy?"Creando...":"Crear usuario"}</button>
      </form>

      <div className="space-y-3">
        {(data?.users||[]).map((u:any)=>{
          const assignedIds = new Set((u.assignments||[]).map((a:any)=>a.campaignId));
          return (
            <div key={u.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{u.name} <span className="text-slate-500">({u.email})</span></div>
                  <div className="text-sm text-slate-600">Rol: {u.role} · Estado: {u.active?"Activo":"Inactivo"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select defaultValue={u.role} onChange={(e)=>updateUser(u.id, { role: e.target.value })} className="rounded border px-2 py-1 text-sm">
                    <option value="ENUMERATOR">ENUMERATOR</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="CAMPAIGN_ADMIN">CAMPAIGN_ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                  <button onClick={()=>updateUser(u.id, { active: !u.active })} className={`rounded px-3 py-1 text-sm text-white ${u.active?"bg-amber-600":"bg-green-600"}`}>{u.active?"Desactivar":"Activar"}</button>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 text-sm font-medium">Asignación a campañas (territorio del cantón según campaña)</div>
                <div className="flex flex-wrap gap-2">
                  {(data?.campaigns||[]).map((c:any)=>{
                    const on = assignedIds.has(c.id);
                    return <button key={c.id} onClick={()=>toggleAssign(u.id, c.id, !on)} className={`rounded-full border px-3 py-1 text-sm ${on?"border-blue-600 bg-blue-50 text-blue-800":"hover:bg-slate-50"}`}>{on?"✓ ":""}{c.name}{c.canton?.name?` · ${c.canton.name}`:""}</button>;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}