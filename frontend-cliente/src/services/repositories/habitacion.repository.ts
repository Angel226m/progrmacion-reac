// ═══════════════════════════════════════════════════════════
// HotelFlux — Repositorio Observable de Habitaciones
// Patrón: Observable Repository con WebSocket para tiempo real
// Escucha eventos: mapa_completo, habitacion_actualizada, estado_actualizado
// Almacena en BehaviorSubject y emite cambios via RxJS
// ═══════════════════════════════════════════════════════════

import {
  Observable,
  BehaviorSubject,
  from,
  merge,
  NEVER,
  of,
  firstValueFrom,
} from 'rxjs';
import {
  map,
  tap,
  shareReplay,
  catchError,
  distinctUntilChanged,
  scan,
} from 'rxjs/operators';
import type { IHabitacionRepository } from '../../application/ports';
import type { Result } from '../../domain/result';
import { ok, err, fromPromise, flatMapResult } from '../../domain/result';
import type { Habitacion } from '../../domain/entidades/habitacion';
import { getSocket, createMultiEventStream } from '../../streams/websocket.stream';
import type { Socket } from 'phoenix';

type HabitacionesMap = ReadonlyMap<string, Habitacion>;

interface HabitacionEvent {
  readonly habitacion?: Habitacion;
  readonly habitacion_id?: string;
  readonly estado?: string;
  readonly habitaciones?: readonly Habitacion[];
}

const HABITACION_EVENTS = [
  'mapa_completo',
  'habitacion_actualizada',
  'estado_actualizado',
  'nuevo_estado',
] as const;

const ordenarHabitaciones = (a: Habitacion, b: Habitacion): number =>
  a.piso - b.piso || a.numero.localeCompare(b.numero);

function handleMapaCompleto(_: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const lista = payload.habitaciones ?? [];
  return new Map(lista.map((h) => [h.id, h])) as HabitacionesMap;
}

function handleHabitacionActualizada(acc: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const actualizar = (id: string, campos: Partial<Habitacion>): HabitacionesMap =>
    new Map(acc).set(id, { ...(acc.get(id) ?? {} as Habitacion), ...campos }) as HabitacionesMap;

  if (payload.habitacion) return actualizar(payload.habitacion.id, payload.habitacion);
  if (payload.habitacion_id && payload.estado && acc.has(payload.habitacion_id)) {
    return actualizar(payload.habitacion_id, { estado: payload.estado as Habitacion['estado'] });
  }
  return acc;
}

const eventHandlers: Readonly<Record<string, (acc: HabitacionesMap, payload: HabitacionEvent) => HabitacionesMap>> = {
  mapa_completo: handleMapaCompleto,
  habitacion_actualizada: handleHabitacionActualizada,
  estado_actualizado: handleHabitacionActualizada,
  nuevo_estado: handleHabitacionActualizada,
};

