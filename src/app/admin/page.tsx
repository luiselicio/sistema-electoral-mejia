"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Suppressed({ text = "<10 (suprimido)" }: { text?: string }) {
  return <span className="italic text-slate-500">{text}</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) { router.push("/login"); return; }
        const me = await meRes.json();
        const role = me.user?.role;
        if (!role || !["SUPERADMIN", "CAMPAIGN_ADMIN", "ANALYST"].includes(role)) {
          router.push(role === "ENUMERATOR" ? "/campo" : "/login");
          return;
        }
        setUser(me.user);

        const mRes = await fetch("/api/admin/metrics", { cache: "no-store" });
        const mJson = await mRes.json();
        if (mRes.ok && mJson.ok) setMetrics(mJson.metrics);
        else setError(mJson.message || "No se pudieron cargar métricas.");

        if (role === "SUPERADMIN") {
          const aRes = await fetch("/api/admin/audit", { cache: "no-store" });
          const aJson = await aRes.json();
          if (aRes.ok && aJson.ok) setLogs(aJson.logs || []);
        }
      } catch {
        setError("Error de conexión.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function exportCsv() {
    // descarga con cookies de sesión; registra auditoría en servidor
    window.location.href = "/api/admin/export?format=csv";
  }

  if (loading) return <main className="p-6">Cargando panel...</main>;
  const detailed = metrics?.detailed;
  const canManage = user?.role === "SUPERADMIN" || user?.role === "CAMPAIGN_ADMIN";

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel administrativo y analítica</h1>
          <p className="text-sm text-slate-600">{user?.name} · {user?.role}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Inicio</Link>
          <button onClick={exportCsv} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Exportar CSV (agregado)</button>
          <button onClick={logout} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Salir</button>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {canManage && <Link href="/admin/territorios" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Territorios</Link>}
        {canManage && <Link href="/admin/actores" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Actores políticos</Link>}
        {canManage && <Link href="/admin/encuestas" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Encuestas</Link>}
        {canManage && <Link href="/admin/privacidad" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Privacidad (A8)</Link>}
        {canManage && <Link href="/admin/usuarios" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Usuarios (A7)</Link>}
        {canManage && <Link href="/admin/calidad" className="rounded-lg border bg-white px-3 py-2 hover:bg-slate-50">Calidad (A10)</Link>}
      </nav>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {metrics && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Respuestas" value={metrics.totals.submissions} />
            <Stat label="Participaciones" value={metrics.totals.participations} />
            <Stat label="Campañas" value={metrics.totals.campaigns} />
            <Stat label="Encuestas" value={metrics.totals.surveys} />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Distribución operativa</h2>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-1 text-slate-500">Por canal</div>
                  <ul className="space-y-1">{metrics.byChannel.map((r: any) => (<li key={r.channel} className="flex justify-between"><span>{r.channel}</span><span className="font-medium">{r.count}</span></li>))}</ul>
                </div>
                <div>
                  <div className="mb-1 text-slate-500">Por calidad</div>
                  <ul className="space-y-1">{metrics.byQuality.map((r: any) => (<li key={r.quality} className="flex justify-between"><span>{r.quality}</span><span className="font-medium">{r.count}</span></li>))}</ul>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Actividad reciente (metadatos)</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {metrics.recentSubmissions.map((r: any) => (
                  <li key={r.id} className="rounded-lg border p-2"><div className="font-medium">{r.surveyTitle}</div><div className="text-slate-600">{r.channel} · {r.quality} · {new Date(r.submittedAt).toLocaleString()}</div></li>
                ))}
                {metrics.recentSubmissions.length === 0 && <li className="text-slate-500">Sin envíos.</li>}
              </ul>
            </div>
          </section>

          {detailed && (
            <section className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Analítica detallada (A2: k ≥ 10)</h2>
                <p className="text-sm text-slate-600">Encuesta: {detailed.survey?.title} · Umbral k={detailed.kThreshold}. Segmentos con menos de 10 respuestas se suprimen para evitar reidentificación.</p>
                <p className="mt-1 text-sm">Total envíos: {detailed.totalSubmissions?.suppressed ? <Suppressed /> : detailed.totalSubmissions?.count}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">Desglose por parroquia</h3>
                  <table className="mt-2 w-full text-sm"><thead><tr className="border-b text-left"><th className="py-1">Parroquia</th><th className="py-1">Conteo</th></tr></thead><tbody>
                    {detailed.territory.byParish.map((p: any) => (<tr key={p.parishId} className="border-b last:border-0"><td className="py-1">{p.parishName}</td><td className="py-1">{p.suppressed ? <Suppressed /> : p.count}</td></tr>))}
                    {detailed.territory.byParish.length === 0 && <tr><td colSpan={2} className="py-1 text-slate-500">Sin datos territoriales.</td></tr>}
                  </tbody></table>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">Desglose por sector/barrio</h3>
                  <div className="mt-2 max-h-80 overflow-auto">
                    <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-1">Parroquia</th><th className="py-1">Sector</th><th className="py-1">Conteo</th></tr></thead><tbody>
                      {detailed.territory.bySector.map((s: any) => (<tr key={s.sectorId} className="border-b last:border-0"><td className="py-1">{s.parishName}</td><td className="py-1">{s.sectorName}</td><td className="py-1">{s.suppressed ? <Suppressed /> : s.count}</td></tr>))}
                      {detailed.territory.bySector.length === 0 && <tr><td colSpan={3} className="py-1 text-slate-500">Sin datos.</td></tr>}
                    </tbody></table>
                  </div>
                </div>
              </div>

              {detailed.questions.map((q: any) => (
                <div key={q.questionId} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="font-semibold">{q.text}</h3>
                  <p className="text-xs text-slate-500">Tipo: {q.type} · Respuestas (agregado): {q.totalAnswered?.suppressed ? <Suppressed /> : q.totalAnswered?.count}</p>
                  {q.note && <p className="mt-1 text-xs text-slate-500">{q.note}</p>}
                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                      <div className="mb-1 text-sm font-medium">Resultado general</div>
                      <ul className="space-y-1 text-sm">
                        {q.overall.map((o: any, i: number) => (<li key={i} className="flex justify-between gap-2 border-b py-1 last:border-0"><span>{o.label}</span><span>{o.suppressed ? <Suppressed /> : o.count}</span></li>))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Por parroquia (suprimido si k&lt;10)</div>
                      <div className="max-h-56 overflow-auto text-sm">
                        {q.byParish.map((p: any) => (
                          <div key={p.parishId} className="border-b py-1">
                            <div className="font-medium">{p.parishName}: {p.suppressed ? <Suppressed /> : p.total}</div>
                            {!p.suppressed && p.values?.length > 0 && <ul className="ml-2 text-slate-700">{p.values.map((v: any, i: number) => (<li key={i} className="flex justify-between"><span>{v.label}</span><span>{v.suppressed ? <Suppressed /> : v.count}</span></li>))}</ul>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium">Por sector (suprimido si k&lt;10)</div>
                      <div className="max-h-56 overflow-auto text-sm">
                        {q.bySector.map((s: any) => (
                          <div key={s.sectorId} className="border-b py-1">
                            <div className="font-medium">{s.parishName} / {s.sectorName}: {s.suppressed ? <Suppressed /> : s.total}</div>
                            {!s.suppressed && s.values?.length > 0 && <ul className="ml-2 text-slate-700">{s.values.map((v: any, i: number) => (<li key={i} className="flex justify-between"><span>{v.label}</span><span>{v.suppressed ? <Suppressed /> : v.count}</span></li>))}</ul>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {user?.role === "SUPERADMIN" && (
        <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Registros de auditoría</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-slate-600"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Actor</th><th className="py-2 pr-3">Acción</th><th className="py-2 pr-3">Entidad</th></tr></thead>
              <tbody>
                {logs.map((l) => (<tr key={l.id} className="border-b align-top last:border-0"><td className="py-2 pr-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td><td className="py-2 pr-3">{l.actor ? `${l.actor.name} (${l.actor.role})` : "Sistema/Público"}</td><td className="py-2 pr-3 font-medium">{l.action}</td><td className="py-2 pr-3">{l.entityType}{l.entityId ? ` · ${l.entityId}` : ""}</td></tr>))}
                {logs.length === 0 && <tr><td className="py-2 text-slate-500" colSpan={4}>Sin registros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (<div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>);
}