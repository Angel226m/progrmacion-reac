// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Habitación
// ═══════════════════════════════════════════════════════════

export type EstadoHabitacion =
  | 'disponible'
  | 'reservada'
  | 'ocupada'
  | 'en_limpieza'
  | 'en_mantenimiento'
  | 'bloqueada';

export type TipoHabitacion = 'simple' | 'doble' | 'suite' | 'presidencial';

export interface Habitacion {
  readonly id: string;
  readonly numero: string;
  readonly tipo: TipoHabitacion;
  readonly piso: number;
  readonly capacidad: number;
  readonly precio_noche: string;
  readonly estado: EstadoHabitacion;
  readonly amenidades: readonly string[];
  readonly clasificacion: string | null;
  readonly caracteristicas: Record<string, unknown> | null;
  readonly notas: string | null;
  readonly inserted_at: string;
  readonly updated_at: string;
}

export const COLOR_ESTADO: Readonly<Record<EstadoHabitacion, string>> = {
  disponible: '#10b981',
  reservada: '#3b82f6',
  ocupada: '#ef4444',
  en_limpieza: '#f59e0b',
  en_mantenimiento: '#8b5cf6',
  bloqueada: '#6b7280',
} as const;

/**
 * [TAILWIND v4] Clases de color semánticas para estados de habitación.
 *
 * Las variables CSS están definidas en index.css bajo @theme:
 *   --color-estado-disponible, --color-estado-reservada, etc.
 *
 * Usar estas clases en lugar de style={{ backgroundColor }} permite
 * que Tailwind aplique prefijos hover:, dark:, md:, etc.
 */
export const CLASE_ESTADO: Readonly<Record<EstadoHabitacion, string>> = {
  disponible: 'bg-estado-disponible',
  reservada: 'bg-estado-reservada',
  ocupada: 'bg-estado-ocupada',
  en_limpieza: 'bg-estado-limpieza',
  en_mantenimiento: 'bg-estado-mantenimiento',
  bloqueada: 'bg-estado-bloqueada',
} as const;

export const LABEL_ESTADO: Readonly<Record<EstadoHabitacion, string>> = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  ocupada: 'Ocupada',
  en_limpieza: 'En Limpieza',
  en_mantenimiento: 'Mantenimiento',
  bloqueada: 'Bloqueada',
} as const;

// ─────────────────────────────────────────────────────────────────
// FUNCIONES PURAS DE DOMINIO — sin efectos secundarios
// ─────────────────────────────────────────────────────────────────

// ── Tipo de evento de dominio para Event Sourcing ──

export interface EventoHabitacion {
  readonly tipo: 'estado_cambiado' | 'precio_actualizado' | 'notas_actualizadas';
  readonly habitacion_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly insertado_en: string;
}

/**
 * Reconstruye el estado de una habitación aplicando una lista de eventos.
 * FUNCIÓN RECURSIVA PURA — Event Sourcing en el cliente.
 *
 * El estado actual ES la proyección de todos los eventos anteriores.
 * Patrón: fold/reduce recursivo sobre lista inmutable.
 *
 * ## Ejemplo
 *   const estadoActual = reconstruirDesdeEventos(habitacionBase, eventos);
 */
export function reconstruirDesdeEventos(
  habitacion: Habitacion,
  eventos: readonly EventoHabitacion[],
): Habitacion {
  if (eventos.length === 0) return habitacion; // caso base

  const [evento, ...resto] = eventos;
  const nueva = aplicarEvento(habitacion, evento!); // transformación pura

  return reconstruirDesdeEventos(nueva, resto); // tail recursion
}

// Función pura: aplica un evento al struct (sin mutación)
function aplicarEvento(habitacion: Habitacion, evento: EventoHabitacion): Habitacion {
  switch (evento.tipo) {
    case 'estado_cambiado':
      return { ...habitacion, estado: evento.payload['estado'] as EstadoHabitacion };
    case 'precio_actualizado':
      return { ...habitacion, precio_noche: String(evento.payload['precio_noche']) };
    case 'notas_actualizadas':
      return { ...habitacion, notas: String(evento.payload['notas'] ?? '') };
    default:
      return habitacion; // evento desconocido: estado sin cambios
  }
}

/**
 * HOF: filtrarPorEstado — función que retorna función (currying).
 * Retorna un predicado para usar con Array.filter o en streams RxJS.
 *
 * ## Ejemplo
 *   const soloDisponibles = filtrarPorEstado('disponible');
 *   habitaciones.filter(soloDisponibles);
 */
export function filtrarPorEstado(
  estado: EstadoHabitacion,
): (habitacion: Habitacion) => boolean {
  // Closure: captura `estado` en la función retornada
  return (habitacion: Habitacion) => habitacion.estado === estado;
}

