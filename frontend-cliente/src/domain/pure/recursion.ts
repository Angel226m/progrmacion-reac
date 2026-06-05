// ═══════════════════════════════════════════════════════════
// HotelFlux — Funciones Recursivas Puras del Dominio
//
// Implementa algoritmos recursivos sobre estructuras de datos
// del dominio hotelero. Todos son funciones puras.
//
// Principios demostrados:
// - [RECURSIÓN] estructural sobre árboles y listas
// - [TAIL CALL] patrón acumulador para TCO
// - [HOF] mapArbol y filtrarArbol reciben funciones
// - [INMUTABILIDAD] retorna nuevas estructuras siempre
// ═══════════════════════════════════════════════════════════

import type { Habitacion } from '../entidades/habitacion';

// ──────────────────────────────────────────────────────────
// TIPOS DE ÁRBOL
// ──────────────────────────────────────────────────────────

export interface NodoPiso {
  readonly id: string;
  readonly numero: number;
  readonly nombre: string;
  readonly habitaciones: readonly Habitacion[];
}

export interface NodoHotel {
  readonly nombre: string;
  readonly pisos: readonly NodoPiso[];
}

export interface EventoAnidado<T> {
  readonly tipo: string;
  readonly payload: T;
  readonly hijos?: readonly EventoAnidado<T>[];
}

export interface Arbol<T> {
  readonly valor: T;
  readonly hijos: readonly Arbol<T>[];
}

// ──────────────────────────────────────────────────────────
// RECURSIÓN SOBRE LISTAS (Event Sourcing)
// ──────────────────────────────────────────────────────────

/**
 * [RECURSIÓN DE COLA] Aplana eventos anidados en una lista plana.
 * Usa acumulador para TCO — evita stack overflow en listas largas.
 *
 * @example
 *   aplanarEventos([{ tipo: 'A', hijos: [{ tipo: 'B' }] }])
 *   // → [{ tipo: 'A' }, { tipo: 'B' }]
 */
export function aplanarEventos<T>(
  eventos: readonly EventoAnidado<T>[],
): readonly EventoAnidado<T>[] {
  // Delega a la función con acumulador (TCO)
  return aplanarAcc(eventos, []);
}

// [TCO] Caso base: no hay eventos pendientes
function aplanarAcc<T>(
  pendientes: readonly EventoAnidado<T>[],
  acc: EventoAnidado<T>[],
): readonly EventoAnidado<T>[] {
  if (pendientes.length === 0) return acc;

  const [primero, ...resto] = pendientes;
  const hijos = primero!.hijos ?? [];

  // [INMUTABLE] crea nuevo acumulador con spread — no muta el original
  return aplanarAcc([...hijos, ...resto], [...acc, primero!]);
}

// ──────────────────────────────────────────────────────────
// RECURSIÓN SOBRE ÁRBOLES (jerarquía Hotel)
// ──────────────────────────────────────────────────────────

/**
 * [RECURSIÓN] Transforma todos los nodos de un árbol genérico.
 * HOF: `fn` transforma cada nodo de tipo T a tipo U.
 * Recursivo: se llama a sí mismo para cada hijo.
 *
 * @example
 *   const arbolConIds = mapArbol(arbol, nodo => ({ ...nodo, id: uuid() }));
 */
export function mapArbol<T, U>(arbol: Arbol<T>, fn: (valor: T) => U): Arbol<U> {
  return {
    valor: fn(arbol.valor),
    // [RECURSIÓN ESTRUCTURAL] cada hijo se transforma recursivamente
    hijos: arbol.hijos.map((hijo) => mapArbol(hijo, fn)),
  };
}

/**
 * [RECURSIÓN] Calcula la profundidad máxima de un árbol.
 * Caso base: nodo hoja → profundidad 1.
 * Caso recursivo: 1 + máxima profundidad de hijos.
 */
export function profundidadArbol<T>(arbol: Arbol<T>): number {
  if (arbol.hijos.length === 0) return 1; // caso base: nodo hoja
  // [RECURSIÓN] calcula profundidad de todos los hijos
  const profundidades = arbol.hijos.map((hijo) => profundidadArbol(hijo));
  return 1 + Math.max(...profundidades);
}

/**
 * [RECURSIÓN + HOF] Filtra nodos del árbol que satisfacen un predicado.
 * Retorna nuevo árbol — no muta el original.
 */
export function filtrarArbol<T>(
  arbol: Arbol<T>,
  predicado: (valor: T) => boolean,
): Arbol<T> | null {
  if (!predicado(arbol.valor)) return null;
  return {
    valor: arbol.valor,
    hijos: arbol.hijos
      .map((hijo) => filtrarArbol(hijo, predicado))
      .filter((hijo): hijo is Arbol<T> => hijo !== null),
  };
}

/**
 * [RECURSIÓN DE COLA] Recorre el árbol hotelero y aplica visitante a habitaciones.
 * Hotel → Pisos → Habitaciones.
 *
 * @example
 *   const todasLasHabs = recorrerHotel(hotel, h => h);
 */
export function recorrerHotel<R>(
  hotel: NodoHotel,
  visitante: (habitacion: Habitacion, piso: NodoPiso) => R,
): readonly R[] {
  return recorrerPisosAcc(hotel.pisos, visitante, []);
}

// [TCO] con acumulador explícito
function recorrerPisosAcc<R>(
  pisos: readonly NodoPiso[],
  visitante: (hab: Habitacion, piso: NodoPiso) => R,
  acc: R[],
): readonly R[] {
  if (pisos.length === 0) return acc;

  const [piso, ...restoPisos] = pisos;
  const resultadosPiso = piso!.habitaciones.map((hab) => visitante(hab, piso!));

  return recorrerPisosAcc(restoPisos, visitante, [...acc, ...resultadosPiso]);
}

// ──────────────────────────────────────────────────────────
// RECURSIÓN — Event Sourcing en cliente
// ──────────────────────────────────────────────────────────

/**
 * [RECURSIÓN DE COLA] Reconstruye estado aplicando lista de transformaciones.
 * Patrón fold con acumulador — TCO garantizado.
 *
 * @example
 *   const estadoFinal = reconstruirEstado(estadoInicial, transformaciones);
 */
export function reconstruirEstado<S, E>(
  estadoInicial: S,
  eventos: readonly E[],
  aplicar: (estado: S, evento: E) => S,
): S {
  return reconstruirAcc(eventos, estadoInicial, aplicar);
}

// [TCO] Caso base
function reconstruirAcc<S, E>(
  eventos: readonly E[],
  acc: S,
  aplicar: (s: S, e: E) => S,
): S {
  if (eventos.length === 0) return acc;
  const [primero, ...resto] = eventos;
  const nuevoAcc = aplicar(acc, primero!);
  return reconstruirAcc(resto, nuevoAcc, aplicar); // tail call
}

// ──────────────────────────────────────────────────────────
// RECURSIÓN — Agrupar por niveles
// ──────────────────────────────────────────────────────────

/**
 * [RECURSIÓN] Divide una lista en grupos de tamaño N.
 * Útil para renderizar habitaciones en filas.
 *
 * @example
 *   agruparEnChunks([1,2,3,4,5], 2) // → [[1,2],[3,4],[5]]
 */
export function agruparEnChunks<T>(
  lista: readonly T[],
  tamano: number,
): readonly (readonly T[])[] {
  if (lista.length === 0) return [];
  // [RECURSIÓN ESTRUCTURAL] toma el primer chunk, recursa sobre el resto
  const chunk = lista.slice(0, tamano);
  const resto = lista.slice(tamano);
  return [chunk, ...agruparEnChunks(resto, tamano)];
}
