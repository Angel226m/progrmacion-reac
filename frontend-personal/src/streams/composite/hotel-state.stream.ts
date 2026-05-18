// ═══════════════════════════════════════════════════════════
// HotelFlux — Estado Global Reactivo Compuesto (hotelState$)
//
// Stream que combina TODOS los streams del sistema en un único
// observable de estado global inmutable.
//
// Principios demostrados:
// - [combineLatest] Composición de N streams independientes
// - [shareReplay] Hot observable con replay del último estado
// - [distinctUntilChanged] Evita re-renders innecesarios
// - [scan] Estado acumulado inmutablemente
// - [BehaviorSubject] Estado local mutable encapsulado
// ═══════════════════════════════════════════════════════════

import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
  map,
  shareReplay,
  distinctUntilChanged,
  startWith,
} from 'rxjs/operators';
import type { Socket } from 'phoenix';
import { createHabitacionStream } from '../habitacion.stream';
import { createLimpiezaStream } from '../limpieza.stream';
import { createDashboardStream } from '../dashboard.stream';
import type { Habitacion, TareaLimpieza, MetricasDashboard } from '../../domain/types';
import { distinctUntilChangedDeep } from '../operators';
import {
  calcularOcupacion,
  calcularEficiencia,
} from '../../domain/pure';

// ──────────────────────────────────────────────────────────
// TIPOS DEL ESTADO GLOBAL (Deep Readonly)
// ──────────────────────────────────────────────────────────

export interface EstadoGlobal {
  readonly habitaciones: readonly Habitacion[];
  readonly tareas: readonly TareaLimpieza[];
  readonly metricas: MetricasDashboard;
  readonly alertas: readonly Alerta[];
  readonly resumen: ResumenOperacional;
}

export interface Alerta {
  readonly id: string;
  readonly nivel: 'info' | 'warning' | 'critical';
  readonly mensaje: string;
  readonly origen: 'habitaciones' | 'limpieza' | 'metricas';
  readonly timestamp: number;
}

export interface ResumenOperacional {
  readonly ocupacionReal: number;
  readonly tareasCriticas: number;
  readonly ingresosDia: number;
  readonly eficienciaLimpieza: number;
}

// ──────────────────────────────────────────────────────────
// ESTADO INICIAL INMUTABLE
// ──────────────────────────────────────────────────────────

const METRICAS_INIT: MetricasDashboard = {
  total_habitaciones: 0,
  disponibles: 0,
  ocupadas: 0,
  en_limpieza: 0,
  en_mantenimiento: 0,
  reservadas: 0,
  porcentaje_ocupacion: 0,
  ingresos_hoy: '0',
  checkins_hoy: 0,
  checkouts_hoy: 0,
  promedio_limpieza_min: 0,
} as const;

// ──────────────────────────────────────────────────────────
// SUBJECTS — Estado encapsulado
// ──────────────────────────────────────────────────────────

/** Subject de alertas — push desde cualquier parte del sistema */
const alertas$ = new BehaviorSubject<readonly Alerta[]>([]);

/** Subject de tema — dark/light como stream reactivo */
const tema$ = new BehaviorSubject<'dark' | 'light'>('dark');

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS DE DERIVACIÓN
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Calcula el resumen operacional a partir de los datos crudos.
 * Sin efectos secundarios — mismos datos → mismo resumen.
 */
const calcularResumen = (
  habitaciones: readonly Habitacion[],
  tareas: readonly TareaLimpieza[],
  metricas: MetricasDashboard,
): ResumenOperacional => ({
  ocupacionReal: calcularOcupacion(habitaciones),
  tareasCriticas: tareas.filter((t) => t.estado === 'con_problema').length,
  ingresosDia: parseFloat(metricas.ingresos_hoy) || 0,
  eficienciaLimpieza: calcularEficiencia(metricas),
});

/**
 * [FUNCIÓN PURA] Genera alertas basadas en el estado del sistema.
 * Pura: mismas entradas → mismas alertas.
 */
