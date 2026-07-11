import { Subject, Observable, from, of } from 'rxjs';
import {
  switchMap,
  mergeMap,
  map,
  catchError,
  filter,
  share,
  tap,
} from 'rxjs/operators';
import type { CrearReservaDTO, CheckInDTO, CheckOutDTO, VentaProductoDTO } from '../domain/types';

export type ComandoHotel =
  | { readonly _tipo: 'CHECKIN'; readonly payload: CheckInDTO }
  | { readonly _tipo: 'CHECKOUT'; readonly payload: CheckOutDTO }
  | { readonly _tipo: 'CREAR_RESERVA'; readonly payload: CrearReservaDTO }
  | { readonly _tipo: 'VENTA_PRODUCTO'; readonly payload: VentaProductoDTO }
  | { readonly _tipo: 'CANCELAR_RESERVA'; readonly payload: { readonly reserva_id: string } };

export type ResultadoComando<T = unknown> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string; readonly codigo?: string };

export const Comando = {
  checkin: (payload: CheckInDTO): ComandoHotel => ({ _tipo: 'CHECKIN', payload }),
  checkout: (payload: CheckOutDTO): ComandoHotel => ({ _tipo: 'CHECKOUT', payload }),
  crearReserva: (payload: CrearReservaDTO): ComandoHotel => ({ _tipo: 'CREAR_RESERVA', payload }),
  venta: (payload: VentaProductoDTO): ComandoHotel => ({ _tipo: 'VENTA_PRODUCTO', payload }),
  cancelarReserva: (id: string): ComandoHotel => ({ _tipo: 'CANCELAR_RESERVA', payload: { reserva_id: id } }),
} as const;

type CommandHandler<C extends ComandoHotel> = (
  payload: C['payload'],
) => Observable<ResultadoComando>;

export function createCommandHandler<C extends ComandoHotel>(
  effect: (payload: C['payload']) => Promise<unknown> | Observable<unknown>,
): CommandHandler<C> {
  return (payload: C['payload']): Observable<ResultadoComando> => {
    const result = effect(payload);
    return from(result as Promise<unknown> | Observable<unknown>).pipe(
      map((data): ResultadoComando => ({ ok: true, data })),
      catchError((err: Error): Observable<ResultadoComando> =>
        of({ ok: false, error: err.message ?? 'Error desconocido' }),
      ),
    );
  };
}

const comandoBus$ = new Subject<ComandoHotel>();

export function createCommandBus(
  handlers: Partial<Record<ComandoHotel['_tipo'], CommandHandler<ComandoHotel>>>,
): Observable<ResultadoComando> {
  return comandoBus$.pipe(
    filter((cmd) => cmd._tipo in handlers),
    mergeMap((cmd: ComandoHotel) => {
      const handler = handlers[cmd._tipo];
      return (handler ? handler(cmd.payload) : of<ResultadoComando>({ ok: false, error: 'Sin handler' })).pipe(
        map((resultado) => ({ ...resultado, _comando: cmd._tipo } as unknown as ResultadoComando)),
      );
    }),
    share(),
  );
}

export function streamDeTipo<TData>(
  tipo: ComandoHotel['_tipo'],
  bus$: Observable<ResultadoComando>,
): Observable<ResultadoComando<TData>> {
  return bus$.pipe(
    filter((r): r is ResultadoComando<TData> & { _comando: string } =>
      '_comando' in r && (r as { _comando: string })._comando === tipo,
    ),
  ) as Observable<ResultadoComando<TData>>;
}

export function withCommandLog(nombre: string) {
  return <T>(source$: Observable<T>): Observable<T> =>
    source$.pipe(
      tap({
        next: (v) => import.meta.env.DEV && console.log(`[CMD:${nombre}]`, v),
        error: (e) => console.error(`[CMD:${nombre}] Error:`, e),
      }),
    );
}

export function withSwitchEffect<T, R>(
  effect: (value: T) => Observable<R>,
) {
  return (source$: Observable<T>): Observable<R> =>
    source$.pipe(switchMap(effect));
}
