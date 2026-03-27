// ═══════════════════════════════════════════════════════════
// HotelFlux — Habitación Stream (Reactive Room Map)
// Observable que emite actualizaciones de todas las habitaciones
// en tiempo real desde Phoenix Channel → RxJS
// ═══════════════════════════════════════════════════════════

import { Observable } from 'rxjs';
import { map, scan, distinctUntilChanged } from 'rxjs/operators';
import { Socket } from 'phoenix';
import { createMultiEventStream } from './websocket.stream';
import type { Habitacion, EstadoHabitacion, ConteoEstados } from '../domain/types';

// ── Tipo de evento de habitación ──

interface HabitacionEvent {
  readonly habitacion_id: string;
  readonly estado?: EstadoHabitacion;
  readonly habitacion?: Habitacion;
}

// ── Estado acumulado (patrón scan/reduce funcional) ──

type HabitacionesMap = ReadonlyMap<string, Habitacion>;

// ── Función pura: crear el stream de habitaciones ──
// Patrón: scan (equivalente a Enum.reduce en Elixir)
// Cada evento actualiza el mapa inmutable de habitaciones

export function createHabitacionStream(
  socket: Socket,
  pisoFilter?: number,
): Observable<readonly Habitacion[]> {
  const params = pisoFilter ? { piso: pisoFilter } : {};

  return createMultiEventStream<HabitacionEvent>(
    socket,
    'habitaciones:lobby',
    ['estado_actualizado', 'mapa_completo', 'nuevo_estado'],
    params,
  ).pipe(
    // scan: acumula estado como un reducer puro (inmutable)
    scan((acc: HabitacionesMap, { event, payload }: { event: string; payload: HabitacionEvent }) => {
      switch (event) {
        case 'mapa_completo': {
          // Reemplazo completo del estado
          const habitaciones = (payload as any).habitaciones as Habitacion[];
          return new Map(habitaciones.map((h) => [h.id, h]));
        }
        case 'estado_actualizado':
        case 'nuevo_estado': {
          // Actualización parcial (inmutable: crea nuevo Map)
          if (payload.habitacion) {
            const newMap = new Map(acc);
            newMap.set(payload.habitacion.id, payload.habitacion);
            return newMap;
          }
          if (payload.habitacion_id && payload.estado) {
            const existing = acc.get(payload.habitacion_id);
            if (existing) {
              const newMap = new Map(acc);
              newMap.set(payload.habitacion_id, {
                ...existing,
                estado: payload.estado,
              });
              return newMap;
            }
          }
          return acc;
        }
        default:
          return acc;
      }
    }, new Map() as HabitacionesMap),

    // Transformar Map → Array ordenado (función pura)
    map((habitacionesMap: HabitacionesMap) =>
      Array.from(habitacionesMap.values()).sort((a: Habitacion, b: Habitacion) => {
        if (a.piso !== b.piso) return a.piso - b.piso;
        return a.numero.localeCompare(b.numero);
      }),
    ),

    // Solo emitir si realmente cambió (optimización reactiva)
    distinctUntilChanged(
      (prev: readonly Habitacion[], curr: readonly Habitacion[]) =>
        prev.length === curr.length &&
        prev.every((h: Habitacion, i: number) => h.id === curr[i]?.id && h.estado === curr[i]?.estado),
    ),
  );
}

// ── Función pura: derivar conteo de estados desde el stream ──
// Patrón CQRS: proyección de lectura derivada del stream principal

export function createConteoEstadosStream(
  habitaciones$: Observable<readonly Habitacion[]>,
): Observable<ConteoEstados> {
  return habitaciones$.pipe(
    map((habitaciones: readonly Habitacion[]) =>
      habitaciones.reduce(
        (acc: ConteoEstados, h: Habitacion) => ({
          ...acc,
          [h.estado]: ((acc as unknown as Record<string, number>)[h.estado] || 0) + 1,
        }),
        {
          disponible: 0,
          reservada: 0,
          ocupada: 0,
          en_limpieza: 0,
          en_mantenimiento: 0,
          bloqueada: 0,
        },
      ),
    ),
    distinctUntilChanged(
      (a: ConteoEstados, b: ConteoEstados) => JSON.stringify(a) === JSON.stringify(b),
    ),
  );
}

// ── Función pura: filtrar habitaciones por estado ──

export function filtrarPorEstado(
  habitaciones$: Observable<readonly Habitacion[]>,
  estado: EstadoHabitacion,
): Observable<readonly Habitacion[]> {
  return habitaciones$.pipe(
    map((habs: readonly Habitacion[]) => habs.filter((h: Habitacion) => h.estado === estado)),
  );
}

// ── Función pura: filtrar habitaciones por piso ──

export function filtrarPorPiso(
  habitaciones$: Observable<readonly Habitacion[]>,
  piso: number,
): Observable<readonly Habitacion[]> {
  return habitaciones$.pipe(
    map((habs: readonly Habitacion[]) => habs.filter((h: Habitacion) => h.piso === piso)),
  );
}
