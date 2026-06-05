// ═══════════════════════════════════════════════════════════
// HotelFlux — Reserva State Stream (Estado Compuesto del Cliente)
//
// Stream compuesto que combina disponibilidad de habitaciones
// con notificaciones de reserva en tiempo real.
//
// Principios demostrados:
// - [combineLatest] Composición de N streams independientes
// - [scan] Estado acumulado de reservas del cliente (fold reactivo)
// - [shareReplay] Hot observable con replay del último estado
// - [distinctUntilChanged] Evita re-renders innecesarios
// - [startWith] Valor inicial inmutable para no bloquear combineLatest
// ═══════════════════════════════════════════════════════════

import { combineLatest, Observable, of } from 'rxjs';
import {
  map,
  scan,
  shareReplay,
  distinctUntilChanged,
  startWith,
  catchError,
} from 'rxjs/operators';
import type { Socket } from 'phoenix';
import { createHabitacionStream, createConteoEstadosStream } from '../habitacion.stream';
import { createNotificacionStream } from '../notificacion.stream';
import type { Habitacion, ConteoEstados } from '../../domain/types';
import type { Notificacion } from '../notificacion.stream';

// ──────────────────────────────────────────────────────────
// TIPOS DEL ESTADO COMPUESTO (Deep Readonly)
// ──────────────────────────────────────────────────────────

export interface EstadoReservaCliente {
  readonly habitaciones: readonly Habitacion[];
  readonly conteo: ConteoEstados;
  readonly notificaciones: readonly Notificacion[];
  readonly resumen: ResumenDisponibilidad;
}

export interface ResumenDisponibilidad {
  readonly disponibles: number;
  readonly ocupadas: number;
  readonly totalHabitaciones: number;
  readonly porcentajeDisponible: number;
}

// ──────────────────────────────────────────────────────────
// ESTADO INICIAL INMUTABLE
// ──────────────────────────────────────────────────────────

const CONTEO_INIT: ConteoEstados = {
  disponible: 0,
  reservada: 0,
  ocupada: 0,
  en_limpieza: 0,
  en_mantenimiento: 0,
  bloqueada: 0,
} as const;

const ESTADO_INICIAL: EstadoReservaCliente = {
  habitaciones: [],
  conteo: CONTEO_INIT,
  notificaciones: [],
  resumen: {
    disponibles: 0,
    ocupadas: 0,
    totalHabitaciones: 0,
    porcentajeDisponible: 0,
  },
} as const;

// ──────────────────────────────────────────────────────────
// FUNCIÓN PURA: derivar resumen de disponibilidad
// ──────────────────────────────────────────────────────────

const calcularResumen = (conteo: ConteoEstados): ResumenDisponibilidad => {
  const total =
    conteo.disponible +
    conteo.ocupada +
    conteo.reservada +
    conteo.en_limpieza +
    conteo.en_mantenimiento;

  return {
    disponibles: conteo.disponible,
    ocupadas: conteo.ocupada + conteo.reservada,
    totalHabitaciones: total,
    porcentajeDisponible: total > 0 ? Math.round((conteo.disponible / total) * 100) : 0,
  };
};

// ──────────────────────────────────────────────────────────
// STREAM COMPUESTO PRINCIPAL
// ──────────────────────────────────────────────────────────

/**
 * [combineLatest] Combina habitaciones + notificaciones en un único
 * stream de estado del portal de clientes.
 *
 * Cada stream comienza con startWith([]) para que combineLatest
 * emita inmediatamente sin esperar todos los streams.
 */
export function createEstadoReservaStream(
  socket: Socket,
): Observable<EstadoReservaCliente> {
  const habitaciones$ = createHabitacionStream(socket).pipe(
    startWith([] as readonly Habitacion[]),
    catchError(() => of([] as readonly Habitacion[])),
  );

  const notificaciones$ = createNotificacionStream(socket).pipe(
    startWith([] as readonly Notificacion[]),
    catchError(() => of([] as readonly Notificacion[])),
  );

  // Derivar conteo a partir de habitaciones (proyección CQRS)
  const conteo$ = createConteoEstadosStream(habitaciones$).pipe(
    startWith(CONTEO_INIT),
  );

  // [combineLatest] Combina 3 streams independientes → 1 estado coherente
  return combineLatest([habitaciones$, conteo$, notificaciones$]).pipe(
    map(
      ([habitaciones, conteo, notificaciones]): EstadoReservaCliente => ({
        habitaciones,
        conteo,
        notificaciones,
        resumen: calcularResumen(conteo),
      }),
    ),
    // [distinctUntilChanged] Solo emitir si el estado cambió estructuralmente
    distinctUntilChanged(
      (a, b) =>
        a.habitaciones.length === b.habitaciones.length &&
        a.notificaciones.length === b.notificaciones.length &&
        a.conteo.disponible === b.conteo.disponible &&
        a.conteo.ocupada === b.conteo.ocupada,
    ),
    // [shareReplay] Hot observable: N componentes comparten 1 sola suscripción
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ──────────────────────────────────────────────────────────
// STREAM DERIVADO: Historial de disponibilidad (scan/fold)
// ──────────────────────────────────────────────────────────

export interface PuntoDisponibilidad {
  readonly timestamp: string;
  readonly disponibles: number;
  readonly porcentaje: number;
}

/**
 * [scan] Acumula historial de disponibilidad para visualización.
 * Ventana deslizante de 30 puntos (backpressure por descarte).
 */
export function createHistorialDisponibilidadStream(
  estado$: Observable<EstadoReservaCliente>,
): Observable<readonly PuntoDisponibilidad[]> {
  return estado$.pipe(
    scan(
      (
        historial: readonly PuntoDisponibilidad[],
        estado: EstadoReservaCliente,
      ): readonly PuntoDisponibilidad[] => {
        const punto: PuntoDisponibilidad = {
          timestamp: new Date().toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          disponibles: estado.resumen.disponibles,
          porcentaje: estado.resumen.porcentajeDisponible,
        };
        const nuevo = [...historial, punto];
        // Ventana deslizante: máximo 30 puntos
        return nuevo.length > 30 ? nuevo.slice(-30) : nuevo;
      },
      [] as readonly PuntoDisponibilidad[],
    ),
    startWith([] as readonly PuntoDisponibilidad[]),
  );
}

export { ESTADO_INICIAL };
