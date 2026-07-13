// ═══════════════════════════════════════════════════════════
// HotelFlux — GraficaIngresos (gráfica de ingresos en tiempo real)
// Componente funcional puro: bar chart con datos del historial
// ═══════════════════════════════════════════════════════════

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MetricasHistorial } from '../../streams/dashboard.stream';
import { IconMoney } from '../shared/Icons';

interface GraficaIngresosProps {
  readonly historial: readonly MetricasHistorial[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/30 bg-white/95 p-3 shadow-2xl backdrop-blur-sm min-w-[140px]">
      <p className="text-[10px] font-bold text-slate-500 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-bold text-slate-900 ml-auto">
            S/ {entry.value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraficaIngresos({ historial }: GraficaIngresosProps) {
  if (historial.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full bg-amber-100" />
          <p className="text-sm text-slate-400 font-medium">Esperando datos de ingresos...</p>
          <p className="text-[10px] text-slate-300 mt-1">Conectando vía WebSocket</p>
        </div>
      </div>
    );
  }

  const maxIngreso = Math.max(...historial.map((h) => h.ingresos), 1);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <IconMoney size={14} />
          </span>
          Ingresos en Tiempo Real
        </h3>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-100">
          S/ {historial[historial.length - 1]!.ingresos.toFixed(2)} total
        </span>
      </div>

      <ResponsiveContainer width="100%" height={270}>
        <BarChart
          data={[...historial]}
          margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `S/${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef3c7' }} />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill="url(#gradIngresos)"
            radius={[4, 4, 0, 0]}
            animationDuration={600}
            animationEasing="ease-out"
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>

      {historial.length > 0 && (
        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Máx: S/ {maxIngreso.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Ocup: {historial[historial.length - 1]!.ocupacion.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
