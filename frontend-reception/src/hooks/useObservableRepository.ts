// ═══════════════════════════════════════════════════════════
// HotelFlux — useObservableRepository Hook
//
// Bridge entre Observable Repository y React.
// El hook se suscribe al stream del repositorio y mantiene
// el estado React sincronizado con la fuente de datos reactiva.
//
// Patrón Observable Repository → React:
//   repo.listar$()  ← stream infinito del repositorio
//       │
//       ▼  useObservableRepository
//   { data, loading, error }  ← estado React actualizado automáticamente
//
// Diferencia con useHabitacionStream:
//   - Antes: el hook creaba el socket + stream directamente
//   - Ahora: el hook solo consume el repositorio (Clean Architecture)
//     El repositorio decide cómo obtener los datos (API + WS merge)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { useAuth } from './useAuth';
import { createRepositories } from '../services/repositories';
import type { Result } from '../domain/result';
import type { Habitacion, ConteoEstados } from '../domain/types';
import type { Reserva } from '../domain/entidades/reserva';
import type { TareaLimpieza } from '../domain/entidades/tarea-limpieza';
import { isOfflineMode } from '../services/api';
import { MOCK_HABITACIONES, MOCK_TAREAS } from '../services/mock-data';
import { of } from 'rxjs';

// ── Tipo de retorno del hook con status ──

export interface ObservableRepoState<T> {
  readonly data: T;
  readonly loading: boolean;
  readonly error: Error | null;
}

/**
 * Hook genérico para Observable Repository.
 * Se suscribe a un stream Observable<Result<T>> y expone
 * { data, loading, error } como estado React.
 */
export function useObservableRepository<T>(
  stream$: Observable<Result<T>> | null,
  initialValue: T,
): ObservableRepoState<T> {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!stream$) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const sub = stream$.subscribe({
      next: (result) => {
        if (result.ok) {
          setData(result.value);
          setError(null);
        } else {
          setError(result.error instanceof Error ? result.error : new Error(String(result.error)));
        }
        setLoading(false);
      },
      error: (e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      },
    });

    return () => sub.unsubscribe();
  }, [stream$]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────────────────────────
// HOOKS ESPECIALIZADOS — usan el Observable Repository
// ─────────────────────────────────────────────────────────────────

/**
 * Hook de habitaciones vía Observable Repository.
 * El repositorio fusiona la carga REST inicial con el stream WebSocket.
 * El componente solo suscribe — no sabe de HTTP ni WebSocket.
 */
export function useHabitacionRepository(pisoFilter?: number) {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    if (!token) return null;
    if (isOfflineMode()) {
      const filtered = pisoFilter
        ? MOCK_HABITACIONES.filter((h) => h.piso === pisoFilter)
        : MOCK_HABITACIONES;
      return of({ ok: true as const, value: filtered as readonly Habitacion[] });
    }
    const repos = createRepositories(token);
    return repos.habitaciones.listar$(pisoFilter ? { piso: pisoFilter } : undefined);
  }, [token, pisoFilter]);

  const { data: habitaciones, loading, error } = useObservableRepository<readonly Habitacion[]>(
    stream$,
    [],
  );

  // Conteo de estados — derivado puro del stream de habitaciones
  const conteo = useMemo<ConteoEstados>(
    () =>
      habitaciones.reduce(
        (acc, h) => ({ ...acc, [h.estado]: (acc[h.estado] ?? 0) + 1 }),
        {
          disponible: 0,
          reservada: 0,
          ocupada: 0,
          en_limpieza: 0,
          en_mantenimiento: 0,
          bloqueada: 0,
        } as ConteoEstados,
      ),
    [habitaciones],
  );

  return { habitaciones, conteo, loading, error };
}

/**
 * Hook de reservas vía Observable Repository.
 */
export function useReservaRepository(filtros?: Partial<{ estado: string }>) {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    if (!token) return null;
    const repos = createRepositories(token);
    return repos.reservas.listar$(filtros);
  }, [token, filtros?.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  return useObservableRepository<readonly Reserva[]>(stream$, []);
}

/**
 * Hook de reservas activas en tiempo real.
 */
export function useReservasActivas() {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    if (!token) return null;
    return createRepositories(token).reservas.activas$();
  }, [token]);

  return useObservableRepository<readonly Reserva[]>(stream$, []);
}

/**
 * Hook de tareas de limpieza vía Observable Repository.
 */
export function useTareaRepository(filtros?: Partial<{ estado: string; personal_id: string }>) {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    if (!token) return null;
    if (isOfflineMode()) {
      const filtered = filtros?.personal_id
        ? MOCK_TAREAS.filter((t) => t.empleado_id === filtros.personal_id)
        : MOCK_TAREAS;
      return of({ ok: true as const, value: filtered as readonly TareaLimpieza[] });
    }
    return createRepositories(token).tareas.listar$(filtros);
  }, [token, filtros?.estado, filtros?.personal_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return useObservableRepository<readonly TareaLimpieza[]>(stream$, []);
}
