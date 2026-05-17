import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createHabitacionStream, createConteoEstadosStream } from '../streams/habitacion.stream';
import type { Habitacion, ConteoEstados } from '../domain/types';

export function useHabitacionStream(pisoFilter?: number) {
  const { token } = useAuth();

  const habitaciones$ = useMemo(() => {
    if (!token) return null;
    const socket = getSocket(token);
    return createHabitacionStream(socket, pisoFilter);
  }, [token, pisoFilter]);

  const conteo$ = useMemo(() => {
    if (!habitaciones$) return null;
    return createConteoEstadosStream(habitaciones$);
  }, [habitaciones$]);

  const habitaciones = useObservable<readonly Habitacion[]>(habitaciones$, []);
  const conteo = useObservable<ConteoEstados>(conteo$, {
    disponible: 0,
    reservada: 0,
    ocupada: 0,
    en_limpieza: 0,
    en_mantenimiento: 0,
    bloqueada: 0,
  });

  return { habitaciones, conteo };
}