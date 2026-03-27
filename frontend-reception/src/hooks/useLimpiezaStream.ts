// ═══════════════════════════════════════════════════════════
// HotelFlux — useLimpiezaStream Hook
// Conecta el stream reactivo de limpieza con React
// Fallback: usa mock data cuando la API está offline
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { of } from 'rxjs';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createLimpiezaStream, contarPorEstado } from '../streams/limpieza.stream';
import { isOfflineMode } from '../services/api';
import { MOCK_TAREAS } from '../services/mock-data';
import type { TareaLimpieza } from '../domain/types';

export function useLimpiezaStream(filtroEmpleado?: boolean) {
  const { token, usuario } = useAuth();

  const tareas$ = useMemo(() => {
    if (!token) return null;
    if (isOfflineMode()) {
      const filtered = filtroEmpleado && usuario?.rol === 'limpieza'
        ? MOCK_TAREAS.filter(t => t.empleado_id === usuario.id)
        : MOCK_TAREAS;
      return of([...filtered]);
    }
    try {
      const socket = getSocket(token);
      const empleadoId =
        filtroEmpleado && usuario?.rol === 'limpieza' ? usuario.id : undefined;
      return createLimpiezaStream(socket, empleadoId);
    } catch {
      return of([...MOCK_TAREAS]);
    }
  }, [token, usuario, filtroEmpleado]);

  const tareas = useObservable<readonly TareaLimpieza[]>(tareas$, []);

  const conteo = useMemo(() => contarPorEstado(tareas), [tareas]);

  return { tareas, conteo };
}
