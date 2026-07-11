// ═══════════════════════════════════════════════════════════
// HotelFlux — Higher-Order Functions del Dominio
//
// Funciones de orden superior reutilizables para transformar,
// componer y combinar funciones. Base matemática del λ-cálculo.
//
// Principios demostrados:
// - [HOF] Funciones que reciben y/o retornan funciones
// - [CURRYING] Aplicación parcial de parámetros
// - [COMPOSICIÓN] pipe, compose para encadenar transformaciones
// - [INMUTABILIDAD] Nunca se mutan los argumentos
// - [TIPOS] Tipado genérico estricto con TypeScript
// ═══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// COMPOSICIÓN DE FUNCIONES
// ──────────────────────────────────────────────────────────

/**
 * [HOF - COMPOSICIÓN] Encadena funciones de izquierda a derecha.
 * pipe(f, g, h)(x) === h(g(f(x)))
 *
 * @example
 *   const procesarHabitacion = pipe(
 *     normalizarEstado,
 *     calcularPrecioConIGV,
 *     agregarClasificacion
 *   );
 *   procesarHabitacion(habitacionRaw);
 */
export function pipe<A>(x: A): A;
export function pipe<A, B>(x: A, f1: (a: A) => B): B;
export function pipe<A, B, C>(x: A, f1: (a: A) => B, f2: (b: B) => C): C;
export function pipe<A, B, C, D>(x: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): D;
export function pipe<A, B, C, D, E>(
  x: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  x: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
  f5: (e: E) => F,
): F;
export function pipe(x: unknown, ...fns: Array<(a: unknown) => unknown>): unknown {
  // [RECURSIÓN IMPLÍCITA vía reduce — fold izquierdo]
  return fns.reduce((acc, fn) => fn(acc), x);
}

/**
 * [HOF - COMPOSICIÓN] Encadena funciones de derecha a izquierda.
 * compose(f, g, h)(x) === f(g(h(x)))
 *
 * Matemáticamente: (f ∘ g ∘ h)(x) = f(g(h(x)))
 */
export const compose =
  <T>(...fns: ReadonlyArray<(x: T) => T>) =>
  (x: T): T =>
    // [RECURSIÓN DE COLA vía reduceRight — fold derecho]
    fns.reduceRight((acc, fn) => fn(acc), x);

// ──────────────────────────────────────────────────────────
// CURRYING / APLICACIÓN PARCIAL
// ──────────────────────────────────────────────────────────

/**
 * [HOF - CURRYING] Filtra una lista por una propiedad específica.
 * Retorna una función que filtra por ese valor.
 *
 * @example
 *   const soloDisponibles = filtrarPor<Habitacion>('estado')('disponible');
 *   habitaciones.filter(soloDisponibles);
 */
export const filtrarPor =
  <T>(propiedad: keyof T) =>
  (valor: T[typeof propiedad]) =>
  (lista: readonly T[]): readonly T[] =>
    lista.filter((item) => item[propiedad] === valor);

/**
 * [HOF - CURRYING] Agrupa una lista por una propiedad.
 * Retorna función que agrupa por esa propiedad.
 *
 * @example
 *   const porEstado = agruparPor<Habitacion>('estado');
 *   porEstado(habitaciones); // → { disponible: [...], ocupada: [...] }
 */
export const agruparPor =
  <T>(propiedad: keyof T) =>
  (lista: readonly T[]): Record<string, readonly T[]> =>
    lista.reduce(
      (grupos, item) => {
        const clave = String(item[propiedad]);
        const grupo = grupos[clave] ?? [];
        return { ...grupos, [clave]: [...grupo, item] };
      },
      {} as Record<string, readonly T[]>,
    );

/**
 * [HOF - CURRYING] Ordena una lista por una propiedad.
 * Función curried: primero la propiedad, luego la dirección.
 *
 * @example
 *   const porPiso = ordenarPor<Habitacion>('piso')('asc');
 *   [...habitaciones].sort(porPiso);
 */
