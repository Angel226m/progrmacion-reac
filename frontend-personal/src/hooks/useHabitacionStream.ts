// ═══════════════════════════════════════════════════════════
// HotelFlux — useHabitacionStream (stream en vivo de habitaciones)
// WebSocket con filtro opcional por piso y conteo de estados
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createHabitacionStream, createConteoEstadosStream } from '../streams/habitacion.stream';
import type { Habitacion, ConteoEstados } from '../domain/types';

export function useHabitacionStream(pisoFilter?: number) {
  const { token } = useAuth();

  // Crea stream de habitaciones con filtro opcional por piso
  const habitaciones$ = useMemo(() => {
    if (!token) return null;
    const socket = getSocket(token);
    return createHabitacionStream(socket, pisoFilter);
  }, [token, pisoFilter]);

  // Stream derivado: conteo de estados a partir del stream de habitaciones
  const conteo$ = useMemo(() => {
    if (!habitaciones$) return null;
    return createConteoEstadosStream(habitaciones$);
  }, [habitaciones$]);

  // Suscripciones a ambos streams con valores iniciales
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