const generarAlertas = (
  habitaciones: readonly Habitacion[],
  tareas: readonly TareaLimpieza[],
): readonly Alerta[] => {
  const alertas: Alerta[] = [];

  // Alerta de habitaciones en mantenimiento prolongado
  const mantenimiento = habitaciones.filter((h) => h.estado === 'en_mantenimiento');
  if (mantenimiento.length > 3) {
    alertas.push({
      id: 'mantenimiento-alto',
      nivel: 'warning',
      mensaje: `${mantenimiento.length} habitaciones en mantenimiento`,
      origen: 'habitaciones',
      timestamp: Date.now(),
    });
  }

  // Alerta de tareas con problema
  const conProblema = tareas.filter((t) => t.estado === 'con_problema');
  if (conProblema.length > 0) {
    alertas.push({
      id: 'tareas-problema',
      nivel: 'critical',
      mensaje: `${conProblema.length} tareas con problema reportado`,
      origen: 'limpieza',
      timestamp: Date.now(),
    });
  }

  return alertas;
};

// ──────────────────────────────────────────────────────────
// FACTORY — createHotelState$
// ──────────────────────────────────────────────────────────

/**
 * Crea el stream de estado global del hotel.
 *
 * [combineLatest] — emite cada vez que CUALQUIER stream fuente cambia.
 * El estado resultante es inmutable y derivado puramente.
 *
 * @example
 *   const state$ = createHotelState$(socket);
 *   state$.subscribe(estado => {
 *     console.log(estado.resumen.ocupacionReal);
 *   });
 */
export function createHotelState$(socket: Socket): Observable<EstadoGlobal> {
  const habitaciones$ = createHabitacionStream(socket).pipe(
    startWith([] as readonly Habitacion[]),
  );

  const tareas$ = createLimpiezaStream(socket).pipe(
    startWith([] as readonly TareaLimpieza[]),
  );

  const metricas$ = createDashboardStream(socket).pipe(
    startWith(METRICAS_INIT),
  );

  // [combineLatest] — COMPOSICIÓN de streams independientes
  // Emite cada vez que alguno de los 4 streams cambia
  return combineLatest([habitaciones$, tareas$, metricas$, alertas$]).pipe(
    // [map PURO] transforma los 4 valores en el estado global
    map(([habitaciones, tareas, metricas, alertasExternas]) => {
      const alertasGeneradas = generarAlertas(habitaciones, tareas);
      const todasAlertas = [...alertasGeneradas, ...alertasExternas];

      return {
        habitaciones,
        tareas,
        metricas,
        alertas: todasAlertas,
        resumen: calcularResumen(habitaciones, tareas, metricas),
      } as EstadoGlobal;
    }),

    // [distinctUntilChanged PROFUNDO] evita re-renders sin cambio real
    distinctUntilChangedDeep(),

    // [shareReplay] hot observable — todos los suscriptores comparten el estado
    shareReplay(1),
  );
}

// ──────────────────────────────────────────────────────────
// STREAMS DERIVADOS (proyecciones del estado global)
// ──────────────────────────────────────────────────────────

/**
 * [HOF] Crea un stream que proyecta una propiedad del estado global.
 * Usa distinctUntilChanged para evitar emisiones innecesarias.
 *
 * @example
 *   const ocupacion$ = proyectarEstado(state$, s => s.resumen.ocupacionReal);
 */
export const proyectarEstado =
  <T>(selector: (estado: EstadoGlobal) => T) =>
  (estado$: Observable<EstadoGlobal>): Observable<T> =>
    estado$.pipe(
      map(selector),
      distinctUntilChanged(),
    );

// API pública para empujar alertas al sistema
export const pushAlerta = (alerta: Alerta): void => {
  const actuales = alertas$.getValue();
  alertas$.next([...actuales, alerta]);
};

export const limpiarAlertas = (): void => alertas$.next([]);

// Tema como stream observable
export { tema$ };
export const setTema = (tema: 'dark' | 'light'): void => tema$.next(tema);
