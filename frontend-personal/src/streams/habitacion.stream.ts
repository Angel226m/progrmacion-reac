import { Observable, OperatorFunction } from 'rxjs';
import { map, scan, distinctUntilChanged } from 'rxjs/operators';
import { pipe } from 'rxjs';
import { Socket } from 'phoenix';
import { createMultiEventStream } from './websocket.stream';
import type { Habitacion, EstadoHabitacion, ConteoEstados } from '../domain/types';

interface HabitacionEvent {
  readonly habitacion_id: string;
  readonly estado?: EstadoHabitacion;
  readonly habitacion?: Habitacion;
}

type HabitacionesMap = ReadonlyMap<string, Habitacion>;

function handleMapaCompleto(_: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const habitaciones = (payload as unknown as { habitaciones: Habitacion[] }).habitaciones;
  return new Map(habitaciones.map((h) => [h.id, h])) as HabitacionesMap;
}

function handleEstadoCambio(acc: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const { habitacion } = payload;
  return habitacion
    ? new Map(acc).set(habitacion.id, habitacion) as HabitacionesMap
    : payload.habitacion_id && payload.estado && acc.has(payload.habitacion_id)
      ? new Map(acc).set(
          payload.habitacion_id,
          { ...acc.get(payload.habitacion_id)!, estado: payload.estado },
        ) as HabitacionesMap
      : acc;
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
    (acc: HabitacionesMap, { event, payload }: { event: string; payload: HabitacionEvent }) =>
      (habitacionStreamHandlers[event] ?? ((acc: HabitacionesMap) => acc))(acc, payload),
    new Map() as HabitacionesMap,
  );
}

function ordenarHabitaciones(
  pisoFilter?: number,
): OperatorFunction<HabitacionesMap, readonly Habitacion[]> {
  return map((habitacionesMap: HabitacionesMap) => {
    const todas = Array.from(habitacionesMap.values());
    const filtradas = pisoFilter ? todas.filter((h) => h.piso === pisoFilter) : todas;
    return [...filtradas].sort(
      (a: Habitacion, b: Habitacion) =>
        a.piso - b.piso || a.numero.localeCompare(b.numero),
    );
  });
}

function soloCuandoCambia(): OperatorFunction<readonly Habitacion[], readonly Habitacion[]> {
  return distinctUntilChanged(
    (prev: readonly Habitacion[], curr: readonly Habitacion[]) =>
      prev.length === curr.length &&
      prev.every(
        (h: Habitacion, i: number) => h.id === curr[i]?.id && h.estado === curr[i]?.estado,
      ),
  );
}

function habitacionesPipeline(
  pisoFilter?: number,
): OperatorFunction<{ event: string; payload: HabitacionEvent }, readonly Habitacion[]> {
  return pipe(
    acumularHabitaciones(),
    ordenarHabitaciones(pisoFilter),
    soloCuandoCambia(),
  );
}

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
  ).pipe(habitacionesPipeline(pisoFilter));
}

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

export function buscarHabitacion(
  habitaciones: readonly Habitacion[],
  id: string,
): Habitacion | null {
  const [primera, ...resto] = habitaciones as [Habitacion, ...Habitacion[]];
  return !primera
    ? null
    : primera.id === id
      ? primera
      : buscarHabitacion(resto, id);
}

export function construirArbolPisos(
  habitaciones: readonly Habitacion[],
): ReadonlyMap<number, { readonly pisoNum: number; readonly habitaciones: readonly Habitacion[] }> {
  return construirArbolRec(habitaciones, new Map());
}

function construirArbolRec(
  habitaciones: readonly Habitacion[],
  acc: ReadonlyMap<number, { pisoNum: number; habitaciones: Habitacion[] }>,
): ReadonlyMap<number, { readonly pisoNum: number; readonly habitaciones: readonly Habitacion[] }> {
  const [hab, ...resto] = habitaciones as [Habitacion, ...Habitacion[]];
  return !hab
    ? acc
    : construirArbolRec(resto, new Map(acc).set(
        hab.piso,
        agruparPiso(acc.get(hab.piso), hab),
      ));
}

function agruparPiso(
  pisoExistente: { pisoNum: number; habitaciones: Habitacion[] } | undefined,
  hab: Habitacion,
): { pisoNum: number; habitaciones: Habitacion[] } {
  return pisoExistente
    ? { ...pisoExistente, habitaciones: [...pisoExistente.habitaciones, hab] }
    : { pisoNum: hab.piso, habitaciones: [hab] };
}

export function filtrarPorEstado(
  habitaciones$: Observable<readonly Habitacion[]>,
  estado: EstadoHabitacion,
): Observable<readonly Habitacion[]> {
  return habitaciones$.pipe(
    map((habs: readonly Habitacion[]) => habs.filter((h: Habitacion) => h.estado === estado)),
  );
}

export function filtrarPorPiso(
  habitaciones$: Observable<readonly Habitacion[]>,
  piso: number,
): Observable<readonly Habitacion[]> {
  return habitaciones$.pipe(
    map((habs: readonly Habitacion[]) => habs.filter((h: Habitacion) => h.piso === piso)),
  );
}