function acumularEventos(
  acc: HabitacionesMap,
  { event, payload }: { event: string; payload: HabitacionEvent },
): HabitacionesMap {
  return (eventHandlers[event] ?? ((acc: HabitacionesMap) => acc))(acc, payload);
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function buildHabitacionParams(filtros?: Partial<{ estado: string; piso: number }>): string {
  const entries = Object.entries(filtros ?? {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => [k, String(v)]);
  const params = new URLSearchParams(entries);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchHabitaciones(
  token: string,
  filtros?: Partial<{ estado: string; piso: number }>,
): Promise<readonly Habitacion[]> {
  const res = await fetch(`${BASE_URL}/habitaciones${buildHabitacionParams(filtros)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = res.ok ? await res.json() : await Promise.reject(new Error(`HTTP ${res.status}`));
  return (data.habitaciones ?? data) as readonly Habitacion[];
}

function aplicarFiltros(lista: readonly Habitacion[], estado?: string): readonly Habitacion[] {
  return estado ? lista.filter((h) => h.estado === estado) : lista;
}

function filtrarPorPiso(lista: readonly Habitacion[], piso?: number): readonly Habitacion[] {
  return piso ? lista.filter((h) => h.piso === piso) : lista;
}

function cacheToResult(
  cache: HabitacionesMap,
  filtros?: Partial<{ estado: string; piso: number }>,
): Result<readonly Habitacion[]> {
  const cached = [...cache.values()] as readonly Habitacion[];
  const filtradas = aplicarFiltros(filtrarPorPiso(cached, filtros?.piso), filtros?.estado);
  return filtradas.length > 0
    ? ok(filtradas)
    : err(new Error('No data available'));
}

export class HabitacionObservableRepository implements IHabitacionRepository {
  private readonly token: string;
  private readonly socket: Socket;
  private readonly _estado$ = new BehaviorSubject<HabitacionesMap>(new Map());
  private readonly _shared$: Observable<Result<readonly Habitacion[]>>;

  constructor(token: string) {
    this.token = token;
    this.socket = getSocket(token);

    const initial$ = from(
      fetchHabitaciones(token).catch(() => [] as readonly Habitacion[]),
    ).pipe(
      map((lista) => ({
        event: 'mapa_completo',
        payload: { habitaciones: lista } as HabitacionEvent,
      })),
    );

    const updates$ = createMultiEventStream<HabitacionEvent>(
      this.socket,
      'habitaciones:lobby',
      HABITACION_EVENTS as unknown as string[],
    ).pipe(catchError(() => NEVER));

    this._shared$ = merge(initial$, updates$).pipe(
      scan(acumularEventos, new Map() as HabitacionesMap),
      tap((mapaInmutable) => this._estado$.next(mapaInmutable)),
      map((mapaInmutable) => {
        const lista = [...mapaInmutable.values()].sort(ordenarHabitaciones);
        return ok(lista as readonly Habitacion[]);
      }),
      distinctUntilChanged((prev, curr) =>
        prev.ok && curr.ok
          ? prev.value.length === curr.value.length &&
            prev.value.every((h, i) => h.id === curr.value[i]?.id && h.estado === curr.value[i]?.estado)
          : false,
      ),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  listar$(filtros?: Partial<{ piso: number }>): Observable<Result<readonly Habitacion[]>> {
    return this._shared$.pipe(
      map(flatMapResult<readonly Habitacion[], readonly Habitacion[], Error>((habitaciones) =>
        ok((() => {
          const lista = habitaciones;
          return filtros?.piso ? lista.filter((h) => h.piso === filtros!.piso) : lista;
        })()),
      )),
    );
  }

  obtener$(id: string): Observable<Result<Habitacion>> {
    return this._shared$.pipe(
      map(flatMapResult<readonly Habitacion[], Habitacion, Error>((habitaciones) => {
        const hab = habitaciones.find((h) => h.id === id);
        return hab ? ok(hab) : err(new Error('Habitación no encontrada'));
      })),
      distinctUntilChanged((prev, curr) =>
        prev.ok && curr.ok
          ? prev.value.estado === curr.value.estado && prev.value.id === curr.value.id
          : prev.ok === curr.ok,
      ),
    );
  }

  async listar(filtros?: Partial<{ estado: string; piso: number }>): Promise<Result<readonly Habitacion[]>> {
    const resultadoStream = await firstValueFrom(
      this._shared$.pipe(
        map((result) =>
          result.ok
            ? ok(aplicarFiltros(filtrarPorPiso(result.value, filtros?.piso), filtros?.estado))
            : result,
        ),
      ),
    ).catch(() => null as Result<readonly Habitacion[]> | null);

    return resultadoStream?.ok && resultadoStream.value
      ? ok(resultadoStream.value)
      : cacheToResult(this._estado$.getValue(), filtros);
  }

  async obtener(id: string): Promise<Result<Habitacion>> {
    const cached = this._estado$.getValue().get(id);
    return cached
      ? ok(cached)
      : fromPromise(
          firstValueFrom(this.obtener$(id))
            .then((result) =>
              result.ok ? result.value : Promise.reject(new Error('Not found in stream')),
            ),
          (e) => e instanceof Error ? e : new Error(String(e)),
        );
  }

  async cambiarEstado(id: string, nuevoEstado: string): Promise<Result<Habitacion>> {
    return fromPromise(
      fetch(`${BASE_URL}/habitaciones/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ estado: nuevoEstado }),
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ habitacion?: Habitacion }>).then((d) => (d.habitacion ?? d) as Habitacion)
          : Promise.reject(new Error(`HTTP ${res.status}`)),
      ),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
  }
}
