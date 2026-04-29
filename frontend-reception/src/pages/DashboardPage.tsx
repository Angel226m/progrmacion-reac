// ═══════════════════════════════════════════════════════════
// HotelFlux — DashboardPage (métricas + acciones rápidas — Premium UI)
// Compone: MetricasCards + GraficaOcupacion + GraficaIngresos + Eventos
// Reactivo: datos vía useDashboardStream (RxJS → React)
// Nuevo: acciones rápidas, resumen del día, estado de seguridad
// Rol: admin, mantenimiento
// ═══════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStream } from '../hooks/useDashboardStream';
import { useHabitacionStream } from '../hooks/useHabitacionStream';
import { isOfflineMode } from '../services/api';
import MetricasCards from '../components/dashboard/MetricasCards';
import GraficaOcupacion from '../components/dashboard/GraficaOcupacion';
import GraficaIngresos from '../components/dashboard/GraficaIngresos';
import EventosRecientes from '../components/dashboard/EventosRecientes';
import LeyendaEstados from '../components/habitaciones/LeyendaEstados';
import {
  IconDashboard,
  IconLive,
  IconOffline,
  IconRecepcion,
  IconReservas,
  IconLimpieza,
  IconAnalitica,
  IconAuditoria,
  IconPersonal,
  IconShield,
  IconCheck,
} from '../components/shared/Icons';
import clsx from 'clsx';

// ── Acciones rápidas según rol ──

interface QuickAction {
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly icon: React.FC<{ size?: number; className?: string }>;
  readonly color: string;
  readonly roles: readonly string[];
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Recepción', description: 'Mapa de habitaciones', path: '/admin/recepcion', icon: IconRecepcion, color: 'from-blue-500 to-blue-600', roles: ['admin', 'recepcionista'] },
  { label: 'Reservas', description: 'Gestionar reservas', path: '/admin/reservas', icon: IconReservas, color: 'from-cyan-500 to-cyan-600', roles: ['admin', 'recepcionista'] },
  { label: 'Limpieza', description: 'Tareas pendientes', path: '/admin/limpieza', icon: IconLimpieza, color: 'from-amber-500 to-amber-600', roles: ['admin', 'limpieza'] },
  { label: 'Analítica', description: 'Reportes y métricas', path: '/admin/analitica', icon: IconAnalitica, color: 'from-purple-500 to-purple-600', roles: ['admin'] },
  { label: 'Personal', description: 'Gestión de empleados', path: '/admin/personal', icon: IconPersonal, color: 'from-indigo-500 to-indigo-600', roles: ['admin'] },
  { label: 'Auditoría', description: 'Historial OWASP/ISO', path: '/admin/auditoria', icon: IconAuditoria, color: 'from-violet-500 to-violet-600', roles: ['admin'] },
] as const;

export default function DashboardPage() {
  const { metricas, historial, eventos, kpis } = useDashboardStream();
  const { conteo } = useHabitacionStream();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const actionsForRole = QUICK_ACTIONS.filter(
    (a) => usuario && a.roles.includes(usuario.rol),
  );

  // Fecha actual formateada
  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="p-6 lg:p-8">
      {/* ── Header con saludo ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <IconDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Hola, {usuario?.nombre?.split(' ')[0] ?? 'Usuario'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 capitalize">
              {hoy}
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

      {/* ── Acciones Rápidas ── */}
      {actionsForRole.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Acceso Rápido</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {actionsForRole.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-blue-200"
              >
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white transition-transform group-hover:scale-110', action.color)}>
                  <action.icon size={18} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700">{action.label}</p>
                  <p className="text-[10px] text-slate-400">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="mb-6 animate-fade-in-up">
        <MetricasCards metricas={metricas} kpis={kpis} />
      </div>

      {/* ── Gráficas ── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <GraficaOcupacion historial={historial} />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <GraficaIngresos historial={historial} />
        </div>
      </div>

      {/* ── Eventos + Leyenda + Estado de seguridad ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <EventosRecientes eventos={eventos} />
        </div>
        <div className="space-y-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <LeyendaEstados conteo={conteo} />
          </div>

          {/* Mini panel de seguridad (solo admin) */}
          {usuario?.rol === 'admin' && (
            <div className="animate-fade-in-up rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" style={{ animationDelay: '500ms' }}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <IconShield size={16} className="text-emerald-500" />
                Estado de Seguridad
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'OWASP Top 10', status: '10/10 activos' },
                  { label: 'Rate Limiting', status: 'Redis OK' },
                  { label: 'Audit Logging', status: 'ISO 27001' },
                  { label: 'JWT + Lockout', status: 'NIST 800-63B' },
                ].map(({ label, status }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-emerald-50/50 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-600">
                      <IconCheck size={12} className="text-emerald-500" />
                      {label}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">{status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/admin/auditoria')}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-100"
              >
                <IconAuditoria size={14} />
                Ver Auditoría Completa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
