// ═══════════════════════════════════════════════════════════
// HotelFlux — Observable Repository: Tareas de Limpieza
//
// Observable Repository: el stream listar$() emite cuando:
//   1. Se carga la lista inicial desde REST
//   2. El backend notifica un cambio (asignación, estado)
//      vía PubSub → Channel "limpieza:lobby" → WebSocket
// ═══════════════════════════════════════════════════════════

import {
  Observable,
  BehaviorSubject,
  from,
  merge,
  NEVER,
  of,
} from 'rxjs';
import {
  map,
  scan,
  shareReplay,
  catchError,
  distinctUntilChanged,
} from 'rxjs/operators';
import type { ITareaRepository } from '../../application/ports';
import type { Result } from '../../domain/result';
import { ok, err } from '../../domain/result';
import type { TareaLimpieza } from '../../domain/entidades/tarea-limpieza';
import { getSocket, createMultiEventStream } from '../../streams/websocket.stream';
import type { Socket } from 'phoenix';

type TareasMap = ReadonlyMap<string, TareaLimpieza>;

interface TareaEvent {
  readonly tarea?: TareaLimpieza;
  readonly tareas?: readonly TareaLimpieza[];
  readonly tarea_id?: string;
  readonly estado?: string;
}

const TAREA_EVENTS = [
  'tarea_asignada',
  'tarea_actualizada',
  'limpieza:update',
  'estado_actualizado',
] as const;

function handleTareaLista(_: TareasMap, payload: TareaEvent): TareasMap {
  const lista = payload.tareas ?? [];
  return new Map(lista.map((t) => [t.id, t]));
}

function handleTareaUpsert(acc: TareasMap, payload: TareaEvent): TareasMap {
  if (payload.tarea) {
    const m = new Map(acc);
    m.set(payload.tarea.id, payload.tarea);
    return m as TareasMap;
  }
  return acc;
}

const tareaHandlers: Readonly<Record<string, (acc: TareasMap, payload: TareaEvent) => TareasMap>> = {
  lista_completa: handleTareaLista,
  tarea_asignada: handleTareaUpsert,
  tarea_actualizada: handleTareaUpsert,
  'limpieza:update': handleTareaUpsert,
  estado_actualizado: handleTareaUpsert,
  tarea_eliminada: handleTareaUpsert,
};

function acumularTareas(
  acc: TareasMap,
  { event, payload }: { event: string; payload: TareaEvent },
): TareasMap {
  return (tareaHandlers[event] ?? ((acc) => acc))(acc, payload);
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function fetchTareas(
  token: string,
  filtros?: Partial<{ estado: string; personal_id: string }>,
): Promise<readonly TareaLimpieza[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.personal_id) params.set('personal_id', filtros.personal_id);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE_URL}/tareas-limpieza${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.tareas ?? data) as readonly TareaLimpieza[];
}

export class TareaObservableRepository implements ITareaRepository {
  private readonly token: string;
  private readonly socket: Socket;
  private readonly _estado$ = new BehaviorSubject<TareasMap>(new Map());
  private readonly _shared$: Observable<Result<readonly TareaLimpieza[]>>;

  constructor(token: string) {
    this.token = token;
    this.socket = getSocket(token);

    const initial$ = from(
      fetchTareas(token).catch(() => [] as readonly TareaLimpieza[]),
    ).pipe(
      map((lista) => ({
        event: 'lista_completa',
        payload: { tareas: lista } as TareaEvent,
      })),
    );

    const updates$ = createMultiEventStream<TareaEvent>(
      this.socket,
      'hotel:lobby',
      TAREA_EVENTS as unknown as string[],
    ).pipe(catchError(() => NEVER));

    this._shared$ = merge(initial$, updates$).pipe(
      scan(acumularTareas, new Map() as TareasMap),
      map((mapa) => {
        this._estado$.next(mapa);
        const lista = [...mapa.values()].sort((a, b) => b.prioridad - a.prioridad);
        return ok(lista as readonly TareaLimpieza[]);
      }),
      distinctUntilChanged((prev, curr) => {
        if (!prev.ok || !curr.ok) return false;
        return (
          prev.value.length === curr.value.length &&
          prev.value.every((t, i) => t.id === curr.value[i]?.id && t.estado === curr.value[i]?.estado)
        );
      }),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  // ── Observable Repository ──

  listar$(filtros?: Partial<{ estado: string; personal_id: string }>): Observable<Result<readonly TareaLimpieza[]>> {
    if (!filtros?.estado && !filtros?.personal_id) return this._shared$;
    return this._shared$.pipe(
      map((result) => {
        if (!result.ok) return result;
        let lista = result.value;
        if (filtros?.estado) lista = lista.filter((t) => t.estado === filtros.estado);
        if (filtros?.personal_id) lista = lista.filter((t) => t.empleado_id === filtros.personal_id);
        return ok(lista);
      }),
    );
  }

  // ── Métodos imperativos ──

  async listar(filtros?: Partial<{ estado: string; personal_id: string }>): Promise<Result<readonly TareaLimpieza[]>> {
    try {
      return ok(await fetchTareas(this.token, filtros));
    } catch (e) {
      const cached = [...this._estado$.getValue().values()];
      if (cached.length > 0) return ok(cached as readonly TareaLimpieza[]);
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async actualizarEstado(id: string, estado: string): Promise<Result<TareaLimpieza>> {
    try {
      const res = await fetch(`${BASE_URL}/tareas/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return ok((data.tarea ?? data) as TareaLimpieza);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
