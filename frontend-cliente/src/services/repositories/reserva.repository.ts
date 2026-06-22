import {
  Observable,
  BehaviorSubject,
  from,
  merge,
  NEVER,
  of,
  firstValueFrom,
  iif,
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
import { ok, err, flatMapResult, fromPromise } from '../../domain/result';
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

function handleListaCompleta(_: ReservasMap, payload: ReservaEvent): ReservasMap {
  const lista = payload.reservas ?? [];
  return new Map(lista.map((r) => [r.id, r]));
}

function handleReservaUpsert(acc: ReservasMap, payload: ReservaEvent): ReservasMap {
  const { reserva } = payload;
  return reserva
    ? new Map(acc).set(reserva.id, reserva) as ReservasMap
    : acc;
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
  return (reservaHandlers[event] ?? ((acc: ReservasMap) => acc))(acc, payload);
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function buildReservaParams(filtros?: Partial<{ estado: string }>): string {
  const entries = Object.entries(filtros ?? {}).filter(([, v]) => v != null);
  const params = new URLSearchParams(entries as [string, string][]);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchReservas(token: string, filtros?: Partial<{ estado: string }>): Promise<readonly Reserva[]> {
  const res = await fetch(`${BASE_URL}/reservas${buildReservaParams(filtros)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = res.ok ? await res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
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
      distinctUntilChanged((prev, curr) =>
        prev.ok && curr.ok
          ? prev.value.length === curr.value.length &&
            prev.value.every((r, i) => r.id === curr.value[i]?.id && r.estado === curr.value[i]?.estado)
          : false,
      ),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  listar$(filtros?: Partial<{ estado: string }>): Observable<Result<readonly Reserva[]>> {
    const filtered$ = this._shared$.pipe(
      map(flatMapResult<readonly Reserva[], readonly Reserva[], Error>((reservas) =>
        ok(reservas.filter((r) => r.estado === filtros!.estado)),
      )),
    );
    return iif(() => !!filtros?.estado, filtered$, this._shared$);
  }

  activas$(): Observable<Result<readonly Reserva[]>> {
    return this._shared$.pipe(
      map(flatMapResult<readonly Reserva[], readonly Reserva[], Error>((reservas) =>
        ok(reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in')),
      )),
    );
  }

  async listar(filtros?: Partial<{ estado: string }>): Promise<Result<readonly Reserva[]>> {
    const fromStream = await fromPromise(
      firstValueFrom(this.listar$(filtros)).then((result) =>
        result.ok ? result : Promise.reject(new Error('Stream error')),
      ),
      () => null as Result<readonly Reserva[]> | null,
    );
    return fromStream.ok && fromStream.value
      ? fromStream.value
      : (() => {
          const cached = [...this._estado$.getValue().values()] as readonly Reserva[];
          const filtradas = filtros?.estado
            ? cached.filter((r) => r.estado === filtros.estado)
            : cached;
          return filtradas.length > 0
            ? ok(filtradas)
            : err(new Error('No data available'));
        })();
  }

  async obtener(id: string): Promise<Result<Reserva>> {
    const cached = this._estado$.getValue().get(id);
    return cached
      ? ok(cached)
      : fromPromise(
          fetch(`${BASE_URL}/reservas/${id}`, {
            headers: { Authorization: `Bearer ${this.token}` },
          }).then((res) =>
            res.ok
              ? (res.json() as Promise<{ reserva?: Reserva }>).then((d) => (d.reserva ?? d) as Reserva)
              : Promise.reject(new Error(`HTTP ${res.status}`)),
          ),
          (e) => e instanceof Error ? e : new Error(String(e)),
        );
  }

  async crear(params: CrearReservaParams): Promise<Result<Reserva>> {
    return fromPromise(
      fetch(`${BASE_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(params),
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ reserva?: Reserva }>).then((d) => (d.reserva ?? d) as Reserva)
          : (res.json() as Promise<{ error?: string }>)
              .then(null, () => ({} as { error?: string }))
              .then((body) => Promise.reject(new Error(body.error ?? `HTTP ${res.status}`))),
      ),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
  }

  async actualizar(id: string, params: Partial<Reserva>): Promise<Result<Reserva>> {
    return fromPromise(
      fetch(`${BASE_URL}/reservas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(params),
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ reserva?: Reserva }>).then((d) => (d.reserva ?? d) as Reserva)
          : Promise.reject(new Error(`HTTP ${res.status}`)),
      ),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
  }

  async listarActivas(): Promise<Result<readonly Reserva[]>> {
    const desdeApi = await fromPromise(
      fetch(`${BASE_URL}/reservas/activas`, {
        headers: { Authorization: `Bearer ${this.token}` },
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ reservas?: readonly Reserva[] }>).then(
              (d) => (d.reservas ?? d) as readonly Reserva[],
            )
          : Promise.reject(new Error(`HTTP ${res.status}`)),
      ),
      () => null as readonly Reserva[] | null,
    );
    return desdeApi.ok && desdeApi.value
      ? ok(desdeApi.value)
      : (() => {
          const cached = [...this._estado$.getValue().values()].filter(
            (r) => r.estado === 'confirmada' || r.estado === 'checked_in',
          ) as readonly Reserva[];
          return cached.length > 0
            ? ok(cached)
            : err(new Error('No active reservations'));
        })();
  }
}
