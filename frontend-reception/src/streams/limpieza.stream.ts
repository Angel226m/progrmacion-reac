// ═══════════════════════════════════════════════════════════
// HotelFlux — Limpieza Stream (Tareas en tiempo real)
// Observable reactivo para el módulo de limpieza
// Patrón: scan + distinctUntilChanged (estado acumulado puro)
// ═══════════════════════════════════════════════════════════

import { Observable } from 'rxjs';
import { map, scan, distinctUntilChanged, shareReplay, startWith } from 'rxjs/operators';
import { Socket } from 'phoenix';
import { createMultiEventStream } from './websocket.stream';
import type { TareaLimpieza, EstadoTarea } from '../domain/types';

// ── Eventos del canal de limpieza ──

interface LimpiezaEvent {
  readonly tarea_id: string;
  readonly estado?: EstadoTarea;
  readonly tarea?: TareaLimpieza;
  readonly tareas?: readonly TareaLimpieza[];
}

// ── Estado acumulado de tareas (inmutable) ──

type TareasMap = ReadonlyMap<string, TareaLimpieza>;

// ── Función pura: crear stream de tareas de limpieza ──

export function createLimpiezaStream(
  socket: Socket,
  empleadoId?: string,
): Observable<readonly TareaLimpieza[]> {
  const params = empleadoId ? { empleado_id: empleadoId } : {};

  return createMultiEventStream<LimpiezaEvent>(
    socket,
    'limpieza:lobby',
    ['tarea_actualizada', 'nueva_tarea', 'tareas_lista', 'estado_actualizado'],
    params,
  ).pipe(
    // scan: acumula estado como reducer puro
    scan((acc: TareasMap, { event, payload }: { event: string; payload: LimpiezaEvent }) => {
      switch (event) {
        case 'tareas_lista': {
          const tareas = payload.tareas ?? [];
          return new Map(tareas.map((t: TareaLimpieza) => [t.id, t]));
        }
        case 'nueva_tarea':
        case 'tarea_actualizada': {
          if (payload.tarea) {
            const newMap = new Map(acc);
            newMap.set(payload.tarea.id, payload.tarea);
            return newMap;
          }
          return acc;
        }
        case 'estado_actualizado': {
          if (payload.tarea_id && payload.estado) {
            const existing = acc.get(payload.tarea_id);
            if (existing) {
              const newMap = new Map(acc);
              newMap.set(payload.tarea_id, { ...existing, estado: payload.estado });
              return newMap;
            }
          }
          return acc;
        }
        default:
          return acc;
      }
    }, new Map() as TareasMap),

    // Map → Array ordenado por prioridad (función pura)
    map((tareasMap: TareasMap) =>
      Array.from(tareasMap.values()).sort((a: TareaLimpieza, b: TareaLimpieza) => {
        // Primero por estado: pendiente > en_proceso > completada
        const orden: Record<EstadoTarea, number> = {
          pendiente: 0,
          en_proceso: 1,
          completada: 2,
          con_problema: 3,
        };
        const diff = orden[a.estado] - orden[b.estado];
        if (diff !== 0) return diff;
        // Luego por prioridad descendente
        return (b.prioridad ?? 0) - (a.prioridad ?? 0);
      }),
    ),

    distinctUntilChanged(
      (prev: readonly TareaLimpieza[], curr: readonly TareaLimpieza[]) =>
        prev.length === curr.length &&
        prev.every((t: TareaLimpieza, i: number) => t.id === curr[i]?.id && t.estado === curr[i]?.estado),
    ),

    startWith([] as readonly TareaLimpieza[]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ── Funciones puras: filtros derivados ──

export function filtrarPorEstado(
  tareas$: Observable<readonly TareaLimpieza[]>,
  estado: EstadoTarea,
): Observable<readonly TareaLimpieza[]> {
  return tareas$.pipe(
    map((tareas: readonly TareaLimpieza[]) => tareas.filter((t: TareaLimpieza) => t.estado === estado)),
  );
}

export function contarPorEstado(
  tareas: readonly TareaLimpieza[],
): Record<EstadoTarea, number> {
  return tareas.reduce(
    (acc, t) => ({ ...acc, [t.estado]: (acc[t.estado] || 0) + 1 }),
    { pendiente: 0, en_proceso: 0, completada: 0, con_problema: 0 },
  );
}
