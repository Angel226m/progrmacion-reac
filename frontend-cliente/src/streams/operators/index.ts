// ═══════════════════════════════════════════════════════════
// HotelFlux — Operadores RxJS Personalizados
//
// Operadores HOF que extienden RxJS para el dominio hotelero.
// Cada operador es una función que retorna un OperatorFunction.
//
// Principios demostrados:
// - [HOF] Funciones que retornan OperatorFunction<T, T>
// - [BACKPRESSURE] Control de flujo con buffers y throttle
// - [INMUTABILIDAD] Los operadores no mutan los valores emitidos
// - [COMPOSICIÓN] Se componen con pipe() de RxJS
// - [RECURSIÓN IMPLÍCITA] vía scan con acumulador
// ═══════════════════════════════════════════════════════════

import {
  Observable,
  OperatorFunction,
  of,
  timer,
  from,
} from 'rxjs';
import {
  bufferCount,
  mergeMap,
  catchError,
  retryWhen,
  delayWhen,
  distinctUntilChanged,
  scan,
  throttleTime,
  debounceTime,
  shareReplay,
  map,
  filter,
  take,
  tap,
} from 'rxjs/operators';

// Re-export para usabilidad
export { from, of };

// ──────────────────────────────────────────────────────────
// BACKPRESSURE
// ──────────────────────────────────────────────────────────

/**
 * [HOF - BACKPRESSURE] Procesa eventos en lotes (batches).
 * Acumula `bufferSize` eventos y los emite de a uno en mergeMap.
 * Evita saturar el consumidor cuando el productor es muy rápido.
 *
 * @example
 *   habitacionEvents$.pipe(withBackpressure(10))
 */
export const withBackpressure =
  <T>(bufferSize: number): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(
      bufferCount(bufferSize),
      // [HOF] mergeMap recibe función que retorna Observable
      mergeMap((batch: T[]) => from(batch)),
    );

/**
 * [HOF - BACKPRESSURE] Ventana deslizante: mantiene los últimos N valores.
 * Patrón scan con acumulador — limita el uso de memoria.
 *
 * @example
 *   metricas$.pipe(slidingWindow(60)) // máximo 60 puntos en historial
 */
export const slidingWindow =
  <T>(maxItems: number): OperatorFunction<T, readonly T[]> =>
  (source$: Observable<T>) =>
    source$.pipe(
      // [SCAN = fold reactivo con acumulador inmutable]
      scan(
        (acc: readonly T[], item: T): readonly T[] =>
          // Agrega nuevo item y descarta el más antiguo si supera el límite
          acc.length >= maxItems ? [...acc.slice(-(maxItems - 1)), item] : [...acc, item],
        [] as readonly T[],
      ),
    );

/**
 * [HOF - BACKPRESSURE] Throttle adaptativo: reduce emisiones en alta carga.
 * Limita a una emisión por intervalo de tiempo.
 *
 * @example
 *   websocketEvents$.pipe(adaptiveThrottle(100)) // máximo 10 eventos/seg
 */
export const adaptiveThrottle =
  <T>(intervalMs: number): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(throttleTime(intervalMs, undefined, { leading: true, trailing: true }));

/**
 * [HOF - BACKPRESSURE] Debounce para búsquedas y filtros.
 * Espera silencio antes de emitir — evita llamadas en cada keystroke.
 *
 * @example
 *   busqueda$.pipe(withDebounce(300))
 */
export const withDebounce =
  <T>(ms = 300): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(debounceTime(ms));

// ──────────────────────────────────────────────────────────
// ERROR HANDLING FUNCIONAL
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Reintentos con backoff exponencial.
 * Cada reintento espera más tiempo: 1s, 2s, 4s, 8s...
 * HOF: recibe configuración y retorna OperatorFunction.
 *
 * @example
 *   api$.pipe(retryWithExponentialBackoff(3, 1000))
 */
export const retryWithExponentialBackoff =
  <T>(maxRetries: number, baseDelayMs = 1000): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(
      retryWhen((errors$) =>
        errors$.pipe(
          // [SCAN] acumula el número de reintentos
          scan((retryCount, error) => {
            if (retryCount >= maxRetries) throw error;
            return retryCount + 1;
          }, 0),
          // [HOF] delayWhen recibe función que retorna Observable de timer
          delayWhen((retryCount) => timer(baseDelayMs * Math.pow(2, retryCount - 1))),
        ),
      ),
    );

