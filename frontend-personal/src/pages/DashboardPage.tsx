// ═══════════════════════════════════════════════════════════
// HotelFlux — DashboardPage v4 (Premium UI + Live System Health)
// Reactivo: useDashboardStream + useHabitacionStream + useSystemHealth
// Nuevo: panel de salud del sistema en tiempo real (BD + Redis + Backend)
//        resumen operativo del día, indicadores de tendencia
// Rol: admin, mantenimiento
// ═══════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStream } from '../hooks/useDashboardStream';
import { useHabitacionStream } from '../hooks/useHabitacionStream';
import { useSystemHealth, formatUptime, type SystemHealth, type ServiceStatus } from '../hooks/useSystemHealth';
import MetricasCards from '../components/dashboard/MetricasCards';
import GraficaOcupacion from '../components/dashboard/GraficaOcupacion';
import GraficaIngresos from '../components/dashboard/GraficaIngresos';
import EventosRecientes from '../components/dashboard/EventosRecientes';
import LeyendaEstados from '../components/habitaciones/LeyendaEstados';
import {
  IconDashboard,
  IconLive,
  IconRecepcion,
  IconReservas,
  IconLimpieza,
  IconAnalitica,
  IconAuditoria,
  IconPersonal,
  IconShield,
  IconCheck,
  IconRefresh,
  IconActivity,
  IconClock,
  IconWarning,
  IconSuccess,
  IconError,
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
  { label: 'Recepción', description: 'Mapa de habitaciones', path: '/admin/recepcion', icon: IconRecepcion, color: 'from-blue-500 to-blue-600',    roles: ['admin', 'recepcionista'] },
  { label: 'Reservas',  description: 'Gestionar reservas',   path: '/admin/reservas',  icon: IconReservas,  color: 'from-cyan-500 to-cyan-600',    roles: ['admin', 'recepcionista'] },
  { label: 'Limpieza',  description: 'Tareas pendientes',    path: '/admin/limpieza',  icon: IconLimpieza,  color: 'from-amber-500 to-amber-600',  roles: ['admin', 'limpieza'] },
  { label: 'Analítica', description: 'Reportes y métricas',  path: '/admin/analitica', icon: IconAnalitica, color: 'from-purple-500 to-purple-600', roles: ['admin'] },
  { label: 'Personal',  description: 'Gestión de empleados', path: '/admin/personal',  icon: IconPersonal,  color: 'from-indigo-500 to-indigo-600', roles: ['admin'] },
  { label: 'Auditoría', description: 'Historial OWASP/ISO',  path: '/admin/auditoria', icon: IconAuditoria, color: 'from-violet-500 to-violet-600', roles: ['admin'] },
] as const;

// ── Helpers de estado de servicio ──

function statusDot(status: ServiceStatus): string {
  if (status === 'ok')      return 'bg-emerald-400 shadow-emerald-400/60 shadow-sm';
  if (status === 'error')   return 'bg-red-400 shadow-red-400/60 shadow-sm';
  return 'bg-slate-300';
}

function statusLabel(status: ServiceStatus): { text: string; cls: string } {
  if (status === 'ok')    return { text: 'Operativo',  cls: 'text-emerald-600' };
  if (status === 'error') return { text: 'Error',      cls: 'text-red-600' };
  return                         { text: 'Verificando', cls: 'text-slate-400' };
}

function latencyBadge(ms: number): { text: string; cls: string } {
  if (ms < 0)    return { text: '—',           cls: 'text-slate-400' };
  if (ms < 10)   return { text: `${ms}ms`,     cls: 'text-emerald-600 font-semibold' };
  if (ms < 100)  return { text: `${ms}ms`,     cls: 'text-emerald-600' };
  if (ms < 500)  return { text: `${ms}ms`,     cls: 'text-amber-600' };
  return                { text: `${ms}ms`,     cls: 'text-red-600 font-semibold' };
}

// ── Panel de salud del sistema en tiempo real ──

