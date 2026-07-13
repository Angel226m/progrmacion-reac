// ═══════════════════════════════════════════════════════════
// HotelFlux — useLimpiezaStream (stream en vivo de tareas de limpieza)
// Filtra por empleado si el rol es 'limpieza', conecta WebSocket
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createLimpiezaStream, contarPorEstado } from '../streams/limpieza.stream';
import type { TareaLimpieza } from '../domain/types';

export function useLimpiezaStream(filtroEmpleado?: boolean) {
  const { token, usuario } = useAuth();

  // Crea el stream de tareas (con filtro por empleado si aplica)
  const tareas$ = useMemo(() => {
    if (!token) return null;
    const socket = getSocket(token);
    const empleadoId =
      filtroEmpleado && usuario?.rol === 'limpieza' ? usuario.id : undefined;
    return createLimpiezaStream(socket, empleadoId);
  }, [token, usuario, filtroEmpleado]);

  // Suscribe al stream con valor inicial vacío
  const tareas = useObservable<readonly TareaLimpieza[]>(tareas$, []);

  // Conteo agrupado por estado de tarea (memoizado)
  const conteo = useMemo(() => contarPorEstado(tareas), [tareas]);

  return { tareas, conteo };
}