/**
 * [HOF] Maneja errores retornando un valor por defecto.
 * El stream NO termina ante errores — los convierte en valores.
 *
 * @example
 *   api$.pipe(withFallback([])) // retorna [] si falla
 */
export const withFallback =
  <T>(defaultValue: T): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(catchError(() => of(defaultValue)));

// ──────────────────────────────────────────────────────────
// DISTINCTNESS / OPTIMIZACIÓN
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Compara por JSON serialization (deep equality).
 * Evita re-renders cuando el valor es estructuralmente igual.
 *
 * @example
 *   habitaciones$.pipe(distinctUntilChangedDeep())
 */
export const distinctUntilChangedDeep =
  <T>(): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(
      distinctUntilChanged<T>(
        (a, b) => JSON.stringify(a) === JSON.stringify(b),
      ),
    );

/**
 * [HOF] Emite solo si una propiedad específica cambia.
 * Más eficiente que deep equality para objetos grandes.
 *
 * @example
 *   estado$.pipe(distinctByKey('estado'))
 */
export const distinctByKey =
  <T, K extends keyof T>(key: K): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(distinctUntilChanged((a, b) => a[key] === b[key]));

// ──────────────────────────────────────────────────────────
// SCAN (fold reactivo)
// ──────────────────────────────────────────────────────────

/**
 * [HOF - SCAN INMUTABLE] Acumulador que garantiza inmutabilidad.
 * La función reductora recibe una copia readonly del acumulador.
 *
 * @example
 *   events$.pipe(
 *     scanInmutable(
 *       (acc, event) => new Map([...acc, [event.id, event]]),
 *       new Map()
 *     )
 *   )
 */
export const scanInmutable =
  <T, U>(
    reducer: (acc: Readonly<U>, item: T) => U,
    seed: U,
  ): OperatorFunction<T, U> =>
  (source$: Observable<T>) =>
    source$.pipe(
      scan((acc: U, item: T) => reducer(Object.freeze({ ...acc } as Readonly<U>), item), seed),
    );

// ──────────────────────────────────────────────────────────
// HOT OBSERVABLES
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Convierte un stream en hot observable con replay del último valor.
 * shareReplay(1): todos los suscriptores reciben el último estado.
 *
 * @example
 *   const habitaciones$ = raw$.pipe(asHotWithReplay());
 */
export const asHotWithReplay =
  <T>(bufferSize = 1): OperatorFunction<T, T> =>
  (source$: Observable<T>) =>
    source$.pipe(shareReplay(bufferSize));

// ──────────────────────────────────────────────────────────
// UTILIDADES
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Filtra valores nulos/undefined del stream.
 * Type guard: el resultado es Observable<NonNullable<T>>.
 *
 * @example
 *   stream$.pipe(filterNonNull())
 */
export const filterNonNull =
  <T>(): OperatorFunction<T | null | undefined, NonNullable<T>> =>
  (source$: Observable<T | null | undefined>) =>
    source$.pipe(filter((v): v is NonNullable<T> => v != null));

/**
 * [HOF] Logging de stream sin modificar valores (tap wrapper).
 * Solo activo en desarrollo.
 *
 * @example
 *   habitaciones$.pipe(debugLog('habitaciones'))
 */
export const debugLog =
  <T>(label: string): OperatorFunction<T, T> =>
  (source$: Observable<T>) => {
    if (import.meta.env.DEV) {
      return source$.pipe(
        tap((value) => console.log(`[${label}]`, value)),
      );
    }
    return source$;
  };

/**
 * [HOF] Transforma el stream y agrega timestamp a cada emisión.
 */
export const withTimestamp =
  <T>(): OperatorFunction<T, { readonly value: T; readonly timestamp: number }> =>
  (source$: Observable<T>) =>
    source$.pipe(map((value) => ({ value, timestamp: Date.now() })));

/**
 * [HOF] Toma solo el primer valor del stream (para inicialización).
 */
export const takeFirst = <T>(): OperatorFunction<T, T> => (source$) => source$.pipe(take(1));