function SystemHealthPanel({ health, onRefresh }: { health: SystemHealth; onRefresh: () => void }) {
  const overallIcon =
    health.overall === 'ok'       ? <IconSuccess size={15} className="text-emerald-500" /> :
    health.overall === 'degraded' ? <IconWarning size={15} className="text-amber-500"  /> :
    health.overall === 'down'     ? <IconError   size={15} className="text-red-500"    /> :
                                    <IconActivity size={15} className="text-slate-400" />;

  const overallBg =
    health.overall === 'ok'       ? 'bg-emerald-50/70 ring-emerald-200' :
    health.overall === 'degraded' ? 'bg-amber-50/70   ring-amber-200'   :
    health.overall === 'down'     ? 'bg-red-50/70     ring-red-200'     :
                                    'bg-slate-50/70   ring-slate-200';

  const overallText =
    health.overall === 'ok'       ? 'Todos los sistemas operativos' :
    health.overall === 'degraded' ? 'Sistema degradado'             :
    health.overall === 'down'     ? 'Sistema no disponible'         :
                                    'Verificando…';

  const SERVICES = [
    { key: 'backend' as const,  label: 'Backend API',  info: health.services.backend  },
    { key: 'database' as const, label: 'PostgreSQL',   info: health.services.database },
    { key: 'redis' as const,    label: 'Redis Cache',  info: health.services.redis    },
  ];

  const lastCheckedStr = health.lastChecked
    ? health.lastChecked.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <IconShield size={15} className="text-indigo-500" />
          Salud del Sistema
        </h3>
        <button
          onClick={onRefresh}
          disabled={health.checking}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
          title="Actualizar ahora"
        >
          <IconRefresh size={11} className={health.checking ? 'animate-spin' : ''} />
          {lastCheckedStr ?? 'Cargando…'}
        </button>
      </div>

      {/* Overall status banner */}
      <div className={clsx('mx-4 mb-3 flex items-center gap-2 rounded-xl px-3 py-2 ring-1', overallBg)}>
        {overallIcon}
        <span className="text-xs font-semibold text-slate-700">{overallText}</span>
        {health.uptime_seconds > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
            <IconClock size={10} />
            {formatUptime(health.uptime_seconds)}
          </span>
        )}
      </div>

      {/* Per-service rows */}
      <div className="space-y-1 px-4 pb-4">
        {SERVICES.map(({ key, label, info }) => {
          const { text: slText, cls: slCls } = statusLabel(info.status);
          const lat = latencyBadge(info.latency_ms);
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-xs text-slate-600">
                <span className={clsx('h-2 w-2 rounded-full', statusDot(info.status))} />
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span className={clsx('text-[10px] font-medium', lat.cls)}>{lat.text}</span>
                <span className={clsx('text-[10px] font-semibold', slCls)}>{slText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* OWASP compliance footer */}
      <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
        {[
          { label: 'OWASP Top 10', ok: true },
          { label: 'Rate Limit',   ok: health.services.redis.status !== 'error' },
          { label: 'Audit Log',    ok: health.overall !== 'down' },
          { label: 'JWT Blacklist', ok: health.services.redis.status !== 'error' },
        ].map(({ label, ok }) => (
          <span
            key={label}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              ok ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                 : 'bg-red-50 text-red-700 ring-1 ring-red-200'
            )}
          >
            {ok ? <IconCheck size={9} /> : <IconWarning size={9} />}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Resumen operativo del día ──

interface ResumenItemProps {
  value: number | string;
  label: string;
  sublabel?: string;
  colorDot: string;
  urgent?: boolean;
}

function ResumenItem({ value, label, sublabel, colorDot, urgent }: ResumenItemProps) {
  return (
    <div className={clsx(
      'flex flex-col gap-0.5 rounded-xl px-4 py-3',
      urgent && Number(value) > 0
        ? 'bg-amber-50 ring-1 ring-amber-200'
        : 'bg-slate-50 ring-1 ring-slate-100'
    )}>
      <div className="flex items-center gap-1.5">
        <span className={clsx('h-2 w-2 rounded-full', colorDot)} />
        <span className={clsx(
          'text-xl font-extrabold tabular-nums',
          urgent && Number(value) > 0 ? 'text-amber-700' : 'text-slate-800'
        )}>{value}</span>
      </div>
      <p className="text-[11px] font-medium text-slate-600">{label}</p>
      {sublabel && <p className="text-[10px] text-slate-400">{sublabel}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DashboardPage principal
// ══════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { metricas, historial, eventos, kpis } = useDashboardStream();
  const { conteo } = useHabitacionStream();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { health, refresh } = useSystemHealth(30_000);

  const actionsForRole = QUICK_ACTIONS.filter(
    (a) => usuario && a.roles.includes(usuario.rol),
  );

  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // KPIs numéricos formateados
  const ingresosHoy = parseFloat(metricas.ingresos_hoy || '0');
  const ingresosFmt = ingresosHoy >= 1000
    ? `S/ ${(ingresosHoy / 1000).toFixed(1)}k`
    : `S/ ${ingresosHoy.toFixed(0)}`;

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
            <p className="mt-0.5 text-sm text-slate-500 capitalize">{hoy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de salud general (mini) — espacio reservado */}
          <span className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1',
            health.overall === 'unknown' && 'invisible',
            health.overall === 'ok'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : health.overall === 'degraded'
                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                : 'bg-red-50 text-red-700 ring-red-200'
          )}>
            <span className={clsx(
              'h-1.5 w-1.5 rounded-full',
              health.overall === 'ok' ? 'bg-emerald-500 animate-pulse' :
              health.overall === 'degraded' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
            )} />
            {health.overall === 'ok' ? 'Sistema OK' : health.overall === 'degraded' ? 'Degradado' : 'Sin conexión'}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <IconLive size={12} className="text-emerald-500" />
              En vivo
            </span>
        </div>
      </div>

      {/* ── Resumen operativo del día ── */}
      <div className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          Resumen Operativo — Hoy
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumenItem
            value={metricas.checkins_hoy}
            label="Check-ins realizados"
            sublabel="desde las 00:00"
            colorDot="bg-blue-400"
          />
          <ResumenItem
            value={metricas.checkouts_hoy}
            label="Check-outs realizados"
            sublabel="desde las 00:00"
            colorDot="bg-cyan-400"
          />
          <ResumenItem
            value={metricas.en_limpieza}
            label="Habs. en limpieza"
            sublabel="ahora mismo"
            colorDot="bg-amber-400"
            urgent
          />
          <ResumenItem
            value={ingresosFmt}
            label="Ingresos del día"
            sublabel={`RevPAR: S/ ${kpis.revpar.toFixed(0)}`}
            colorDot="bg-emerald-400"
          />
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

      {/* ── Eventos + Leyenda + Panel de salud ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <EventosRecientes eventos={eventos} />
        </div>

        <div className="space-y-5">
          {/* Leyenda de estados */}
          <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <LeyendaEstados conteo={conteo} />
          </div>

          {/* Panel de salud del sistema (solo admin) — datos reales */}
          {usuario?.rol === 'admin' && (
            <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <SystemHealthPanel health={health} onRefresh={refresh} />
              {/* Enlace a auditoría */}
              <button
                onClick={() => navigate('/admin/auditoria')}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 py-2.5 text-xs font-semibold text-violet-600 ring-1 ring-violet-100 transition-colors hover:from-violet-100 hover:to-indigo-100"
              >
                <IconAuditoria size={13} />
                Ver Auditoría Completa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
