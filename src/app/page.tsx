import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ELECTORAL DATA</h1>
        <p className="mx-auto max-w-2xl text-slate-700">
          Sistema para encuestas de opinión ciudadana e intención de voto. Modelo
          <strong> confidencial o seudonimizado</strong>: la cédula se valida localmente y se
          protege mediante derivación criptográfica, separada de las respuestas políticas.
        </p>
        <p className="text-sm text-slate-500">
          La validación local de cédula no acredita nacionalidad, identidad ni habilitación
          electoral.
        </p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/encuesta"
          className="rounded-xl border border-blue-200 bg-blue-600 px-6 py-5 text-left text-white shadow-sm transition hover:bg-blue-700"
        >
          <div className="text-lg font-semibold">Responder encuesta</div>
          <div className="mt-1 text-sm text-blue-100">
            Acceso público (/encuesta). Ingreso con cédula y participación protegida.
          </div>
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="text-lg font-semibold text-slate-900">Ingreso interno</div>
          <div className="mt-1 text-sm text-slate-600">
            Acceso para encuestadores y administración (/login).
          </div>
        </Link>
      </div>

      <div className="text-xs text-slate-500">
        Entorno de desarrollo local. No recopilar intención de voto real sin revisiones legales y operativas.
      </div>
    </main>
  );
}