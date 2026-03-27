import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  dashboard,
  exportar,
  type MetricasAdmin,
  type Periodo,
} from '../services/admin.api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ═══════════════════════════════════════════════════════════
// AnaliticaPage — Dashboard analítico avanzado por período
// Gráficos interactivos con Recharts + exportación CSV
// Solo admin/gerente
// ═══════════════════════════════════════════════════════════

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'dia', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'anual', label: 'Año' },
];

const COLORES = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnaliticaPage() {
  const { token } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [reservasData, setReservasData] = useState<Array<Record<string, unknown>>>([]);
  const [ingresosData, setIngresosData] = useState<{ diario: Array<Record<string, unknown>>; resumen: Record<string, string> } | null>(null);
  const [productosData, setProductosData] = useState<{ top_productos: Array<Record<string, unknown>>; por_categoria: Array<Record<string, unknown>> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fuente, setFuente] = useState<string>('');

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [mRes, rRes, iRes, pRes] = await Promise.all([
        dashboard.metricas(token, periodo),
        dashboard.reservas(token, periodo),
        dashboard.ingresos(token, periodo),
        dashboard.productos(token, periodo),
      ]);
      setMetricas(mRes.data);
      setFuente(mRes.fuente);
      setReservasData(rRes.data);
      setIngresosData(iRes.data);
      setProductosData(pRes.data);
    } catch {
      // Modo offline
    } finally {
      setLoading(false);
    }
  }, [token, periodo]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard Analítico</h1>
            <p className="text-sm text-gray-500 mt-1">
              Métricas en tiempo real del hotel
              {fuente && <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full">{fuente === 'cache' ? '⚡ Caché' : '🔄 BD'}</span>}
            </p>
          </div>

          {/* Selector de período */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-1">Período:</span>
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  periodo === p.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPIs */}
          {metricas && <KPICards metricas={metricas} />}

          {/* Gráficos en grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ingresos diarios */}
            {ingresosData && (
              <ChartCard title="💰 Ingresos Diarios" onExport={() => exportar.ingresos(token!, periodo)}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ingresosData.diario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="monto" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                {ingresosData.resumen && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                    <ResumenItem label="Reservas" value={`$${ingresosData.resumen.ingresos_reservas}`} />
                    <ResumenItem label="Consumos" value={`$${ingresosData.resumen.ingresos_consumos}`} />
                    <ResumenItem label="Total" value={`$${ingresosData.resumen.total}`} highlight />
                  </div>
                )}
              </ChartCard>
            )}

            {/* Reservas por día */}
            {reservasData.length > 0 && (
              <ChartCard title="📋 Reservas" onExport={() => exportar.reservas(token!, periodo)}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reservasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="confirmadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="checked_in" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Productos populares */}
            {productosData && productosData.top_productos.length > 0 && (
              <ChartCard title="🏆 Top Productos">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productosData.top_productos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="total_vendido" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Ventas por categoría */}
            {productosData && productosData.por_categoria.length > 0 && (
              <ChartCard title="📦 Ventas por Categoría">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productosData.por_categoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="total"
                      nameKey="categoria"
                      label={({ categoria, total }) => `${categoria}: ${total}`}
                    >
                      {productosData.por_categoria.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Ocupación visual */}
          {metricas && <OcupacionVisual metricas={metricas} />}
        </div>
      )}
    </div>
  );
}

// ── KPI Cards ──

function KPICards({ metricas }: { metricas: MetricasAdmin }) {
  const kpis = [
    {
      label: 'Ocupación',
      value: `${metricas.ocupacion.porcentaje}%`,
      sub: `${metricas.ocupacion.ocupadas}/${metricas.ocupacion.total} hab.`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      icon: '🏨',
    },
    {
      label: 'Ingresos Totales',
      value: `$${metricas.ingresos.total}`,
      sub: `Reservas: $${metricas.ingresos.ingresos_reservas}`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: '💰',
    },
    {
      label: 'Reservas',
      value: String(metricas.reservas.total),
      sub: `${metricas.reservas.confirmadas} confirmadas`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: '📋',
    },
    {
      label: 'Limpieza Promedio',
      value: `${metricas.limpieza.promedio_minutos} min`,
      sub: `${metricas.limpieza.completadas} completadas`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: '🧹',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-2xl">{kpi.icon}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${kpi.bg} ${kpi.color} font-medium`}>
              {kpi.label}
            </span>
          </div>
          <div className={`text-3xl font-bold mt-3 ${kpi.color}`}>{kpi.value}</div>
          <div className="text-sm text-gray-400 mt-1">{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Chart Card ──

function ChartCard({ title, children, onExport }: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            📥 CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Resumen Item ──

function ResumenItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`text-center flex-1 ${highlight ? 'px-3 py-1.5 bg-indigo-50 rounded-lg' : ''}`}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-gray-700'}`}>{value}</div>
    </div>
  );
}

// ── Ocupación Visual ──

function OcupacionVisual({ metricas }: { metricas: MetricasAdmin }) {
  const total = metricas.ocupacion.total;
  const ocu = metricas.ocupacion.ocupadas;
  const disp = metricas.ocupacion.disponibles;
  const pct = metricas.ocupacion.porcentaje;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-4">🏨 Ocupación del Hotel</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="50" cy="50" r="40"
              fill="none" stroke="#6366f1" strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${pct * 2.51} ${251 - pct * 2.51}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          <MetricBox label="Total" value={total} color="bg-gray-100 text-gray-800" />
          <MetricBox label="Ocupadas" value={ocu} color="bg-red-50 text-red-600" />
          <MetricBox label="Disponibles" value={disp} color="bg-green-50 text-green-600" />
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}
