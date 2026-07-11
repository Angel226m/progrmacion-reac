// ═══════════════════════════════════════════════════════════
// HotelFlux — Dashboard Stream (Métricas en tiempo real)
// Observable reactivo que combina múltiples fuentes de datos
// Patrón: combineLatest (merge de múltiples streams)
// ═══════════════════════════════════════════════════════════

import { Observable } from 'rxjs';
import { map, scan, startWith, shareReplay, distinctUntilChanged } from 'rxjs/operators';
import { Socket } from 'phoenix';
import { createChannelStream, createMultiEventStream } from './websocket.stream';
import type { MetricasDashboard, EventoDominio } from '../domain/types';

// ── Historial de métricas (para gráficas Recharts) ──

export interface MetricasHistorial {
  readonly timestamp: string;
  readonly ocupacion: number;
  readonly disponibles: number;
  readonly ingresos: number;
}

// ── Función pura: crear stream de métricas del dashboard ──
// Se conecta al canal "dashboard:live" del backend Phoenix

export function createDashboardStream(
  socket: Socket,
): Observable<MetricasDashboard> {
  return createMultiEventStream<MetricasDashboard>(
    socket,
    'dashboard:live',
    ['metricas_actualizadas', 'evento_dashboard', 'estado_actualizado'],
  ).pipe(
    map(({ payload }: { event: string; payload: MetricasDashboard }) => payload),
    distinctUntilChanged(
      (a: MetricasDashboard, b: MetricasDashboard) => JSON.stringify(a) === JSON.stringify(b),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ── Función pura: crear historial acumulativo para gráficas ──
// Patrón: scan (reduce funcional sobre el stream de tiempo)
// Mantiene los últimos 60 puntos de datos (1 hora con muestreo/min)

export function createHistorialStream(
  metricas$: Observable<MetricasDashboard>,
): Observable<readonly MetricasHistorial[]> {
  return metricas$.pipe(
    scan((historial: readonly MetricasHistorial[], metricas: MetricasDashboard) => {
      const punto: MetricasHistorial = {
        timestamp: new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        ocupacion: metricas.porcentaje_ocupacion,
        disponibles: metricas.disponibles,
        ingresos: parseFloat(metricas.ingresos_hoy ?? '0'),
      };

      // Ventana deslizante de 60 puntos (backpressure por descarte)
      const nuevo = [...historial, punto];
      return nuevo.length > 60 ? nuevo.slice(-60) : nuevo;
    }, []),

    // Emitir con valor inicial vacío
    startWith([] as readonly MetricasHistorial[]),
  );
}

// ── Stream de eventos del dominio (Event Sourcing — lectura) ──

export function createEventosStream(
  socket: Socket,
): Observable<readonly EventoDominio[]> {
  return createChannelStream<EventoDominio>(
    socket,
    'dashboard:live',
    'evento_dominio',
  ).pipe(
    // Acumular eventos (append-only, inmutable)
    scan((eventos: readonly EventoDominio[], evento: EventoDominio) => {
      const nuevos = [evento, ...eventos];
      // Mantener últimos 100 eventos (backpressure)
      return nuevos.length > 100 ? nuevos.slice(0, 100) : nuevos;
    }, []),
    startWith([]),
  );
}

// ── Función pura: KPIs derivados de métricas ──

export interface KPIs {
  readonly revpar: number;        // Revenue Per Available Room
  readonly adr: number;           // Average Daily Rate
  readonly tasaOcupacion: number;
  readonly habitacionesLibres: number;
}

export function calcularKPIs(metricas: MetricasDashboard): KPIs {
  const ingresosRaw = parseFloat(metricas.ingresos_hoy ?? '0');
  const ingresos = Number.isFinite(ingresosRaw) ? ingresosRaw : 0;
  const totalHabsRaw = metricas.total_habitaciones ?? 1;
  const totalHabs = totalHabsRaw > 0 ? totalHabsRaw : 1;
  const ocupadas = (metricas.ocupadas ?? 0) > 0 ? (metricas.ocupadas ?? 0) : 0;

  return {
    revpar: ingresos / totalHabs,
    adr: ocupadas > 0 ? ingresos / ocupadas : 0,
    tasaOcupacion: metricas.porcentaje_ocupacion,
    habitacionesLibres: metricas.disponibles,
  };
}
