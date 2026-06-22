// ═══════════════════════════════════════════════════════════
// HotelFlux — Result<T, E> — Tipo Algebraico para Manejo de Errores
//
// Implementa Railway Oriented Programming en TypeScript.
// Elimina excepciones no controladas de los flujos de datos.
//
// Principios demostrados:
// - Tipo algebraico (union type discriminado)
// - Funciones puras: map, flatMap, recover, fold
// - HOF: map y flatMap reciben funciones como parámetros
// - Composición: los Results se encadenan como un pipeline
// ═══════════════════════════════════════════════════════════

// [TIPO ALGEBRAICO] — Result<T, E> = Ok<T> | Err<E>
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ──────────────────────────────────────────────────────────
// CONSTRUCTORES
// ──────────────────────────────────────────────────────────

/** Crea un Result exitoso. Constructor puro. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Crea un Result fallido. Constructor puro. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// ──────────────────────────────────────────────────────────
// TRANSFORMACIONES (Functor + Mónada)
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Aplica una función al valor si es Ok; propaga el error si es Err.
 * Equivalente a `fmap` en Haskell.
 *
 * @example
 *   pipe(ok(5), mapResult(x => x * 2))   // → ok(10)
 *   pipe(err('fallo'), mapResult(x => x * 2)) // → err('fallo')
 */
export const mapResult =
  <T, U, E>(fn: (value: T) => U) =>
  (result: Result<T, E>): Result<U, E> =>
    result.ok ? ok(fn(result.value)) : result;

/**
 * [HOF] Encadena operaciones que pueden fallar (monadic bind).
 * Se detiene en el primer error: Railway Oriented Programming.
 *
 * @example
 *   pipe(ok(id), flatMapResult(buscarHabitacion), flatMapResult(validarDisponibilidad))
 */
export const flatMapResult =
  <T, U, E>(fn: (value: T) => Result<U, E>) =>
  (result: Result<T, E>): Result<U, E> =>
    result.ok ? fn(result.value) : result;

/**
 * [HOF] Transforma el error; deja el Ok intacto.
 * Mapeo sobre el "carril de error".
 */
export const mapError =
  <T, E, F>(fn: (error: E) => F) =>
  (result: Result<T, E>): Result<T, F> =>
    result.ok ? result : err(fn(result.error));

/**
 * [HOF] Recupera un error con una función de recuperación.
 * Permite "curar" errores y continuar el pipeline.
 *
 * @example
 *   pipe(err('cache_miss'), recoverResult(() => ok(valorPorDefecto)))
 */
export const recoverResult =
  <T, E>(fn: (error: E) => Result<T, E>) =>
  (result: Result<T, E>): Result<T, E> =>
    result.ok ? result : fn(result.error);

/**
 * [HOF] Extrae el valor o retorna un default.
 * Función pura — no lanza excepciones.
 */
export const getOrElse =
  <T>(defaultValue: T) =>
  <E>(result: Result<T, E>): T =>
    result.ok ? result.value : defaultValue;

/**
 * [HOF] Fold: colapsa ambos carriles en un tipo común U.
 * onOk primero (carril derecho), onErr segundo (carril error).
 * Equivalente a `either` en Haskell pero con orden natural success-first.
 *
 * @example
 *   fold(
 *     value => `Éxito: ${value}`,   // carril Ok
 *     error => `Error: ${error}`,    // carril Err
 *   )(result)
 */
export const fold =
  <T, E, U>(onOk: (value: T) => U, onErr: (error: E) => U) =>
  (result: Result<T, E>): U =>
    result.ok ? onOk(result.value) : onErr(result.error);

// ──────────────────────────────────────────────────────────
// PREDICADOS
// ──────────────────────────────────────────────────────────

/** Verdadero si el resultado es Ok. Type guard. */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } =>
  result.ok === true;

/** Verdadero si el resultado es Err. Type guard. */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
  result.ok === false;

// ──────────────────────────────────────────────────────────
// COLECCIONES DE RESULTS
// ──────────────────────────────────────────────────────────

/**
 * [RECURSIÓN] Toma un array de Results y retorna Ok con todos los valores,
 * o el primer Error encontrado.
 * Equivalente a `Promise.all` pero para Results síncronos.
 *
 * @example
 *   sequence([ok(1), ok(2), ok(3)])    // → ok([1, 2, 3])
 *   sequence([ok(1), err('fallo')])     // → err('fallo')
 */
export const sequence = <T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> =>
  results.reduce(
    (acc: Result<T[], E>, current: Result<T, E>): Result<T[], E> =>
      acc.ok
        ? current.ok
          ? ok([...acc.value, current.value])
          : current
        : acc,
    ok([] as T[]),
  );

/**
 * [HOF] Aplica una función a cada elemento y retorna Ok con todos
 * los resultados o el primer Error.
 */
export const traverse =
  <T, U, E>(fn: (item: T) => Result<U, E>) =>
  (items: readonly T[]): Result<readonly U[], E> =>
    sequence(items.map(fn));

/**
 * Convierte una función que puede lanzar excepciones en una que retorna Result.
 * [HOF] — envuelve funciones imperativas en el patrón funcional.
 */
export const tryCatch = <T, E = Error>(
  fn: () => T,
  onError: (e: unknown) => E,
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (e) {
    return err(onError(e));
  }
};

/**
 * Convierte una Promise en una Promise<Result<T, E>> usando solo .then/.catch.
 * Nunca rechaza — siempre resuelve con Result. Sin async/await ni try/catch.
 */
/**
 * Convierte un valor desconocido en Error usando el tipo Result.
 * Función pura: encapsula la verificación de tipo.
 */
export const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

export const fromPromise = <T, E = Error>(
  promise: Promise<T>,
  onError: (e: unknown) => E,
): Promise<Result<T, E>> =>
  promise.then(
    (value: T): Result<T, E> => ok(value),
    (e: unknown): Result<T, E> => err(onError(e)),
  );
