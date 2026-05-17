import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import { createLimpiezaStream, contarPorEstado } from '../streams/limpieza.stream';
import type { TareaLimpieza } from '../domain/types';

export function useLimpiezaStream(filtroEmpleado?: boolean) {
  const { token, usuario } = useAuth();

  const tareas$ = useMemo(() => {
    if (!token) return null;
    const socket = getSocket(token);
    const empleadoId =
      filtroEmpleado && usuario?.rol === 'limpieza' ? usuario.id : undefined;
    return createLimpiezaStream(socket, empleadoId);
  }, [token, usuario, filtroEmpleado]);

  const tareas = useObservable<readonly TareaLimpieza[]>(tareas$, []);

  const conteo = useMemo(() => contarPorEstado(tareas), [tareas]);

  return { tareas, conteo };
}