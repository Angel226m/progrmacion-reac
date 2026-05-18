// ═══════════════════════════════════════════════════════════
// HotelFlux — ListaTareas (lista de tareas de limpieza)
// Componente funcional puro con filtros por estado
// Mobile-first: diseñado para tablet del personal
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import type { TareaLimpieza, EstadoTarea } from '../../domain/types';
import TareaCard from './TareaCard';
import { IconDocument, IconClock, IconLimpieza, IconCheck } from '../shared/Icons';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ListaTareasProps {
  readonly tareas: readonly TareaLimpieza[];
  readonly conteo: Record<EstadoTarea, number>;
  readonly onIniciar?: (tareaId: string) => void;
  readonly onCompletar?: (tareaId: string) => void;
}

const FILTROS: readonly { estado: EstadoTarea | 'todas'; label: string; icon: ReactNode }[] = [
  { estado: 'todas', label: 'Todas', icon: <IconDocument size={14} /> },
  { estado: 'pendiente', label: 'Pendientes', icon: <IconClock size={14} /> },
  { estado: 'en_proceso', label: 'En Proceso', icon: <IconLimpieza size={14} /> },
  { estado: 'completada', label: 'Completadas', icon: <IconCheck size={14} /> },
] as const;

export default function ListaTareas({ tareas, conteo, onIniciar, onCompletar }: ListaTareasProps) {
  const [filtro, setFiltro] = useState<EstadoTarea | 'todas'>('todas');

  // Función pura: filtrar tareas
  const tareasFiltradas =
    filtro === 'todas' ? tareas : tareas.filter((t) => t.estado === filtro);

  return (
    <div className="space-y-4">
      {/* Resumen de conteo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-200">
          <p className="text-2xl font-bold text-amber-700">{conteo.pendiente}</p>
          <p className="text-xs text-amber-600">Pendientes</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-center ring-1 ring-blue-200">
          <p className="text-2xl font-bold text-blue-700">{conteo.en_proceso}</p>
          <p className="text-xs text-blue-600">En Proceso</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
          <p className="text-2xl font-bold text-emerald-700">{conteo.completada}</p>
          <p className="text-xs text-emerald-600">Completadas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.estado}
            onClick={() => setFiltro(f.estado)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              filtro === f.estado
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {f.icon} {f.label}
            {f.estado !== 'todas' && (
              <span className="ml-1 opacity-75">({conteo[f.estado as EstadoTarea]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de tarjetas */}
      {tareasFiltradas.length === 0 ? (
        <div className="rounded-xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200">
          <IconLimpieza size={40} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No hay tareas en este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tareasFiltradas.map((tarea) => (
            <TareaCard
              key={tarea.id}
              tarea={tarea}
              onIniciar={onIniciar}
              onCompletar={onCompletar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
