// ═══════════════════════════════════════════════════════════
// HotelFlux — Combined Stream (Estado Global Reactivo)
// ═══════════════════════════════════════════════════════════
//
// Demuestra los patrones reactivos avanzados:
//
// 1. **combineLatest** — combina N streams independientes en uno solo
// 2. **debounceTime** — backpressure: espera silencio antes de emitir
// 3. **throttleTime** — backpressure: limita la tasa de emisión
// 4. **Operadores HOF personalizados** — funciones que retornan OperatorFunction
// 5. **Inmutabilidad** — estado global readonly, spread para "actualizar"
// 6. **Recursión en derivaciones** — funciones puras recursivas sobre arrays
// ═══════════════════════════════════════════════════════════

import { combineLatest, Observable, of, timer, throwError } from 'rxjs';
import {
  map,
  debounceTime,
  throttleTime,
  distinctUntilChanged,
  shareReplay,
  startWith,
  switchMap,
  catchError,
  scan,
} from 'rxjs/operators';
import type { Socket } from 'phoenix';
import { createHabitacionStream } from './habitacion.stream';
import { createLimpiezaStream } from './limpieza.stream';
import { createDashboardStream } from './dashboard.stream';
import type { Habitacion, TareaLimpieza, MetricasDashboard } from '../domain/types';

// ── Tipo del estado global combinado (inmutable) ──

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
}

export interface ResumenOperacional {
  readonly ocupacionReal: number;
  readonly tareasCriticas: number;
  readonly ingresosDia: number;
  readonly eficienciaLimpieza: number;
}

// ── Estado inicial (inmutable) ──

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
};

// ─────────────────────────────────────────────────────────────────
// OPERADORES HOF PERSONALIZADOS
// Funciones que retornan OperatorFunction (Higher-Order Functions)
// ─────────────────────────────────────────────────────────────────

/**
 * HOF: withAutoRetry — operador que reintenta automáticamente con backoff.
 * Función que retorna una función operador (OperatorFunction<T, T>).
 *
 * ## Ejemplo
 *   habitaciones$.pipe(withAutoRetry(3, 1000))
 */
export function withAutoRetry<T>(
  maxIntentos: number = 3,
  delayBase: number = 1000,
) {
  return (source$: Observable<T>): Observable<T> =>
    source$.pipe(
      catchError((err, caught$) =>
        timer(delayBase).pipe(
          switchMap(() =>
            maxIntentos <= 0
              ? throwError(() => err)
              : caught$.pipe(withAutoRetry<T>(maxIntentos - 1, delayBase * 2)),
          ),
        ),
      ),
    );
}

/**
 * HOF: withTimestamp — añade timestamp inmutable a cada emisión.
 * HOF: retorna OperatorFunction que transforma el tipo.
 *
 * ## Ejemplo
 *   metricas$.pipe(withTimestamp())
 */
export function withTimestamp<T>() {
  return (source$: Observable<T>): Observable<T & { readonly _ts: number }> =>
    source$.pipe(
      map((value) => ({ ...(value as object), _ts: Date.now() }) as T & { readonly _ts: number }),
    );
}

/**
 * HOF: withSliding — mantiene ventana deslizante de N últimas emisiones.
 * Demuestra backpressure por descarte controlado.
 */
export function withSliding<T>(tamano: number) {
  return (source$: Observable<T>): Observable<readonly T[]> =>
    source$.pipe(
      scan((ventana: readonly T[], valor: T) => {
        const nueva = [...ventana, valor];
        // Inmutabilidad: slice retorna nuevo array, no muta
        return nueva.length > tamano ? nueva.slice(-tamano) : nueva;
      }, [] as readonly T[]),
    );
}

/**
 * HOF: onlyChanged — emite solo cuando un campo específico cambió.
 * HOF: recibe una función selectora (campo extractor).
 *
 * ## Ejemplo
 *   metricas$.pipe(onlyChanged(m => m.porcentaje_ocupacion))
 */
export function onlyChanged<T, K>(selector: (value: T) => K) {
  return (source$: Observable<T>): Observable<T> =>
    source$.pipe(
      distinctUntilChanged((a, b) => selector(a) === selector(b)),
    );
}

// ─────────────────────────────────────────────────────────────────
// FUNCIONES PURAS DE DERIVACIÓN (con recursión)
// ─────────────────────────────────────────────────────────────────

/**
 * Genera alertas desde el estado actual. FUNCIÓN PURA RECURSIVA.
 * Acumula alertas recorriendo habitaciones y tareas recursivamente.
 */
export function generarAlertas(
  habitaciones: readonly Habitacion[],
  tareas: readonly TareaLimpieza[],
  metricas: MetricasDashboard,
): readonly Alerta[] {
  const alertasHab = alertasHabitaciones(habitaciones, []);
  const alertasTar = alertasTareas(tareas, []);
  const alertasMet = alertasMetricas(metricas);
  return [...alertasHab, ...alertasTar, ...alertasMet];
}

// Recursión de cola: genera alertas para habitaciones en estado crítico
function alertasHabitaciones(
  habitaciones: readonly Habitacion[],
  acum: Alerta[],
): Alerta[] {
  const [hab, ...resto] = habitaciones as [Habitacion, ...Habitacion[]];
  return hab === undefined
    ? acum
    : alertasHabitaciones( // tail recursion
        resto,
        hab.estado === 'en_mantenimiento'
          ? [
              ...acum,
              {
                id: `mant-${hab.id}`,
                nivel: 'warning',
                mensaje: `Habitación ${hab.numero} en mantenimiento`,
                origen: 'habitaciones',
              },
            ]
          : acum,
      );
}

