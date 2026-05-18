// ═══════════════════════════════════════════════════════════
// HotelFlux — GraficaIngresos (Recharts bar chart)
// Componente funcional puro: historial de ingresos
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

export default function GraficaIngresos({ historial }: GraficaIngresosProps) {
  if (historial.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Esperando datos de ingresos...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <IconMoney size={16} className="text-amber-500" />
        Ingresos en Tiempo Real
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={[...historial]}>
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `$${v}`} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
          />
          <Bar
            dataKey="ingresos"
            fill="url(#gradIngresos)"
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
