// ═══════════════════════════════════════════════════════════
// HotelFlux — Commands Stream (CQRS Command Bus Reactivo)
// ═══════════════════════════════════════════════════════════
//
// Demuestra Gestión de Efectos con Observables:
//
// 1. **Subject como Hot Observable** — punto de entrada del CQRS
// 2. **switchMap** — cancelación de efecto anterior (ej: anti-rebote en checkin)
// 3. **mergeMap** — ejecutar efectos en paralelo (ej: múltiples ventas)
// 4. **HOF: createCommandHandler** — fábrica de handlers (función que retorna función)
// 5. **Union Types (ADT)** — discriminated union para tipo-seguridad de comandos
// 6. **Inmutabilidad** — todos los tipos son readonly
// ═══════════════════════════════════════════════════════════

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

// ── Tipos de Comandos (Discriminated Union / ADT) ──
// Cada comando es una acción con tipo literal — inmutable

export type ComandoHotel =
  | { readonly _tipo: 'CHECKIN'; readonly payload: CheckInDTO }
  | { readonly _tipo: 'CHECKOUT'; readonly payload: CheckOutDTO }
  | { readonly _tipo: 'CREAR_RESERVA'; readonly payload: CrearReservaDTO }
  | { readonly _tipo: 'VENTA_PRODUCTO'; readonly payload: VentaProductoDTO }
  | { readonly _tipo: 'CANCELAR_RESERVA'; readonly payload: { readonly reserva_id: string } };

// ── Resultado de Comando (Result type / Either monad) ──

export type ResultadoComando<T = unknown> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string; readonly codigo?: string };

// ── Constructores de comandos (fábricas puras) ──

export const Comando = {
  checkin: (payload: CheckInDTO): ComandoHotel => ({ _tipo: 'CHECKIN', payload }),
  checkout: (payload: CheckOutDTO): ComandoHotel => ({ _tipo: 'CHECKOUT', payload }),
  crearReserva: (payload: CrearReservaDTO): ComandoHotel => ({ _tipo: 'CREAR_RESERVA', payload }),
  venta: (payload: VentaProductoDTO): ComandoHotel => ({ _tipo: 'VENTA_PRODUCTO', payload }),
  cancelarReserva: (id: string): ComandoHotel => ({ _tipo: 'CANCELAR_RESERVA', payload: { reserva_id: id } }),
} as const;

// ── HOF: Tipo de handler de comando ──
// Un handler es una función que recibe payload y retorna Observable de resultado

type CommandHandler<C extends ComandoHotel> = (
  payload: C['payload'],
) => Observable<ResultadoComando>;

// ── HOF: createCommandHandler — fábrica de handlers ──
// Recibe una función de efecto y retorna un handler tipado con manejo de errores
// HOF: función que recibe función y retorna función

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

// ── CQRS Command Bus ──
// Subject: Hot Observable — fuente de comandos que se comparte entre todos los suscriptores

const comandoBus$ = new Subject<ComandoHotel>();

// Stream de resultados de comandos — compartido (share)
let resultado$: Observable<ResultadoComando> | null = null;

/**
 * Emite un comando al bus CQRS.
 * Función pura desde el punto de vista del llamador (sin retorno).
 */
export function emitirComando(comando: ComandoHotel): void {
  comandoBus$.next(comando);
}

/**
 * HOF: crea el stream de efectos del bus de comandos.
 *
 * Recibe un mapa de handlers (HOF: Record<tipo, handler>).
 * Retorna un Observable que ejecuta los efectos y emite resultados.
 *
 * Demuestra:
 * - mergeMap: ejecuta efectos en paralelo (múltiples ventas simultáneas)
 * - switchMap: cancela el efecto anterior (anti-rebote para checkin)
 * - filter: solo procesar comandos con handler registrado
 */
export function createCommandBus(
  handlers: Partial<Record<ComandoHotel['_tipo'], CommandHandler<ComandoHotel>>>,
): Observable<ResultadoComando> {
  resultado$ ??= comandoBus$.pipe(
    // Solo procesar comandos con handler registrado
    filter((cmd) => cmd._tipo in handlers),

    // mergeMap: ejecuta efectos en paralelo (sin cancelar anteriores)
    // Para VENTA_PRODUCTO queremos procesarlas todas, no cancelar la anterior
    mergeMap((cmd: ComandoHotel) => {
      const handler = handlers[cmd._tipo];
      return (handler ? handler(cmd.payload) : of<ResultadoComando>({ ok: false, error: 'Sin handler' })).pipe(
        // Añadir metadata del comando al resultado (inmutable con spread)
        map((resultado) => ({ ...resultado, _comando: cmd._tipo } as unknown as ResultadoComando)),
      );
    }),

    // Compartir el stream (un solo bus para todos los suscriptores)
    share(),
  );

  return resultado$;
}

/**
 * HOF: crea un stream filtrado por tipo de comando.
 * Función que retorna Observable — currying en TypeScript.
 *
 * ## Ejemplo
 *   const checkouts$ = streamDeTipo<CheckOutDTO>('CHECKOUT', bus$);
 *   checkouts$.subscribe(resultado => console.log(resultado));
 */
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

/**
 * Operador HOF: withCommandLog — agrega logging a cualquier stream de comandos.
 * HOF: función que retorna una función operador (OperatorFunction).
 *
 * ## Ejemplo
 *   bus$.pipe(withCommandLog('CheckIn')).subscribe(...)
 */
export function withCommandLog(nombre: string) {
  return <T>(source$: Observable<T>): Observable<T> =>
    source$.pipe(
      tap({
        next: (v) => import.meta.env.DEV && console.log(`[CMD:${nombre}]`, v),
        error: (e) => console.error(`[CMD:${nombre}] Error:`, e),
      }),
    );
}

/**
 * Operador HOF: withSwitchMap — wrapper switchMap que cancela el efecto previo.
 * Útil para operaciones donde solo importa la última (ej: checkin).
 * HOF: recibe función de efecto, retorna operador.
 */
export function withSwitchEffect<T, R>(
  effect: (value: T) => Observable<R>,
) {
  return (source$: Observable<T>): Observable<R> =>
    source$.pipe(switchMap(effect));
}
