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

type TareaPayload = {
  readonly id?: string;
  readonly tarea_id?: string;
  readonly estado?: EstadoTarea;
  readonly prioridad?: string;
  readonly notas?: string | null;
  readonly habitacion_id?: string;
  readonly empleado_id?: string | null;
  readonly iniciada_at?: string | null;
  readonly completada_at?: string | null;
  readonly inserted_at?: string;
  readonly habitacion?: { readonly id: string; readonly numero: string; readonly piso: number; readonly tipo: string } | null;
} & Record<string, unknown>;

interface LimpiezaEvent extends TareaPayload {
  readonly tareas?: readonly TareaLimpieza[];
}

// ── Estado acumulado de tareas (inmutable) ──

type TareasMap = ReadonlyMap<string, TareaLimpieza>;

function handleTareaLista(_: TareasMap, payload: LimpiezaEvent): TareasMap {
  const tareas = payload.tareas ?? [];
  return new Map(tareas.map((t: TareaLimpieza) => [t.id, t]));
}

function esTareaPayload(p: LimpiezaEvent): p is LimpiezaEvent & { id: string; estado: EstadoTarea } {
  return typeof p.id === 'string' && typeof p.estado === 'string';
}

function payloadATarea(p: LimpiezaEvent & { id: string; estado: EstadoTarea }): TareaLimpieza {
  return {
    id: p.id,
    habitacion_id: p.habitacion_id ?? '',
    empleado_id: p.empleado_id ?? null,
    estado: p.estado,
    prioridad: typeof p.prioridad === 'number' ? p.prioridad : typeof p.prioridad === 'string' ? ({ baja: 1, normal: 2, alta: 3, urgente: 4 } as Record<string, number>)[p.prioridad] ?? 2 : 1,
    notas: p.notas ?? null,
    iniciada_at: p.iniciada_at ?? null,
    completada_at: p.completada_at ?? null,
    habitacion: p.habitacion ?? undefined,
    inserted_at: p.inserted_at as string ?? '',
  };
}

function handleUpsertTarea(acc: TareasMap, payload: LimpiezaEvent): TareasMap {
  return esTareaPayload(payload)
    ? new Map(acc).set(payload.id, payloadATarea(payload))
    : acc;
}

function handleEstadoActualizado(acc: TareasMap, payload: LimpiezaEvent): TareasMap {
  const tareaId = payload.tarea_id ?? payload.id;
  const estado = payload.estado;
  return tareaId && estado && acc.has(tareaId)
    ? new Map(acc).set(tareaId, { ...acc.get(tareaId)!, estado })
    : acc;
}

const limpiezaHandlers: Readonly<Record<string, (acc: TareasMap, payload: LimpiezaEvent) => TareasMap>> = {
  tareas_lista: handleTareaLista,
  nueva_tarea: handleUpsertTarea,
  tarea_actualizada: handleUpsertTarea,
  tarea_asignada: handleUpsertTarea,
  estado_actualizado: handleEstadoActualizado,
};

// ── Función pura: crear stream de tareas de limpieza ──

export function createLimpiezaStream(
  socket: Socket,
  empleadoId?: string,
): Observable<readonly TareaLimpieza[]> {
  const topic = empleadoId ? `limpieza:${empleadoId}` : 'limpieza:lobby';
  const params = empleadoId ? { empleado_id: empleadoId } : {};

  return createMultiEventStream<LimpiezaEvent>(
    socket,
    topic,
    ['tarea_actualizada', 'nueva_tarea', 'tareas_lista', 'estado_actualizado', 'tarea_asignada'],
    params,
  ).pipe(
    // scan: acumula estado como reducer puro
    scan((acc: TareasMap, { event, payload }: { event: string; payload: LimpiezaEvent }) => {
      const handler = limpiezaHandlers[event];
      return handler ? handler(acc, payload) : acc;
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
        return diff || (b.prioridad ?? 0) - (a.prioridad ?? 0);
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
