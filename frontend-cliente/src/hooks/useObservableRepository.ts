// ═══════════════════════════════════════════════════════════
// HotelFlux — useObservableRepository Hook
// Puente entre repositorios observables (RxJS) y React
// Hook genérico para suscribirse a streams de Result<T>
// Hooks especializados: useHabitacionRepository, useReservaRepository
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { useAuth } from './useAuth';
import { createRepositories } from '../services/repositories';
import type { Result } from '../domain/result';
import { fold } from '../domain/result';
import type { Habitacion, ConteoEstados } from '../domain/types';
import type { Reserva } from '../domain/entidades/reserva';

export interface ObservableRepoState<T> {
  readonly data: T;
  readonly loading: boolean;
  readonly error: Error | null;
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

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
        fold<T, Error, void>(
          (value: T) => {
            setData(value);
            setError(null);
          },
          (error: Error) => setError(toError(error)),
        )(result);
        setLoading(false);
      },
      error: (e: unknown) => {
        setError(toError(e));
        setLoading(false);
      },
    });

    return () => sub.unsubscribe();
  }, [stream$]);

  return { data, loading, error };
}

export function useHabitacionRepository(pisoFilter?: number) {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    return !token
      ? null
      : createRepositories(token).habitaciones.listar$(pisoFilter ? { piso: pisoFilter } : undefined);
  }, [token, pisoFilter]);

  const { data: habitaciones, loading, error } = useObservableRepository<readonly Habitacion[]>(
    stream$,
    [],
  );

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

export function useReservaRepository(filtros?: Partial<{ estado: string }>) {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    return !token
      ? null
      : createRepositories(token).reservas.listar$(filtros);
  }, [token, filtros?.estado]);

  return useObservableRepository<readonly Reserva[]>(stream$, []);
}

export function useReservasActivas() {
  const { token } = useAuth();

  const stream$ = useMemo(() => {
    return !token
      ? null
      : createRepositories(token).reservas.activas$();
  }, [token]);

  return useObservableRepository<readonly Reserva[]>(stream$, []);
}