// Recursión de cola: genera alertas para tareas pendientes urgentes
function alertasTareas(
  tareas: readonly TareaLimpieza[],
  acum: Alerta[],
): Alerta[] {
  const [tarea, ...resto] = tareas as [TareaLimpieza, ...TareaLimpieza[]];
  return tarea === undefined
    ? acum
    : alertasTareas( // tail recursion
        resto,
        tarea.estado === 'pendiente'
          ? [
              ...acum,
              {
                id: `limpieza-${tarea.id}`,
                nivel: 'info',
                mensaje: `Limpieza pendiente en hab. ${tarea.habitacion_id}`,
                origen: 'limpieza',
              },
            ]
          : acum,
      );
}

// Función pura: alertas basadas en métricas de ocupación
function alertasMetricas(metricas: MetricasDashboard): readonly Alerta[] {
  return [
    ...(metricas.porcentaje_ocupacion > 90
      ? [{ id: 'ocupacion-alta' as const, nivel: 'critical' as const, mensaje: `Ocupación al ${metricas.porcentaje_ocupacion}% — casi lleno`, origen: 'metricas' as const }]
      : []),
    ...(metricas.en_mantenimiento > 2
      ? [{ id: 'mantenimiento-alto' as const, nivel: 'warning' as const, mensaje: `${metricas.en_mantenimiento} habitaciones en mantenimiento`, origen: 'metricas' as const }]
      : []),
  ];
}

/**
 * Calcula resumen operacional. FUNCIÓN PURA.
 * HOF implícita: usa filter/reduce sobre arrays readonly.
 */
export function calcularResumen(
  habitaciones: readonly Habitacion[],
  tareas: readonly TareaLimpieza[],
  metricas: MetricasDashboard,
): ResumenOperacional {
  const ocupadas = habitaciones.filter((h) => h.estado === 'ocupada').length;
  const total = habitaciones.length || 1;

  const completadas = tareas.filter((t) => t.estado === 'completada');
  const eficiencia =
    tareas.length > 0
      ? Math.round((completadas.length / tareas.length) * 100)
      : 100;

  return {
    ocupacionReal: Math.round((ocupadas / total) * 100),
    tareasCriticas: tareas.filter((t) => t.estado === 'pendiente').length,
    ingresosDia: parseFloat(metricas.ingresos_hoy || '0'),
    eficienciaLimpieza: eficiencia,
  };
}

// ─────────────────────────────────────────────────────────────────
// STREAM COMBINADO — combineLatest de todos los streams
// ─────────────────────────────────────────────────────────────────

/**
 * Crea el stream de estado global combinando todos los streams del sistema.
 *
 * **combineLatest**: emite cada vez que CUALQUIER stream fuente emite,
 * usando el último valor conocido de los demás.
 * Equivale al concepto de "derivación reactiva" o computed values.
 *
 * **debounceTime(50)**: backpressure — si múltiples streams emiten
 * en ráfaga (ej: checkout dispara habitación + limpieza + dashboard),
 * espera 50ms para consolidar en una sola emisión al frontend.
 */
export function createEstadoGlobalStream(socket: Socket): Observable<EstadoGlobal> {
  const habitaciones$ = createHabitacionStream(socket).pipe(
    startWith([] as readonly Habitacion[]),
    catchError(() => of([] as readonly Habitacion[])),
  );

  const tareas$ = createLimpiezaStream(socket).pipe(
    startWith([] as readonly TareaLimpieza[]),
    catchError(() => of([] as readonly TareaLimpieza[])),
  );

  const metricas$ = createDashboardStream(socket).pipe(
    startWith(METRICAS_INIT),
    catchError(() => of(METRICAS_INIT)),
  );

  return combineLatest([habitaciones$, tareas$, metricas$]).pipe(
    // debounceTime: backpressure — consolida ráfagas de eventos en una sola emisión
    // Si el checkout dispara habitación + limpieza + dashboard casi simultáneamente,
    // el frontend recibe UNA actualización combinada en lugar de tres.
    debounceTime(50),

    // Derivar estado global a partir de los tres streams (función pura)
    map(
      ([habitaciones, tareas, metricas]): EstadoGlobal => ({
        habitaciones,
        tareas,
        metricas,
        alertas: generarAlertas(habitaciones, tareas, metricas),
        resumen: calcularResumen(habitaciones, tareas, metricas),
      }),
    ),

    // Solo emitir si el resumen cambió realmente (evitar renders innecesarios)
    distinctUntilChanged(
      (a, b) => JSON.stringify(a.resumen) === JSON.stringify(b.resumen),
    ),

    // shareReplay: un solo set de suscripciones para múltiples componentes
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

/**
 * Stream de alertas críticas con throttling.
 * throttleTime: máximo una alerta crítica por ventana de 5 segundos.
 * Demuestra backpressure por limitación de tasa.
 */
export function createAlertasCriticasStream(
  estado$: Observable<EstadoGlobal>,
): Observable<Alerta> {
  return estado$.pipe(
    map((estado) => estado.alertas.filter((a) => a.nivel === 'critical')),
    // Aplanar el array de alertas en emisiones individuales
    switchMap((alertas) =>
      alertas.length > 0
        ? new Observable<Alerta>((sub) => {
            alertas.forEach((a) => sub.next(a));
          })
        : of<Alerta>(),
    ),
    // throttleTime: máximo 1 alerta crítica cada 5s (backpressure)
    throttleTime(5000),
  );
}
