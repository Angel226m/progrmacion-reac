// ═══════════════════════════════════════════════════════════
// HotelFlux — DashboardPage (métricas y gráficas — Premium UI)
// Compone: MetricasCards + GraficaOcupacion + GraficaIngresos + Eventos
// Reactivo: datos vía useDashboardStream (RxJS → React)
// Rol: admin, mantenimiento
// ═══════════════════════════════════════════════════════════

import { useDashboardStream } from '../hooks/useDashboardStream';
import { useHabitacionStream } from '../hooks/useHabitacionStream';
import { isOfflineMode } from '../services/api';
import MetricasCards from '../components/dashboard/MetricasCards';
import GraficaOcupacion from '../components/dashboard/GraficaOcupacion';
import GraficaIngresos from '../components/dashboard/GraficaIngresos';
import EventosRecientes from '../components/dashboard/EventosRecientes';
import LeyendaEstados from '../components/habitaciones/LeyendaEstados';
import { IconDashboard, IconLive, IconOffline } from '../components/shared/Icons';

export default function DashboardPage() {
  const { metricas, historial, eventos, kpis } = useDashboardStream();
  const { conteo } = useHabitacionStream();

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <IconDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Métricas en tiempo real — Datos reactivos vía WebSocket + RxJS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOfflineMode() ? (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              <IconOffline size={12} className="text-amber-500" />
              Demo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <IconLive size={12} className="text-emerald-500" />
              En vivo
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-8 animate-fade-in-up">
        <MetricasCards metricas={metricas} kpis={kpis} />
      </div>

      {/* Gráficas */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <GraficaOcupacion historial={historial} />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <GraficaIngresos historial={historial} />
        </div>
      </div>

      {/* Info adicional */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <EventosRecientes eventos={eventos} />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <LeyendaEstados conteo={conteo} />
        </div>
      </div>
    </div>
  );
}
