// ═══════════════════════════════════════════════════════════
// HotelFlux — Funciones Puras de Dominio
//
// Transformaciones puras sobre entidades del dominio hotelero.
// Sin efectos secundarios, sin acceso a estado externo,
// sin llamadas a API, sin mutaciones.
//
// Principios demostrados:
// - [FUNCIÓN PURA] mismo input → mismo output, sin efectos
// - [INMUTABILIDAD] readonly, spread operator, nunca mutación directa
// - [TRANSPARENCIA REFERENCIAL] reemplazable por su valor
// - [HOF] filtrarPorEstado retorna función (currying)
// ═══════════════════════════════════════════════════════════

import type { Habitacion, EstadoHabitacion, TipoHabitacion } from '../entidades/habitacion';
import type { Reserva, EstadoReserva } from '../entidades/reserva';
import type { TareaLimpieza } from '../entidades/tarea-limpieza';
import type { MetricasDashboard } from '../entidades/metricas';

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS — Habitaciones
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Calcula el precio con IGV 18%.
 * Transparencia referencial: calcularPrecioConIGV(100) === 118 siempre.
 */
export const calcularPrecioConIGV = (precio: number): number =>
  Math.round(precio * 1.18 * 100) / 100;

const CLASIFICACION_PRECIO = [
  { min: 500, result: 'vip' as const },
  { min: 200, result: 'premium' as const },
  { min: 100, result: 'estandar' as const },
] as const;

/**
 * [FUNCIÓN PURA] Clasifica una habitación según su precio por noche.
 * Sin efectos: no modifica la habitación, devuelve una clasificación.
 * Reemplaza if/else con Record dictionary lookup.
 */
export const clasificarHabitacion = (
  habitacion: Readonly<Habitacion>,
): 'economica' | 'estandar' | 'premium' | 'vip' => {
  const precio = parseFloat(habitacion.precio_noche);
  return CLASIFICACION_PRECIO.find(({ min }) => precio >= min)?.result ?? 'economica';
};

/**
 * [FUNCIÓN PURA + HOF] Agrupa habitaciones por estado.
 * Retorna un nuevo objeto — no muta el array de entrada.
 *
 * @example
 *   const porEstado = agruparPorEstado(habitaciones);
 *   porEstado['disponible'] // → [Habitacion, ...]
 */
export const agruparPorEstado = (
  habitaciones: readonly Habitacion[],
): Readonly<Record<EstadoHabitacion, readonly Habitacion[]>> => {
  const inicial: Record<EstadoHabitacion, Habitacion[]> = {
    disponible: [],
    reservada: [],
    ocupada: [],
    en_limpieza: [],
    en_mantenimiento: [],
    bloqueada: [],
  };

  // [HOF] reduce es una función de orden superior (acumulador funcional)
  return habitaciones.reduce((grupos, hab) => {
    const estadoActual = grupos[hab.estado] ?? [];
    return { ...grupos, [hab.estado]: [...estadoActual, hab] };
  }, inicial);
};

/**
 * [FUNCIÓN PURA] Calcula la ocupación porcentual.
 * Evita división por cero: retorna 0 si no hay habitaciones.
 */
export const calcularOcupacion = (habitaciones: readonly Habitacion[]): number =>
  habitaciones.length === 0
    ? 0
    : Math.round(
        (habitaciones.filter((h) => h.estado === 'ocupada').length / habitaciones.length) * 100,
      );

/**
 * [FUNCIÓN PURA] Filtra habitaciones disponibles por capacidad mínima.
 * Composición de predicados: disponible AND capacidad >= minima.
 */
export const filtrarDisponiblesConCapacidad = (
  habitaciones: readonly Habitacion[],
  capacidadMinima: number,
): readonly Habitacion[] =>
  habitaciones.filter(
    (h) => h.estado === 'disponible' && h.capacidad >= capacidadMinima,
  );

/**
 * [HOF - CURRYING] Retorna un predicado filtrador por tipo.
 * Currying: primero el tipo, luego la habitación.
 *
 * @example
 *   const soloSuites = filtrarPorTipo('suite');
 *   habitaciones.filter(soloSuites);
 */
export const filtrarPorTipo =
  (tipo: TipoHabitacion) =>
  (habitacion: Readonly<Habitacion>): boolean =>
    habitacion.tipo === tipo;

