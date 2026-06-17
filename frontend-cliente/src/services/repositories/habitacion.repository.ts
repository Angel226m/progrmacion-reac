// ═══════════════════════════════════════════════════════════
// HotelFlux — Observable Repository: Habitaciones
//
// Patrón Observable Repository:
//   El repositorio NO devuelve un valor puntual.
//   Devuelve un Observable que:
//     1. Emite el estado actual (carga inicial vía REST API)
//     2. Re-emite cada vez que el backend notifica un cambio (WebSocket push)
//     3. Nunca completa — es un stream infinito de estado
//
// Implementa: IHabitacionRepository (Clean Architecture port)
// Fuente de verdad: Phoenix Channel "habitaciones:lobby"
//   → PubSub backend → WebSocket → merge con API inicial
//
// Principios demostrados:
// - Observable Repository: Observer sobre capa de datos
// - merge(initial$, updates$): primer valor = API, siguientes = WS
// - BehaviorSubject: estado reactivo mutable con valor inicial
// - shareReplay(1): hot observable — un solo canal para N suscriptores
// - scan: fold reactivo para reconstruir el mapa de habitaciones
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
  shareReplay,
  catchError,
  distinctUntilChanged,
  scan,
  filter,
} from 'rxjs/operators';
import type { IHabitacionRepository } from '../../application/ports';
import type { Result } from '../../domain/result';
import { ok, err } from '../../domain/result';
import type { Habitacion } from '../../domain/entidades/habitacion';
import { getSocket, createMultiEventStream } from '../../streams/websocket.stream';
import type { Socket } from 'phoenix';

// ── Tipos internos ──

type HabitacionesMap = ReadonlyMap<string, Habitacion>;

interface HabitacionEvent {
  readonly habitacion?: Habitacion;
  readonly habitacion_id?: string;
  readonly estado?: string;
  readonly habitaciones?: readonly Habitacion[];
}

// ── Eventos que interesan al repositorio ──

const HABITACION_EVENTS = [
  'mapa_completo',
  'habitacion_actualizada',
  'estado_actualizado',
  'nuevo_estado',
] as const;

// ─────────────────────────────────────────────────────────────────
// FUNCIÓN PURA: acumula eventos de WebSocket en un mapa inmutable
// scan = fold reactivo (patrón funcional sobre streams)
// ─────────────────────────────────────────────────────────────────

function handleMapaCompleto(_: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  const lista = payload.habitaciones ?? [];
  return new Map(lista.map((h) => [h.id, h]));
}

function handleHabitacionActualizada(acc: HabitacionesMap, payload: HabitacionEvent): HabitacionesMap {
  if (payload.habitacion) {
    const m = new Map(acc);
    m.set(payload.habitacion.id, payload.habitacion);
    return m as HabitacionesMap;
  }
  if (payload.habitacion_id && payload.estado) {
    const existing = acc.get(payload.habitacion_id);
    if (existing) {
      const m = new Map(acc);
      m.set(payload.habitacion_id, { ...existing, estado: payload.estado as Habitacion['estado'] });
      return m as HabitacionesMap;
    }
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
  return (eventHandlers[event] ?? ((acc) => acc))(acc, payload);
}

// ── REST API helpers ──

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function fetchHabitaciones(
  token: string,
  filtros?: Partial<{ estado: string; piso: number }>,
): Promise<readonly Habitacion[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.piso !== undefined) params.set('piso', String(filtros.piso));

  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE_URL}/habitaciones${qs}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.habitaciones ?? data) as readonly Habitacion[];
}

