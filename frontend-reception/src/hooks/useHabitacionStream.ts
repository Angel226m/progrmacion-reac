// ═══════════════════════════════════════════════════════════
// HotelFlux — useHabitacionStream Hook
// Conecta el stream reactivo de habitaciones con React
// Fallback: usa mock data cuando la API está offline
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { of } from 'rxjs';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createHabitacionStream, createConteoEstadosStream } from '../streams/habitacion.stream';
import { isOfflineMode } from '../services/api';
import { MOCK_HABITACIONES } from '../services/mock-data';
import type { Habitacion, ConteoEstados } from '../domain/types';

export function useHabitacionStream(pisoFilter?: number) {
  const { token } = useAuth();

  const habitaciones$ = useMemo(() => {
    if (!token) return null;
    // Si estamos en modo offline, emite mock data directamente
    if (isOfflineMode()) {
      const filtered = pisoFilter
        ? MOCK_HABITACIONES.filter(h => h.piso === pisoFilter)
        : MOCK_HABITACIONES;
      return of([...filtered]);
    }
    try {
      const socket = getSocket(token);
      return createHabitacionStream(socket, pisoFilter);
    } catch {
      // WebSocket falló → usar mock
      const filtered = pisoFilter
        ? MOCK_HABITACIONES.filter(h => h.piso === pisoFilter)
        : MOCK_HABITACIONES;
      return of([...filtered]);
    }
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
