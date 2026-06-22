import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  dashboard,
  exportar,
  type MetricasAdmin,
  type Periodo,
} from '../services/admin.api';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, AreaChart, LineChart, Line,
} from 'recharts';
import { fromPromise, fold, toError, type Result } from '../domain/result';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'dia',       label: 'Hoy' },
  { value: 'semana',    label: '7 días' },
  { value: 'mes',       label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre',  label: 'Semestre' },
  { value: 'anual',     label: 'Anual' },
];

const PALETTE = {
  primary:   '#1e40af',
  gold:      '#c5a255',
  goldLight: '#e8d5a3',
  navy:      '#0c1d3d',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  info:      '#06b6d4',
  purple:    '#8b5cf6',
  slate:     '#64748b',
};

const CHART_COLORS = [
  PALETTE.primary, PALETTE.gold, PALETTE.success,
  PALETTE.info, PALETTE.purple, PALETTE.danger,
];

const OCCUPANCY_COLORS = [
  { min: 90, color: PALETTE.danger },
  { min: 70, color: PALETTE.warning },
  { min: 40, color: PALETTE.success },
  { min: 0,  color: PALETTE.primary },
] as const;

function PremiumTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  return !active || !payload?.length ? null : (
    <div className="rounded-2xl border border-white/30 bg-white/95 p-4 shadow-2xl backdrop-blur-sm min-w-[160px]">
      {label && <p className="text-xs font-bold text-slate-500 mb-2 pb-2 border-b border-slate-100">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm py-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-500 text-xs">{entry.name}:</span>
          <span className="font-bold text-slate-900 ml-auto pl-3">
            {typeof entry.value === 'number' && entry.value > 1000
              ? `$${entry.value.toLocaleString('es-PE')}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrendBadge({ pct, inverse = false }: { pct: number | null | undefined; inverse?: boolean }) {
  const isPositive = inverse ? (pct ?? 0) < 0 : (pct ?? 0) > 0;
  return pct == null ? null : pct === 0 ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
      <span>→</span> 0%
    </span>
  ) : (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
      isPositive
        ? 'text-emerald-700 bg-emerald-100'
        : 'text-red-700 bg-red-100'
    }`}>
      <span>{isPositive ? '↑' : '↓'}</span>
      {Math.abs(pct)}%
    </span>
  );
}