async function fetchHabitacion(token: string, id: string): Promise<Habitacion> {
  const res = await fetch(`${BASE_URL}/habitaciones/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.habitacion ?? data) as Habitacion;
}

// ─────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN: Observable Repository de Habitaciones
//
// listar$() — Observable Repository:
//   merge(
//     initial$  ← carga desde REST API (emite una vez al suscribir)
//     updates$  ← stream de WebSocket (emite cada vez que el backend notifica)
//   )
//   |> scan(acumularEventos)  ← fold sobre el stream de cambios
//   |> shareReplay(1)         ← hot: todos los suscriptores reciben el último estado
// ─────────────────────────────────────────────────────────────────

export class HabitacionObservableRepository implements IHabitacionRepository {
  private readonly token: string;
  private readonly socket: Socket;

  // BehaviorSubject: permite acceso síncrono al último estado conocido
  private readonly _estado$ = new BehaviorSubject<HabitacionesMap>(new Map());

  // Stream compartido — se construye una sola vez (hot observable)
  private readonly _shared$: Observable<Result<readonly Habitacion[]>>;

  constructor(token: string) {
    this.token = token;
    this.socket = getSocket(token);

    // ── OBSERVABLE REPOSITORY: construcción del stream maestro ──
    //
    // Paso 1: carga inicial desde REST (Promise → Observable)
    const initial$ = from(
      fetchHabitaciones(token).catch(() => [] as readonly Habitacion[]),
    ).pipe(
      map((lista) => ({
        event: 'mapa_completo',
        payload: { habitaciones: lista } as HabitacionEvent,
      })),
    );

    // Paso 2: actualizaciones push desde Phoenix Channel
    const updates$ = createMultiEventStream<HabitacionEvent>(
      this.socket,
      'habitaciones:lobby',
      HABITACION_EVENTS as unknown as string[],
    ).pipe(
      catchError(() => NEVER), // si falla el WS, el stream de actualizaciones para pero el inicial ya emitió
    );

    // Paso 3: merge → ambos feeds llegan al mismo scan
    // scan = fold reactivo: acumula el mapa inmutable de habitaciones
    this._shared$ = merge(initial$, updates$).pipe(
      scan(acumularEventos, new Map() as HabitacionesMap),
      map((mapaInmutable) => {
        // Actualiza el BehaviorSubject (caché local reactivo)
        this._estado$.next(mapaInmutable);
        const lista = [...mapaInmutable.values()].sort((a, b) => {
          if (a.piso !== b.piso) return a.piso - b.piso;
          return a.numero.localeCompare(b.numero);
        });
        return ok(lista as readonly Habitacion[]);
      }),
      // distinctUntilChanged: no re-emite si la lista no cambió
      distinctUntilChanged((prev, curr) => {
        if (!prev.ok || !curr.ok) return false;
        return (
          prev.value.length === curr.value.length &&
          prev.value.every((h, i) => h.id === curr.value[i]?.id && h.estado === curr.value[i]?.estado)
        );
      }),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      // shareReplay(1): hot observable — un único canal WebSocket compartido por todos los suscriptores
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  // ── Observable Repository: stream continuo ──

  listar$(filtros?: Partial<{ piso: number }>): Observable<Result<readonly Habitacion[]>> {
    if (!filtros?.piso) return this._shared$;
    // Filtro de piso: derivado del stream maestro (sin nueva conexión)
    return this._shared$.pipe(
      map((result) => {
        if (!result.ok) return result;
        return ok(result.value.filter((h) => h.piso === filtros.piso));
      }),
    );
  }

  obtener$(id: string): Observable<Result<Habitacion>> {
    return this._shared$.pipe(
      map((result) => {
        if (!result.ok) return result;
        const hab = result.value.find((h) => h.id === id);
        return hab ? ok(hab) : err(new Error('Habitación no encontrada'));
      }),
      distinctUntilChanged((prev, curr) => {
        if (prev.ok !== curr.ok) return false;
        if (!prev.ok || !curr.ok) return false;
        return prev.value.estado === curr.value.estado && prev.value.id === curr.value.id;
      }),
      filter((result) => result.ok || true), // deja pasar errores y ok
    );
  }

  // ── Métodos imperativos (delegan en Observable como fuente de verdad) ──

  async listar(filtros?: Partial<{ estado: string; piso: number }>): Promise<Result<readonly Habitacion[]>> {
    try {
      const piso = filtros?.piso;
      const result = await firstValueFrom(this.listar$(piso !== undefined ? { piso } : undefined));
      if (result.ok) {
        let lista = result.value;
        if (filtros?.estado) lista = lista.filter((h) => h.estado === filtros.estado);
        return ok(lista);
      }
      throw new Error('Observable stream returned error');
    } catch (e) {
      const cached = [...this._estado$.getValue().values()];
      if (cached.length > 0) {
        let filtradas = cached as readonly Habitacion[];
        if (filtros?.piso) filtradas = filtradas.filter((h) => h.piso === filtros.piso);
        if (filtros?.estado) filtradas = filtradas.filter((h) => h.estado === filtros.estado);
        return ok(filtradas);
      }
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async obtener(id: string): Promise<Result<Habitacion>> {
    const cached = this._estado$.getValue().get(id);
    if (cached) return ok(cached);
    try {
      return await firstValueFrom(this.obtener$(id));
    } catch (e) {
      try {
        const hab = await fetchHabitacion(this.token, id);
        return ok(hab);
      } catch (e2) {
        return err(e2 instanceof Error ? e2 : new Error(String(e2)));
      }
    }
  }

  async cambiarEstado(id: string, nuevoEstado: string): Promise<Result<Habitacion>> {
    try {
      const res = await fetch(`${BASE_URL}/habitaciones/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return ok((data.habitacion ?? data) as Habitacion);
      // El backend emitirá un evento por PubSub → el stream listar$() se actualizará automáticamente
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