/**
 * [FUNCIÓN PURA] Ordena habitaciones por piso y número.
 * Retorna nuevo array ordenado — nunca muta el original.
 */
export const ordenarHabitaciones = (
  habitaciones: readonly Habitacion[],
): readonly Habitacion[] =>
  [...habitaciones].sort((a, b) =>
    a.piso !== b.piso
      ? a.piso - b.piso
      : a.numero.localeCompare(b.numero, 'es', { numeric: true }),
  );

/**
 * [FUNCIÓN PURA] Obtiene el precio mínimo de habitaciones disponibles.
 * Retorna null si no hay habitaciones disponibles.
 */
export const precioMinimoDisponible = (
  habitaciones: readonly Habitacion[],
): number | null => {
  const disponibles = habitaciones.filter((h) => h.estado === 'disponible');
  return disponibles.length === 0
    ? null
    : Math.min(...disponibles.map((h) => parseFloat(h.precio_noche)));
};

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS — Reservas
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Calcula la duración de una reserva en noches.
 */
export const calcularNoches = (fechaEntrada: string, fechaSalida: string): number => {
  const entrada = new Date(fechaEntrada);
  const salida = new Date(fechaSalida);
  const diffMs = salida.getTime() - entrada.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * [FUNCIÓN PURA] Calcula el total de una reserva.
 * precioNoche × noches, sin efectos secundarios.
 */
export const calcularTotalReserva = (
  precioPorNoche: number,
  fechaEntrada: string,
  fechaSalida: string,
): number => {
  const noches = calcularNoches(fechaEntrada, fechaSalida);
  return calcularPrecioConIGV(precioPorNoche * noches);
};

/**
 * [HOF - CURRYING] Filtra reservas por estado.
 * Retorna una función predicado curried.
 *
 * @example
 *   const activas = filtrarReservasPorEstado('activa');
 *   reservas.filter(activas);
 */
export const filtrarReservasPorEstado =
  (estado: EstadoReserva) =>
  (reserva: Readonly<Reserva>): boolean =>
    reserva.estado === estado;

/**
 * [FUNCIÓN PURA] Determina si una reserva está vencida.
 * Pura: compara con una fecha dada, no usa Date.now() (impura).
 */
export const esReservaVencida = (
  reserva: Readonly<Reserva>,
  fechaActual: Date,
): boolean =>
  reserva.estado === 'confirmada'
    ? new Date(reserva.fecha_entrada) < fechaActual
    : false;

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS — Tareas de Limpieza
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Calcula el tiempo transcurrido en minutos desde el inicio.
 * Pura: recibe fecha actual como parámetro, no usa Date.now().
 */
export const minutosEnProgreso = (
  tarea: Readonly<TareaLimpieza>,
  ahora: Date,
): number =>
  !tarea.iniciada_at || tarea.estado !== 'en_proceso'
    ? 0
    : Math.floor((ahora.getTime() - new Date(tarea.iniciada_at).getTime()) / 60000);

/**
 * [FUNCIÓN PURA] Determina si una tarea excedió el tiempo límite.
 * Pura: límite y fecha actual son parámetros, no hardcodeados.
 */
export const superaTiempoLimite = (
  tarea: Readonly<TareaLimpieza>,
  ahora: Date,
  limiteMinutos = 45,
): boolean => minutosEnProgreso(tarea, ahora) > limiteMinutos;

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS — Dashboard / Métricas
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Calcula métricas de eficiencia operacional.
 * Derivación pura: solo computa valores a partir de los datos dados.
 */
export const calcularEficiencia = (metricas: Readonly<MetricasDashboard>): number => {
  const activas = metricas.total_habitaciones - (metricas.en_mantenimiento ?? 0);
  return metricas.total_habitaciones === 0 || activas === 0
    ? 0
    : Math.round((metricas.ocupadas / activas) * 100);
};

/**
 * [FUNCIÓN PURA] Formatea un número como precio en Soles peruanos.
 * Transparencia referencial: formatearPrecio(100) === 'S/ 100.00' siempre.
 */
export const formatearPrecio = (precio: number | string): string => {
  const num = typeof precio === 'string' ? parseFloat(precio) : precio;
  return `S/ ${(isNaN(num) ? 0 : num).toFixed(2)}`;
};

/**
 * [FUNCIÓN PURA] Formatea un porcentaje.
 */
export const formatearPorcentaje = (valor: number, decimales = 1): string =>
  `${valor.toFixed(decimales)}%`;
