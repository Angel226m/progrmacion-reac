// ═══════════════════════════════════════════════════════════
// HotelFlux — Habitación Stream (Reactive Room Map)
// Observable que emite actualizaciones de todas las habitaciones
// en tiempo real desde Phoenix Channel → RxJS
//
// Demuestra:
// - scan: fold/reduce reactivo (estado acumulado inmutable)
// - ReadonlyMap: inmutabilidad estricta
// - HOF: operadores personalizados (función que retorna OperatorFunction)
// - distinctUntilChanged: emisión solo cuando hay cambio real
// - Recursión: en funciones puras de derivación
// ═══════════════════════════════════════════════════════════

import { Observable, OperatorFunction } from 'rxjs';
import { map, scan, distinctUntilChanged } from 'rxjs/operators';
import { pipe } from 'rxjs';
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

// ─────────────────────────────────────────────────────────────────
// OPERADORES HOF — funciones que retornan OperatorFunction
// ─────────────────────────────────────────────────────────────────

/**
 * HOF: acumularHabitaciones — operador que mantiene el mapa inmutable de habitaciones.
 * Función que retorna un OperatorFunction (HOF clásica de RxJS).
 *
 * Patrón scan = fold funcional:
 *   estado_nuevo = f(estado_anterior, evento_nuevo)
 */
function handleMapaCompleto(_: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const habitaciones = (payload as unknown as { habitaciones: Habitacion[] }).habitaciones;
  return new Map(habitaciones.map((h) => [h.id, h]));
}

function handleEstadoCambio(acc: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  if (payload.habitacion) {
    const newMap = new Map(acc);
    newMap.set(payload.habitacion.id, payload.habitacion);
    return newMap;
  }
  if (payload.habitacion_id && payload.estado) {
    const existing = acc.get(payload.habitacion_id);
    if (existing) {
      const newMap = new Map(acc);
      newMap.set(payload.habitacion_id, { ...existing, estado: payload.estado });
      return newMap;
    }
  }
  return acc;
}

const habitacionStreamHandlers: Readonly<Record<string, (acc: HabitacionesMap, payload: HabitacionEvent) => HabitacionesMap>> = {
  mapa_completo: handleMapaCompleto,
  estado_actualizado: handleEstadoCambio,
  nuevo_estado: handleEstadoCambio,
};

function acumularHabitaciones(): OperatorFunction<
  { event: string; payload: HabitacionEvent },
  HabitacionesMap
> {
  return scan(
    (acc: HabitacionesMap, { event, payload }: { event: string; payload: HabitacionEvent }) => {
      return (habitacionStreamHandlers[event] ?? ((acc) => acc))(acc, payload);
    },
    new Map() as HabitacionesMap,
  );
}

/**
 * HOF: ordenarHabitaciones — operador que ordena por piso y número.
 * Función pura que retorna OperatorFunction — sin efectos secundarios.
 */
function ordenarHabitaciones(
  pisoFilter?: number,
): OperatorFunction<HabitacionesMap, readonly Habitacion[]> {
  return map((habitacionesMap: HabitacionesMap) => {
    const todas = Array.from(habitacionesMap.values());
    // Filtro puro por piso (si aplica)
    const filtradas = pisoFilter ? todas.filter((h) => h.piso === pisoFilter) : todas;
    // Ordenamiento puro: sort retorna nuevo array (sin mutar)
    return [...filtradas].sort((a: Habitacion, b: Habitacion) => {
      if (a.piso !== b.piso) return a.piso - b.piso;
      return a.numero.localeCompare(b.numero);
    });
  });
}

/**
 * HOF: soloCuandoCambia — emite solo si el estado de habitaciones cambió.
 * Usa comparación estructural por id y estado (no referencial).
 */
function soloCuandoCambia(): OperatorFunction<readonly Habitacion[], readonly Habitacion[]> {
  return distinctUntilChanged(
    (prev: readonly Habitacion[], curr: readonly Habitacion[]) =>
      prev.length === curr.length &&
      prev.every(
        (h: Habitacion, i: number) => h.id === curr[i]?.id && h.estado === curr[i]?.estado,
      ),
  );
}

/**
 * HOF: pipe de transformación completa de habitaciones.
 * Compone los tres operadores en una sola función.
 * Demuestra composición de operadores (pipe como función de orden superior).
 */
function habitacionesPipeline(
  pisoFilter?: number,
): OperatorFunction<{ event: string; payload: HabitacionEvent }, readonly Habitacion[]> {
  // pipe() de RxJS es una HOF que compone operadores (compose de derecha a izquierda)
  return pipe(
    acumularHabitaciones(),
    ordenarHabitaciones(pisoFilter),
    soloCuandoCambia(),
  );
}

// ── Función pura: crear el stream de habitaciones ──

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
    // HOF compuesto: acumular → ordenar → filtrar cambios
    habitacionesPipeline(pisoFilter),
  );
}

// ── Función pura: derivar conteo de estados desde el stream ──
// Patrón CQRS: proyección de lectura derivada del stream principal

export function createConteoEstadosStream(
  habitaciones$: Observable<readonly Habitacion[]>,
): Observable<ConteoEstados> {
  return habitaciones$.pipe(
    map((habitaciones: readonly Habitacion[]) =>
      // reduce: fold puro sobre el array (HOF — recibe función como argumento)
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

// ─────────────────────────────────────────────────────────────────
// FUNCIONES PURAS CON RECURSIÓN — Derivaciones del stream
// ─────────────────────────────────────────────────────────────────

/**
 * Busca una habitación por id en el array. FUNCIÓN RECURSIVA PURA.
 * Evita indexOf/find para demostrar el patrón de búsqueda recursiva.
 */
export function buscarHabitacion(
  habitaciones: readonly Habitacion[],
  id: string,
): Habitacion | null {
  if (habitaciones.length === 0) return null;
  const [primera, ...resto] = habitaciones as [Habitacion, ...Habitacion[]];
  if (primera.id === id) return primera;
  return buscarHabitacion(resto, id); // tail recursion
}

/**
 * Construye árbol de pisos. FUNCIÓN RECURSIVA PURA.
 * piso → {numero, habitaciones[], estadoResumido}
 */
export function construirArbolPisos(
  habitaciones: readonly Habitacion[],
): ReadonlyMap<number, { readonly pisoNum: number; readonly habitaciones: readonly Habitacion[] }> {
  return agruparPorPisoRec(habitaciones, new Map());
}

function agruparPorPisoRec(
  habitaciones: readonly Habitacion[],
  acc: Map<number, { pisoNum: number; habitaciones: Habitacion[] }>,
): ReadonlyMap<number, { readonly pisoNum: number; readonly habitaciones: readonly Habitacion[] }> {
  if (habitaciones.length === 0) return acc;

  const [hab, ...resto] = habitaciones as [Habitacion, ...Habitacion[]];
  const pisoActual = acc.get(hab.piso);

  if (pisoActual) {
    acc.set(hab.piso, { ...pisoActual, habitaciones: [...pisoActual.habitaciones, hab] });
  } else {
    acc.set(hab.piso, { pisoNum: hab.piso, habitaciones: [hab] });
  }

  return agruparPorPisoRec(resto, acc); // tail recursion
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
