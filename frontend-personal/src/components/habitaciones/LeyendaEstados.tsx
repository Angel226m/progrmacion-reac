// ═══════════════════════════════════════════════════════════
// HotelFlux — LeyendaEstados (leyenda del mapa de habitaciones)
// Componente funcional puro
// ═══════════════════════════════════════════════════════════

import type { ConteoEstados, EstadoHabitacion } from '../../domain/types';
import { CLASE_ESTADO, LABEL_ESTADO } from '../../domain/types';

interface LeyendaEstadosProps {
  readonly conteo: ConteoEstados;
}

// Función pura: lista de estados a mostrar
const ESTADOS: readonly EstadoHabitacion[] = [
  'disponible',
  'reservada',
  'ocupada',
  'en_limpieza',
  'en_mantenimiento',
  'bloqueada',
] as const;

export default function LeyendaEstados({ conteo }: LeyendaEstadosProps) {
  const total = ESTADOS.reduce((sum, e) => sum + (conteo[e] ?? 0), 0);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        Estado de Habitaciones
      </h3>
      <div className="space-y-2">
        {ESTADOS.map((estado) => {
          const count = conteo[estado] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={estado} className="flex items-center gap-3">
              {/* [TAILWIND v4] Usa clase semántica del @theme en lugar de inline style */}
              <span
                className={`h-3 w-3 rounded-full ${CLASE_ESTADO[estado]}`}
              />
              <span className="flex-1 text-xs text-slate-600">
                {LABEL_ESTADO[estado]}
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {count}
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${CLASE_ESTADO[estado]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2 text-right">
        <span className="text-xs text-slate-500">Total: </span>
        <span className="text-sm font-bold text-slate-800">{total}</span>
      </div>
    </div>
  );
}