function Sparkline({ data, color = PALETTE.primary }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return !data?.length ? null : (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function AnaliticaPage() {
  const { token } = useAuth();
  const [periodo, setPeriodo]           = useState<Periodo>('mes');
  const [metricas, setMetricas]         = useState<MetricasAdmin | null>(null);
  const [reservasData, setReservasData] = useState<Array<Record<string, unknown>>>([]);
  const [ingresosData, setIngresosData] = useState<{
    diario: Array<Record<string, unknown>>;
    resumen: Record<string, string>;
  } | null>(null);
  const [productosData, setProductosData] = useState<{
    top_productos: Array<Record<string, unknown>>;
    por_categoria: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [fuente, setFuente]     = useState<string>('');
  const [lastLoad, setLastLoad] = useState<Date | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const result: Result<[unknown, unknown, unknown, unknown], Error> = await fromPromise(
      Promise.all([
        dashboard.metricas(token ?? '', periodo),
        dashboard.reservas(token ?? '', periodo),
        dashboard.ingresos(token ?? '', periodo),
        dashboard.productos(token ?? '', periodo),
      ]) as Promise<[unknown, unknown, unknown, unknown]>,
      toError,
    );
    fold(
      ([mRes, rRes, iRes, pRes]: [unknown, unknown, unknown, unknown]) => {
        const m = mRes as { data: unknown; fuente: string };
        const r = rRes as { data: unknown };
        const i = iRes as { data: unknown };
        const p = pRes as { data: unknown };
        setMetricas(m.data as MetricasAdmin | null);
        setFuente(m.fuente as string);
        setReservasData(r.data as Record<string, unknown>[]);
        setIngresosData(i.data as { diario: Record<string, unknown>[]; resumen: Record<string, string> } | null);
        setProductosData(p.data as { top_productos: Record<string, unknown>[]; por_categoria: Record<string, unknown>[] } | null);
        setLastLoad(new Date());
      },
      () => {},
    )(result);
    setLoading(false);
  }, [token, periodo]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    const id = setInterval(cargarDatos, 60_000);
    return () => clearInterval(id);
  }, [cargarDatos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">

      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-5 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c1d3d] to-[#1e3a5f] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-5 h-5 text-[#c5a255]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard Analítico</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-slate-400">Métricas — Base de datos real</p>
                {fuente && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    fuente === 'cache'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${fuente === 'cache' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {fuente === 'cache' ? 'Caché Redis' : 'PostgreSQL'}
                  </span>
                )}
                {lastLoad && (
                  <span className="text-[11px] text-slate-300">
                    Actualizado {lastLoad.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0c1d3d] px-3 py-2 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>

            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    periodo === p.value
                      ? 'bg-[#0c1d3d] text-[#c5a255] shadow-md'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-[#c5a255]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-[#c5a255] border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Cargando métricas desde BD...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-6 space-y-7">

          {metricas && <KPICards metricas={metricas} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {ingresosData && ingresosData.diario.length > 0 && (
              <ChartCard
                title="Ingresos Diarios"
                subtitle={`Total: S/ ${ingresosData.resumen?.total ?? '—'}`}
                icon="💰"
                onExport={() => exportar.ingresos(token!, periodo)}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={ingresosData.diario} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ingresoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.primary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<PremiumTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="monto"
                      name="Ingresos"
                      stroke={PALETTE.primary}
                      strokeWidth={2.5}
                      fill="url(#ingresoGrad)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: PALETTE.primary }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {ingresosData.resumen && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <ResumenItem label="Reservas"  value={`S/ ${ingresosData.resumen.ingresos_reservas}`} />
                    <ResumenItem label="Consumos"  value={`S/ ${ingresosData.resumen.ingresos_consumos}`} />
                    <ResumenItem label="Total"     value={`S/ ${ingresosData.resumen.total}`} highlight />
                  </div>
                )}
              </ChartCard>
            )}

            {reservasData.length > 0 && (
              <ChartCard
                title="Reservas por Estado"
                subtitle="Evolución en el período"
                icon="📅"
                onExport={() => exportar.reservas(token!, periodo)}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={reservasData} barSize={16} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<PremiumTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }} />
                    <Bar dataKey="confirmadas" name="Confirmadas" fill={PALETTE.success}  radius={[3, 3, 0, 0]} />
                    <Bar dataKey="checked_in"  name="Check-in"   fill={PALETTE.primary}  radius={[3, 3, 0, 0]} />
                    <Bar dataKey="canceladas"  name="Canceladas" fill={PALETTE.danger}   radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {productosData && productosData.top_productos.length > 0 && (
              <ChartCard
                title="Top Productos más Vendidos"
                subtitle="Unidades vendidas en el período"
                icon="🛒"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={productosData.top_productos} layout="vertical" barSize={12} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={130} axisLine={false} tickLine={false} />
                    <Tooltip content={<PremiumTooltip />} />
                    <Bar dataKey="total_vendido" name="Vendidos" radius={[0, 5, 5, 0]}>
                      {productosData.top_productos.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {productosData && productosData.por_categoria.length > 0 && (
              <ChartCard
                title="Ventas por Categoría"
                subtitle="Distribución de ingresos"
                icon="🥧"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={productosData.por_categoria}
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="categoria"
                    >
                      {productosData.por_categoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }}
                      formatter={(value) => <span className="text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {metricas && <OcupacionVisual metricas={metricas} />}

          {reservasData.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-bold text-slate-800">Resumen de Actividad del Período</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmadas</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Check-in</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Canceladas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reservasData as Array<{ fecha?: string; confirmadas?: number; checked_in?: number; canceladas?: number }>)
                      .slice(-7)
                      .reverse()
                      .map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{row.fecha}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              {row.confirmadas ?? 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              {row.checked_in ?? 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {row.canceladas ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function KPICards({ metricas }: { metricas: MetricasAdmin }) {
  const kpis: Array<{
    label: string;
    value: string;
    sub: string;
    gradient: string;
    accent: string;
    icon: React.ReactNode;
    trend?: number | null;
    sparkData?: number[];
    trendInverse?: boolean;
  }> = [
    {
      label:    'Tasa de Ocupación',
      value:    `${metricas.ocupacion.porcentaje}%`,
      sub:      `${metricas.ocupacion.ocupadas} de ${metricas.ocupacion.total} hab.`,
      gradient: 'from-[#0c1d3d] to-[#1e3a5f]',
      accent:   '#c5a255',
      trend:    (metricas as unknown as Record<string, unknown>).trend_ocupacion as number | undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label:    'Ingresos Totales',
      value:    `S/ ${metricas.ingresos.total}`,
      sub:      `Reservas: S/ ${metricas.ingresos.ingresos_reservas}`,
      gradient: 'from-emerald-700 to-emerald-500',
      accent:   '#a7f3d0',
      trend:    (metricas as unknown as Record<string, unknown>).trend_ingresos as number | undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label:    'Reservas',
      value:    String(metricas.reservas.total),
      sub:      `${metricas.reservas.confirmadas} confirmadas activas`,
      gradient: 'from-blue-700 to-blue-500',
      accent:   '#bfdbfe',
      trend:    (metricas as unknown as Record<string, unknown>).trend_reservas as number | undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label:        'Tiempo Limpieza',
      value:        `${metricas.limpieza.promedio_minutos} min`,
      sub:          `${metricas.limpieza.completadas} tareas completadas`,
      gradient:     'from-amber-700 to-amber-500',
      accent:       '#fde68a',
      trendInverse: true,
      trend:        (metricas as unknown as Record<string, unknown>).trend_limpieza as number | undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${kpi.gradient} p-5 text-white shadow-lg animate-fade-in-up`}
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <div className="absolute inset-0 bg-white/[0.03] pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center" style={{ color: kpi.accent }}>
              {kpi.icon}
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-3xl font-black tracking-tight leading-none" style={{ color: kpi.accent }}>
                {kpi.value}
              </div>
              {kpi.trend !== undefined && (
                <TrendBadge pct={kpi.trend} inverse={kpi.trendInverse} />
              )}
            </div>
          </div>

          {kpi.sparkData && kpi.sparkData.length > 2 && (
            <div className="mb-2 opacity-60">
              <Sparkline data={kpi.sparkData} color={kpi.accent} />
            </div>
          )}

          <div className="relative">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">{kpi.label}</p>
            <p className="text-xs text-white/50 mt-0.5">{kpi.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  onExport,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-2.5">
          {icon && <span className="text-lg leading-none mt-0.5">{icon}</span>}
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0c1d3d] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ResumenItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex-1 text-center rounded-xl py-2.5 px-3 ${
      highlight ? 'bg-[#0c1d3d] text-white' : 'bg-slate-50 text-slate-700'
    }`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${highlight ? 'text-[#c5a255]' : 'text-slate-400'}`}>
        {label}
      </div>
      <div className={`text-sm font-black mt-0.5 ${highlight ? 'text-[#e8d5a3]' : 'text-slate-700'}`}>
        {value}
      </div>
    </div>
  );
}

function OcupacionVisual({ metricas }: { metricas: MetricasAdmin }) {
  const total     = metricas.ocupacion.total;
  const ocu       = metricas.ocupacion.ocupadas;
  const disp      = metricas.ocupacion.disponibles;
  const pct       = metricas.ocupacion.porcentaje;
  const reservadas = Math.max(0, total - ocu - disp);
  const circumference = 2 * Math.PI * 38;

  const occupancyColor = OCCUPANCY_COLORS.find((e) => pct >= e.min)!.color;

  const cleaningPct   = total > 0 ? Math.round((metricas.ocupacion.total - ocu - disp) / total * 100) : 0;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="text-lg">🏨</span>
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Ocupación del Hotel</h3>
          <p className="text-xs text-slate-400">Distribución en tiempo real</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">

        <div className="relative w-44 h-44 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="38"
              fill="none"
              stroke={occupancyColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(ocu / total) * circumference} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            {reservadas > 0 && (
              <circle
                cx="50" cy="50" r="38"
                fill="none"
                stroke={PALETTE.warning}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(reservadas / total) * circumference} ${circumference}`}
                strokeDashoffset={-((ocu / total) * circumference)}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-800">{pct}%</span>
            <span className="text-xs text-slate-400 font-medium">ocupado</span>
            <span className="text-[10px] text-slate-300 mt-0.5">{ocu}/{total} habs.</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          <StatBox label="Total"       value={total}      color="border-slate-200 bg-slate-50 text-slate-700" />
          <StatBox label="Ocupadas"    value={ocu}        color="border-red-100 bg-red-50 text-red-700" />
          <StatBox label="Disponibles" value={disp}       color="border-emerald-100 bg-emerald-50 text-emerald-700" />
          <StatBox label="Reservadas"  value={reservadas}  color="border-amber-100 bg-amber-50 text-amber-700" />
        </div>

        <div className="w-full md:w-64 space-y-3.5 flex-shrink-0">
          <ProgressBar label="Ocupadas"    value={ocu}        total={total} color="bg-red-400" />
          <ProgressBar label="Disponibles" value={disp}       total={total} color="bg-emerald-400" />
          {reservadas > 0 && (
            <ProgressBar label="Reservadas" value={reservadas} total={total} color="bg-amber-400" />
          )}
        </div>
      </div>

      {metricas.limpieza && (
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-slate-800">{metricas.limpieza.completadas}</p>
            <p className="text-xs text-slate-400 mt-0.5">Limpiezas completadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-800">{metricas.limpieza.promedio_minutos} min</p>
            <p className="text-xs text-slate-400 mt-0.5">Tiempo promedio</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: cleaningPct > 30 ? PALETTE.danger : PALETTE.success }}>
              {cleaningPct}%
            </p>
            <p className="text-xs text-slate-400 mt-0.5">No disponibles</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 text-center border ${color}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs mt-1 font-semibold opacity-60 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
        <span>{label}</span>
        <span className="font-bold">
          {value} <span className="text-slate-400 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