/**
 * HOF: filtrarCon — acepta múltiples predicados como argumentos.
 * Una habitación pasa si TODOS los predicados retornan true.
 * HOF: recibe array de funciones, aplica composición lógica.
 *
 * ## Ejemplo
 *   const disponiblesGrandes = filtrarCon(
 *     habitaciones,
 *     [filtrarPorEstado('disponible'), h => h.capacidad >= 2]
 *   );
 */
export function filtrarCon(
  habitaciones: readonly Habitacion[],
  predicados: ReadonlyArray<(h: Habitacion) => boolean>,
): readonly Habitacion[] {
  return habitaciones.filter((hab) =>
    predicados.reduce((pasa: boolean, predicado) => pasa && predicado(hab), true),
  );
}

/**
 * HOF: transformarCon — aplica una lista de transformaciones en secuencia.
 * Composición de funciones puras sobre la habitación.
 * HOF: recibe funciones como argumentos.
 *
 * ## Ejemplo
 *   const transformada = transformarCon(hab, [
 *     h => ({ ...h, estado: 'disponible' }),
 *     h => ({ ...h, notas: 'Limpieza completada' }),
 *   ]);
 */
export function transformarCon(
  habitacion: Habitacion,
  transformaciones: ReadonlyArray<(h: Habitacion) => Habitacion>,
): Habitacion {
  return transformaciones.reduce((hab, transform) => transform(hab), habitacion);
}

/**
 * Calcula estadísticas de ocupación. FUNCIÓN PURA (fold/reduce).
 * HOF implícita: usa reduce con función acumuladora inline.
 *
 * ## Ejemplo
 *   const stats = calcularEstadisticas(habitaciones);
 *   // → { disponibles: 5, ocupadas: 8, porcentaje: 61.5 }
 */
export function calcularEstadisticas(
  habitaciones: readonly Habitacion[],
): Readonly<Record<EstadoHabitacion, number> & { total: number; porcentajeOcupacion: number }> {
  const conteo = habitaciones.reduce(
    (acc, hab) => ({
      ...acc,
      [hab.estado]: (acc[hab.estado] ?? 0) + 1,
    }),
    {} as Record<EstadoHabitacion, number>,
  );

  const total = habitaciones.length;
  const ocupadas = conteo['ocupada'] ?? 0;

  return {
    disponible: conteo['disponible'] ?? 0,
    reservada: conteo['reservada'] ?? 0,
    ocupada: ocupadas,
    en_limpieza: conteo['en_limpieza'] ?? 0,
    en_mantenimiento: conteo['en_mantenimiento'] ?? 0,
    bloqueada: conteo['bloqueada'] ?? 0,
    total,
    porcentajeOcupacion: total > 0 ? Math.round((ocupadas / total) * 100) : 0,
  };
}

/**
 * Agrupa habitaciones por piso. FUNCIÓN RECURSIVA PURA.
 * Construye un ReadonlyMap<piso, habitaciones[]> de forma funcional.
 *
 * ## Ejemplo
 *   const mapa = agruparPorPiso(habitaciones);
 *   mapa.get(1) // → [hab101, hab102, ...]
 */
export function agruparPorPiso(
  habitaciones: readonly Habitacion[],
): ReadonlyMap<number, readonly Habitacion[]> {
  return agruparRecursivo(habitaciones, new Map<number, Habitacion[]>());
}

// Recursión de cola: construye el mapa piso → habitaciones
function agruparRecursivo(
  habitaciones: readonly Habitacion[],
  acc: Map<number, Habitacion[]>,
): ReadonlyMap<number, readonly Habitacion[]> {
  if (habitaciones.length === 0) return acc; // caso base

  const [hab, ...resto] = habitaciones;
  const pisoActual = acc.get(hab!.piso) ?? [];
  acc.set(hab!.piso, [...pisoActual, hab!]); // spread: sin mutar el array previo

  return agruparRecursivo(resto, acc); // tail call
}

/**
 * HOF: predicado de prioridad — retorna función de comparación.
 * Útil para ordenar habitaciones según criterio configurable.
 *
 * ## Ejemplo
 *   habitaciones.sort(porPrioridad('en_mantenimiento'));
 */
export function porPrioridad(
  estadoPrioritario: EstadoHabitacion,
): (a: Habitacion, b: Habitacion) => number {
  // Función de comparación que captura estadoPrioritario (closure)
  return (a: Habitacion, b: Habitacion) => {
    if (a.estado === estadoPrioritario && b.estado !== estadoPrioritario) return -1;
    if (b.estado === estadoPrioritario && a.estado !== estadoPrioritario) return 1;
    return a.numero.localeCompare(b.numero);
  };
}
