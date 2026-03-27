// ═══════════════════════════════════════════════════════════
// HotelFlux — TareaCard (Tarjeta de tarea de limpieza)
// Componente funcional puro: recibe tarea, renderiza
// Diseñado mobile-first para tablets del personal
// ═══════════════════════════════════════════════════════════

import type { TareaLimpieza, EstadoTarea } from '../../domain/types';
import { IconClock, IconLimpieza, IconCheck, IconStar, IconNotes } from '../shared/Icons';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface TareaCardProps {
  readonly tarea: TareaLimpieza;
  readonly onIniciar?: (tareaId: string) => void;
  readonly onCompletar?: (tareaId: string) => void;
}

// Función pura: configuración visual por estado
const CONFIG_ESTADO: Readonly<Record<EstadoTarea, { color: string; bg: string; icon: ReactNode; label: string }>> = {
  pendiente: {
    color: 'text-amber-700',
    bg: 'bg-amber-50 ring-amber-200',
    icon: <IconClock size={20} />,
    label: 'Pendiente',
  },
  en_proceso: {
    color: 'text-blue-700',
    bg: 'bg-blue-50 ring-blue-200',
    icon: <IconLimpieza size={20} />,
    label: 'En Proceso',
  },
  completada: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 ring-emerald-200',
    icon: <IconCheck size={20} />,
    label: 'Completada',
  },
};

// Función pura: calcular duración
function calcularDuracion(tarea: TareaLimpieza): string | null {
  if (!tarea.iniciada_at) return null;

  const inicio = new Date(tarea.iniciada_at);
  const fin = tarea.completada_at ? new Date(tarea.completada_at) : new Date();
  const mins = Math.floor((fin.getTime() - inicio.getTime()) / 60000);

  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function TareaCard({ tarea, onIniciar, onCompletar }: TareaCardProps) {
  const config = CONFIG_ESTADO[tarea.estado];
  const duracion = calcularDuracion(tarea);

  return (
    <div
      className={clsx(
        'rounded-xl p-4 shadow-sm ring-1 transition-all',
        config.bg,
        tarea.estado === 'en_proceso' && 'animate-pulso-reactivo',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Hab. {tarea.habitacion?.numero ?? '—'}
            </h4>
            <p className="text-xs text-slate-500">
              Piso {tarea.habitacion?.piso ?? '—'} • {tarea.habitacion?.tipo ?? ''}
            </p>
          </div>
        </div>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', config.color, config.bg)}>
          {config.label}
        </span>
      </div>

      {/* Info */}
      <div className="mb-3 flex gap-4 text-xs text-slate-600">
        <div>
          <span className="text-slate-400">Prioridad: </span>
          <span className="font-medium">
            {Array.from({ length: Math.min(tarea.prioridad ?? 1, 5) }, (_, i) => (
              <IconStar key={i} size={12} className="inline text-amber-500" />
            ))}
          </span>
        </div>
        {duracion && (
          <div>
            <span className="text-slate-400">Tiempo: </span>
            <span className="font-medium">{duracion}</span>
          </div>
        )}
      </div>

      {/* Notas */}
      {tarea.notas && (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-white/50 p-2 text-xs text-slate-600">
          <IconNotes size={12} className="mt-0.5 shrink-0" /> {tarea.notas}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        {tarea.estado === 'pendiente' && onIniciar && (
          <button
            onClick={() => onIniciar(tarea.id)}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
          >
            <IconLimpieza size={16} className="inline" /> Iniciar Limpieza
          </button>
        )}
        {tarea.estado === 'en_proceso' && onCompletar && (
          <button
            onClick={() => onCompletar(tarea.id)}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
          >
            <IconCheck size={16} className="inline" /> Marcar Completada
          </button>
        )}
      </div>
    </div>
  );
}
