// ═══════════════════════════════════════════════════════════
// HotelFlux — useCombinedStream Hook
// Hook React que consume el stream global combinado (combineLatest)
// ═══════════════════════════════════════════════════════════
//
// Demuestra:
// - useMemo: referencia estable del Observable (sin recrear en cada render)
// - useObservableWithStatus: bridge RxJS → React sin boilerplate
// - combineLatest en el stream subyacente (createEstadoGlobalStream)
// - Inmutabilidad: estado global readonly, nunca mutado
// - HOF: selector$ como función que transforma el Observable (currying)
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from 'react';
import { Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import type { Socket } from 'phoenix';
import { useObservableWithStatus } from './useObservable';
import {
  createEstadoGlobalStream,
  createAlertasCriticasStream,
  type EstadoGlobal,
  type Alerta,
  type ResumenOperacional,
} from '../streams/combined.stream';
import type { Habitacion, TareaLimpieza, MetricasDashboard } from '../domain/types';

// ── Estado inicial para evitar undefined en el primer render ──

const ESTADO_INICIAL: EstadoGlobal = {
  habitaciones: [],
  tareas: [],
  metricas: {
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
  },
  alertas: [],
  resumen: {
    ocupacionReal: 0,
    tareasCriticas: 0,
    ingresosDia: 0,
    eficienciaLimpieza: 100,
  },
};

// ─────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Consume el stream global de estado combinado (combineLatest).
 *
 * Un solo hook suscribe a los tres streams del sistema y los combina
 * en un estado coherente para el componente consumidor.
 *
 * HOF: selector$ permite transformar el Observable antes de suscribir,
 * equivalente a un `map` configurable (currying del Observable).
 */
export function useCombinedStream(
  socket: Socket | null,
): { data: EstadoGlobal; loading: boolean; error: Error | null } {
  // useMemo: el Observable se crea UNA sola vez (referencia estable)
  // Sin useMemo, React recrearía el Observable en cada render → memory leak
  const estado$ = useMemo<Observable<EstadoGlobal> | null>(
    () => (socket ? createEstadoGlobalStream(socket) : null),
    [socket],
  );

  return useObservableWithStatus(estado$, ESTADO_INICIAL);
}

// ─────────────────────────────────────────────────────────────────
// HOOKS DERIVADOS — HOF sobre el stream combinado
// Cada hook es una proyección parcial del estado global
// Demuestra: function returning Observable (composición de HOF)
// ─────────────────────────────────────────────────────────────────

/**
 * HOF: hook que retorna solo las habitaciones del estado global.
 * Usa map para proyectar el stream (selector como HOF).
 */
export function useHabitacionesGlobal(
  socket: Socket | null,
): { data: readonly Habitacion[]; loading: boolean; error: Error | null } {
  const estado$ = useMemo<Observable<readonly Habitacion[]> | null>(
    () =>
      socket
        ? createEstadoGlobalStream(socket).pipe(
            map((estado: EstadoGlobal) => estado.habitaciones),
          )
        : null,
    [socket],
  );

  return useObservableWithStatus(estado$, []);
}

/**
 * HOF: hook que retorna solo el resumen operacional.
 * El resumen se recalcula automáticamente cuando cambian los streams subyacentes.
 */
export function useResumenOperacional(
  socket: Socket | null,
): { data: ResumenOperacional; loading: boolean; error: Error | null } {
  const resumen$ = useMemo<Observable<ResumenOperacional> | null>(
    () =>
      socket
        ? createEstadoGlobalStream(socket).pipe(
            map((estado: EstadoGlobal) => estado.resumen),
          )
        : null,
    [socket],
  );

  return useObservableWithStatus(resumen$, ESTADO_INICIAL.resumen);
}

/**
 * HOF: hook de alertas críticas con throttling.
 * Demuestra que los streams pueden transformarse antes de entrar a React.
 */
export function useAlertasCriticas(socket: Socket | null): {
  data: readonly Alerta[];
  loading: boolean;
  error: Error | null;
} {
  const alertas$ = useMemo<Observable<readonly Alerta[]> | null>(() => {
    if (!socket) return null;

    const estado$ = createEstadoGlobalStream(socket);
    // createAlertasCriticasStream es una HOF que transforma el estado$ en alertas$
    // Usa scan para acumular las alertas recientes (ventana deslizante)
    return createAlertasCriticasStream(estado$).pipe(
      // scan: acumula las últimas N alertas (ventana deslizante)
      // Patrón funcional: nuevo array en cada emisión (inmutabilidad)
      scan((acc: readonly Alerta[], alerta: Alerta) => [...acc, alerta], [] as readonly Alerta[]),
    );
  }, [socket]);

  return useObservableWithStatus(alertas$ as Observable<readonly Alerta[]> | null, []);
}

/**
 * HOF: createSelectorHook — fábrica de hooks (HOF de orden superior).
 * Recibe una función selectora y retorna un hook personalizado.
 *
 * ## Ejemplo
 *   const useTareasPendientes = createSelectorHook(
 *     estado => estado.tareas.filter(t => t.estado === 'pendiente'),
 *     []
 *   );
 */
export function createSelectorHook<T>(
  selector: (estado: EstadoGlobal) => T,
  initialValue: T,
): (socket: Socket | null) => { data: T; loading: boolean; error: Error | null } {
  // Retorna una función (hook) — HOF: función que retorna función
  return function useSelectorHook(socket: Socket | null) {
    const stream$ = useMemo<Observable<T> | null>(
      () =>
        socket
          ? createEstadoGlobalStream(socket).pipe(map(selector))
          : null,
      [socket],
    );

    return useObservableWithStatus(stream$, initialValue);
  };
}

// ── Hooks derivados con createSelectorHook (HOF factory) ──

/** Hook tipado para tareas de limpieza */
export const useTareasGlobal = createSelectorHook(
  (estado: EstadoGlobal): readonly TareaLimpieza[] => estado.tareas,
  [] as readonly TareaLimpieza[],
);

/** Hook tipado para métricas del dashboard */
export const useMetricasGlobal = createSelectorHook(
  (estado: EstadoGlobal): MetricasDashboard => estado.metricas,
  ESTADO_INICIAL.metricas,
);

/** Hook para alertas de todos los niveles */
export const useAlertasGlobal = createSelectorHook(
  (estado: EstadoGlobal): readonly Alerta[] => estado.alertas,
  [] as readonly Alerta[],
);

// ─────────────────────────────────────────────────────────────────
// HOOK DE COMPARACIÓN (para debugging / educativo)
// Permite ver cuántas veces cada stream emite independientemente
// ─────────────────────────────────────────────────────────────────

/**
 * useCallback + useObservable: encapsula el callback de selección.
 * Útil para pasar selectores a componentes hijos sin recrear el Observable.
 */
export function useCombinedSelector<T>(
  socket: Socket | null,
  selector: (estado: EstadoGlobal) => T,
  initialValue: T,
): { data: T; loading: boolean; error: Error | null } {
  // useCallback estabiliza la referencia de selector entre renders
  const stableSelector = useCallback(selector, [selector]);

  const stream$ = useMemo<Observable<T> | null>(
    () =>
      socket
        ? createEstadoGlobalStream(socket).pipe(map(stableSelector))
        : null,
    [socket, stableSelector],
  );

  return useObservableWithStatus(stream$, initialValue);
}
