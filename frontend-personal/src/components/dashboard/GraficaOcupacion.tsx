import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MetricasHistorial } from '../../streams/dashboard.stream';
import { IconChart } from '../shared/Icons';

interface GraficaOcupacionProps {
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
            {entry.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraficaOcupacion({ historial }: GraficaOcupacionProps) {
  if (historial.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full bg-blue-100" />
          <p className="text-sm text-slate-400 font-medium">Esperando datos de ocupación...</p>
          <p className="text-[10px] text-slate-300 mt-1">Conectando vía WebSocket</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <IconChart size={14} />
          </span>
          Ocupación en Tiempo Real
        </h3>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-100">
          Últimos {historial.length} min
        </span>
      </div>

      <ResponsiveContainer width="100%" height={270}>
        <AreaChart
          data={[...historial]}
          margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradOcupacion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="ocupacion"
            name="Ocupación"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#gradOcupacion)"
            animationDuration={500}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 0,
              fill: '#3b82f6',
              className: 'drop-shadow-md',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {historial.length > 0 && (
        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Actual: {historial[historial.length - 1]!.ocupacion.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Disp: {historial[historial.length - 1]!.disponibles}
          </span>
        </div>
      )}
    </div>
  );
}
