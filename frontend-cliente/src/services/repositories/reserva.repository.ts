// ═══════════════════════════════════════════════════════════
// HotelFlux — Observable Repository: Reservas
//
// Mismo patrón que HabitacionObservableRepository:
//   listar$() = merge(REST inicial, WebSocket updates)
//                |> scan(acumular) |> shareReplay(1)
//
// La capa de datos emite nuevos valores cada vez que el backend
// notifica vía PubSub → Channel → WebSocket.
// El componente React no sabe si el dato viene de la API o del WS.
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
  scan,
  shareReplay,
  catchError,
  distinctUntilChanged,
} from 'rxjs/operators';
import type { IReservaRepository, CrearReservaParams } from '../../application/ports';
import type { Result } from '../../domain/result';
import { ok, err } from '../../domain/result';
import type { Reserva } from '../../domain/entidades/reserva';
import { getSocket, createMultiEventStream } from '../../streams/websocket.stream';
import type { Socket } from 'phoenix';

type ReservasMap = ReadonlyMap<string, Reserva>;

interface ReservaEvent {
  readonly reserva?: Reserva;
  readonly reserva_id?: string;
  readonly estado?: string;
  readonly reservas?: readonly Reserva[];
}

const RESERVA_EVENTS = [
  'reserva_creada',
  'reserva_actualizada',
  'reserva:update',
  'checkin_realizado',
  'checkout_realizado',
] as const;

// ── Función pura: acumulador de eventos de reserva ──

function handleListaCompleta(_: ReservasMap, payload: ReservaEvent): ReservasMap {
  const lista = payload.reservas ?? [];
  return new Map(lista.map((r) => [r.id, r]));
}

function handleReservaUpsert(acc: ReservasMap, payload: ReservaEvent): ReservasMap {
  if (payload.reserva) {
    const m = new Map(acc);
    m.set(payload.reserva.id, payload.reserva);
    return m as ReservasMap;
  }
  return acc;
}

const reservaHandlers: Readonly<Record<string, (acc: ReservasMap, payload: ReservaEvent) => ReservasMap>> = {
  lista_completa: handleListaCompleta,
  reserva_creada: handleReservaUpsert,
  reserva_actualizada: handleReservaUpsert,
  'reserva:update': handleReservaUpsert,
  checkin_realizado: handleReservaUpsert,
  checkout_realizado: handleReservaUpsert,
  reserva_eliminada: handleReservaUpsert,
};

function acumularReservas(
  acc: ReservasMap,
  { event, payload }: { event: string; payload: ReservaEvent },
): ReservasMap {
  return (reservaHandlers[event] ?? ((acc) => acc))(acc, payload);
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function fetchReservas(token: string, filtros?: Partial<{ estado: string }>): Promise<readonly Reserva[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE_URL}/reservas${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.reservas ?? data) as readonly Reserva[];
}

export class ReservaObservableRepository implements IReservaRepository {
  private readonly token: string;
  private readonly socket: Socket;
  private readonly _estado$ = new BehaviorSubject<ReservasMap>(new Map());
  private readonly _shared$: Observable<Result<readonly Reserva[]>>;

  constructor(token: string) {
    this.token = token;
    this.socket = getSocket(token);

    const initial$ = from(
      fetchReservas(token).catch(() => [] as readonly Reserva[]),
    ).pipe(
      map((lista) => ({
        event: 'lista_completa',
        payload: { reservas: lista } as ReservaEvent,
      })),
    );

    const updates$ = createMultiEventStream<ReservaEvent>(
      this.socket,
      'hotel:lobby',
      RESERVA_EVENTS as unknown as string[],
    ).pipe(catchError(() => NEVER));

    this._shared$ = merge(initial$, updates$).pipe(
      scan(acumularReservas, new Map() as ReservasMap),
      map((mapa) => {
        this._estado$.next(mapa);
        const lista = [...mapa.values()].sort(
          (a, b) => new Date(b.inserted_at).getTime() - new Date(a.inserted_at).getTime(),
        );
        return ok(lista as readonly Reserva[]);
      }),
      distinctUntilChanged((prev, curr) => {
        if (!prev.ok || !curr.ok) return false;
        return (
          prev.value.length === curr.value.length &&
          prev.value.every((r, i) => r.id === curr.value[i]?.id && r.estado === curr.value[i]?.estado)
        );
      }),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  // ── Observable Repository ──

  listar$(filtros?: Partial<{ estado: string }>): Observable<Result<readonly Reserva[]>> {
    if (!filtros?.estado) return this._shared$;
    return this._shared$.pipe(
      map((result) => {
        if (!result.ok) return result;
        return ok(result.value.filter((r) => r.estado === filtros.estado));
      }),
    );
  }

  activas$(): Observable<Result<readonly Reserva[]>> {
    return this._shared$.pipe(
      map((result) => {
        if (!result.ok) return result;
        return ok(result.value.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in'));
      }),
    );
  }

  // ── Métodos imperativos (delegan en Observable como fuente de verdad) ──

  async listar(filtros?: Partial<{ estado: string }>): Promise<Result<readonly Reserva[]>> {
    try {
      const result = await firstValueFrom(this.listar$(filtros));
      if (result.ok) return result;
      throw new Error('Observable stream returned error');
    } catch (e) {
      const cached = [...this._estado$.getValue().values()];
      if (cached.length > 0) {
        const filtradas = filtros?.estado ? cached.filter((r) => r.estado === filtros.estado) : cached;
        return ok(filtradas as readonly Reserva[]);
      }
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async obtener(id: string): Promise<Result<Reserva>> {
    const cached = this._estado$.getValue().get(id);
    if (cached) return ok(cached);
    try {
      const res = await fetch(`${BASE_URL}/reservas/${id}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return ok((data.reserva ?? data) as Reserva);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async crear(params: CrearReservaParams): Promise<Result<Reserva>> {
    try {
      const res = await fetch(`${BASE_URL}/reservas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      return ok((data.reserva ?? data) as Reserva);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async actualizar(id: string, params: Partial<Reserva>): Promise<Result<Reserva>> {
    try {
      const res = await fetch(`${BASE_URL}/reservas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return ok((data.reserva ?? data) as Reserva);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async listarActivas(): Promise<Result<readonly Reserva[]>> {
    try {
      const res = await fetch(`${BASE_URL}/reservas/activas`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return ok((data.reservas ?? data) as readonly Reserva[]);
    } catch (e) {
      const cached = [...this._estado$.getValue().values()].filter(
        (r) => r.estado === 'confirmada' || r.estado === 'checked_in',
      );
      return cached.length > 0
        ? ok(cached as readonly Reserva[])
        : err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