export const ordenarPor =
  <T>(propiedad: keyof T) =>
  (direccion: 'asc' | 'desc') =>
  (a: T, b: T): number => {
    const va = a[propiedad];
    const vb = b[propiedad];
    return va < vb ? (direccion === 'asc' ? -1 : 1) : va > vb ? (direccion === 'asc' ? 1 : -1) : 0;
  };

/**
 * [HOF - CURRYING] Transforma cada elemento de una lista.
 * Versión curried de Array.map para composición.
 *
 * @example
 *   const duplicar = transformar<number>(x => x * 2);
 *   duplicar([1, 2, 3]); // → [2, 4, 6]
 */
export const transformar =
  <T, U = T>(fn: (item: T) => U) =>
  (lista: readonly T[]): readonly U[] =>
    lista.map(fn);

/**
 * [HOF - CURRYING] Filtra una lista con un predicado.
 * Versión curried de Array.filter para composición.
 */
export const filtrarCon =
  <T>(predicado: (item: T) => boolean) =>
  (lista: readonly T[]): readonly T[] =>
    lista.filter(predicado);

/**
 * [HOF - CURRYING] Reduce una lista con acumulador.
 * Versión curried de Array.reduce para composición.
 */
export const reducir =
  <T, U>(fn: (acc: U, item: T) => U, inicial: U) =>
  (lista: readonly T[]): U =>
    lista.reduce(fn, inicial);

// ──────────────────────────────────────────────────────────
// PREDICADOS COMBINABLES (lógica funcional)
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Combina predicados con AND lógico.
 * La lista pasa si TODOS los predicados retornan true.
 *
 * @example
 *   const esDisponibleGrande = todosLosPredicados([
 *     (h: Habitacion) => h.estado === 'disponible',
 *     (h: Habitacion) => h.capacidad >= 3
 *   ]);
 */
export const todosLosPredicados =
  <T>(predicados: ReadonlyArray<(item: T) => boolean>) =>
  (item: T): boolean =>
    predicados.every((pred) => pred(item));

/**
 * [HOF] Combina predicados con OR lógico.
 * La lista pasa si ALGÚN predicado retorna true.
 */
export const algunPredicado =
  <T>(predicados: ReadonlyArray<(item: T) => boolean>) =>
  (item: T): boolean =>
    predicados.some((pred) => pred(item));

/**
 * [HOF] Niega un predicado. Equivalente a NOT lógico.
 *
 * @example
 *   const noDisponible = negar(filtrarPorEstado('disponible'));
 */
export const negar =
  <T>(predicado: (item: T) => boolean) =>
  (item: T): boolean =>
    !predicado(item);

// ──────────────────────────────────────────────────────────
// MEMOIZATION
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Memoiza una función pura (caché de resultados).
 * Solo aplicable a funciones puras (mismo input → mismo output).
 *
 * @example
 *   const calcularIGVMemo = memoize(calcularPrecioConIGV);
 */
export const memoize = <T, U>(fn: (arg: T) => U): ((arg: T) => U) => {
  const cache = new Map<T, U>();
  return (arg: T): U => {
    if (cache.has(arg)) return cache.get(arg) as U;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
};

// ──────────────────────────────────────────────────────────
// UTILIDADES FUNCIONALES
// ──────────────────────────────────────────────────────────

/** Función identidad — retorna el argumento sin cambios. */
export const identity = <T>(x: T): T => x;

/** Función constante — retorna siempre el mismo valor. */
export const constant =
  <T>(value: T) =>
  (_: unknown): T =>
    value;

/**
 * [HOF] tap — ejecuta un efecto y retorna el valor sin cambios.
 * Útil para logging en pipelines sin romper la composición.
 *
 * @example
 *   pipe(habitacion, tap(h => console.log(h)), calcularPrecio)
 */
export const tap =
  <T>(fn: (value: T) => void) =>
  (value: T): T => {
    fn(value);
    return value;
  };

/**
 * [HOF] Aplica una función solo si la condición es verdadera.
 * Si es falsa, retorna el valor sin cambios.
 *
 * @example
 *   pipe(precio, siCondicion(tieneDescuento, aplicarDescuento))
 */
export const siCondicion =
  <T>(condicion: (value: T) => boolean, fn: (value: T) => T) =>
  (value: T): T =>
    condicion(value) ? fn(value) : value;
