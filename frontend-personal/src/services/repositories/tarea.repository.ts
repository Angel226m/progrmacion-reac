import {
  Observable,
  BehaviorSubject,
  from,
  merge,
  NEVER,
  of,
  iif,
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
import { ok, err, fromPromise } from '../../domain/result';
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
  const { tarea } = payload;
  return tarea
    ? new Map(acc).set(tarea.id, tarea) as TareasMap
    : acc;
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
  return (tareaHandlers[event] ?? ((acc: TareasMap) => acc))(acc, payload);
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function buildTareaParams(filtros?: Partial<{ estado: string; personal_id: string }>): string {
  const entries = Object.entries(filtros ?? {}).filter(([, v]) => v != null);
  const params = new URLSearchParams(entries as [string, string][]);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchTareas(
  token: string,
  filtros?: Partial<{ estado: string; personal_id: string }>,
): Promise<readonly TareaLimpieza[]> {
  const res = await fetch(`${BASE_URL}/tareas-limpieza${buildTareaParams(filtros)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = res.ok ? await res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
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
      distinctUntilChanged((prev, curr) =>
        prev.ok && curr.ok
          ? prev.value.length === curr.value.length &&
            prev.value.every((t, i) => t.id === curr.value[i]?.id && t.estado === curr.value[i]?.estado)
          : false,
      ),
      catchError((e) => of(err(e instanceof Error ? e : new Error(String(e))))),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  listar$(filtros?: Partial<{ estado: string; personal_id: string }>): Observable<Result<readonly TareaLimpieza[]>> {
    const filtered$ = this._shared$.pipe(
      map((result) =>
        result.ok
          ? ok(
              result.value.filter(
                (t) =>
                  (!filtros?.estado || t.estado === filtros.estado) &&
                  (!filtros?.personal_id || t.empleado_id === filtros.personal_id),
              ),
            )
          : result,
      ),
    );
    return iif(() => !!filtros?.estado || !!filtros?.personal_id, filtered$, this._shared$);
  }

  async listar(filtros?: Partial<{ estado: string; personal_id: string }>): Promise<Result<readonly TareaLimpieza[]>> {
    const desdeApi = await fromPromise(
      fetchTareas(this.token, filtros).then(ok),
      () => null as Result<readonly TareaLimpieza[]> | null,
    );
    return desdeApi.ok && desdeApi.value
      ? desdeApi.value
      : (() => {
          const cached = [...this._estado$.getValue().values()] as readonly TareaLimpieza[];
          return cached.length > 0
            ? ok(cached)
            : err(new Error('No data available'));
        })();
  }

  async actualizarEstado(id: string, estado: string): Promise<Result<TareaLimpieza>> {
    return fromPromise(
      fetch(`${BASE_URL}/tareas/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ estado }),
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ tarea?: TareaLimpieza }>).then((d) => (d.tarea ?? d) as TareaLimpieza)
          : Promise.reject(new Error(`HTTP ${res.status}`)),
      ),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
  }
}
