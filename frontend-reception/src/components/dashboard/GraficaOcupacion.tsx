// ═══════════════════════════════════════════════════════════
// HotelFlux — GraficaOcupacion (Recharts area chart)
// Componente funcional puro: datos → gráfica
// Reactivo: los datos llegan vía RxJS stream → Recharts
// ═══════════════════════════════════════════════════════════

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

export default function GraficaOcupacion({ historial }: GraficaOcupacionProps) {
  if (historial.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Esperando datos de ocupación...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <IconChart size={16} className="text-blue-600" /> Ocupación en Tiempo Real
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={[...historial]}>
          <defs>
            <linearGradient id="gradOcupacion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Ocupación']}
          />
          <Area
            type="monotone"
            dataKey="ocupacion"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradOcupacion)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
