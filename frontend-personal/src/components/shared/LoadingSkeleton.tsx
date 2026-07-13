// ═══════════════════════════════════════════════════════════
// HotelFlux — LoadingSkeleton (esqueleto de carga para dashboard)
// Componente puro: solo renderiza placeholders animados
// ═══════════════════════════════════════════════════════════

export default function LoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
