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

/**
 * [FUNCIÓN PURA] Clasifica una habitación según su precio por noche.
 * Sin efectos: no modifica la habitación, devuelve una clasificación.
 */
export const clasificarHabitacion = (
  habitacion: Readonly<Habitacion>,
): 'economica' | 'estandar' | 'premium' | 'vip' => {
  const precio = parseFloat(habitacion.precio_noche);
  if (precio >= 500) return 'vip';
  if (precio >= 200) return 'premium';
  if (precio >= 100) return 'estandar';
  return 'economica';
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
export const calcularOcupacion = (habitaciones: readonly Habitacion[]): number => {
  if (habitaciones.length === 0) return 0;
  const ocupadas = habitaciones.filter((h) => h.estado === 'ocupada').length;
  return Math.round((ocupadas / habitaciones.length) * 100);
};

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
  [...habitaciones].sort((a, b) => {
    if (a.piso !== b.piso) return a.piso - b.piso;
    return a.numero.localeCompare(b.numero, 'es', { numeric: true });
  });

/**
 * [FUNCIÓN PURA] Obtiene el precio mínimo de habitaciones disponibles.
 * Retorna null si no hay habitaciones disponibles.
 */
export const precioMinimoDisponible = (
  habitaciones: readonly Habitacion[],
): number | null => {
  const disponibles = habitaciones.filter((h) => h.estado === 'disponible');
  if (disponibles.length === 0) return null;
  return Math.min(...disponibles.map((h) => parseFloat(h.precio_noche)));
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
): boolean => {
  if (reserva.estado !== 'confirmada') return false;
  const fechaEntrada = new Date(reserva.fecha_entrada);
  return fechaEntrada < fechaActual;
};

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
): number => {
  if (!tarea.iniciada_at || tarea.estado !== 'en_proceso') return 0;
  const inicio = new Date(tarea.iniciada_at);
  return Math.floor((ahora.getTime() - inicio.getTime()) / 60000);
};

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
  if (metricas.total_habitaciones === 0) return 0;
  const factor = metricas.en_mantenimiento;
  const activas = metricas.total_habitaciones - (factor ?? 0);
  if (activas === 0) return 0;
  return Math.round((metricas.ocupadas / activas) * 100);
};

/**
 * [FUNCIÓN PURA] Formatea un número como precio en Soles peruanos.
 * Transparencia referencial: formatearPrecio(100) === 'S/ 100.00' siempre.
 */
export const formatearPrecio = (precio: number | string): string => {
  const num = typeof precio === 'string' ? parseFloat(precio) : precio;
  if (isNaN(num)) return 'S/ 0.00';
  return `S/ ${num.toFixed(2)}`;
};

/**
 * [FUNCIÓN PURA] Formatea un porcentaje.
 */
export const formatearPorcentaje = (valor: number, decimales = 1): string =>
  `${valor.toFixed(decimales)}%`;
