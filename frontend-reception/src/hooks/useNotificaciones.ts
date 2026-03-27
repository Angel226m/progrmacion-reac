// ═══════════════════════════════════════════════════════════
// HotelFlux — useNotificaciones Hook
// Conecta stream de alertas con React
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useObservable } from './useObservable';
import { getSocket } from '../streams/websocket.stream';
import {
  createNotificacionStream,
  contarNoLeidas,
  type Notificacion,
} from '../streams/notificacion.stream';

export function useNotificaciones() {
  const { token } = useAuth();
  const [leidasLocal, setLeidasLocal] = useState<ReadonlySet<string>>(new Set());

  const notificaciones$ = useMemo(() => {
    if (!token) return null;
    const socket = getSocket(token);
    return createNotificacionStream(socket);
  }, [token]);

  const notificacionesRaw = useObservable<readonly Notificacion[]>(notificaciones$, []);

  // Aplicar lecturas locales (función pura)
  const notificaciones = useMemo(
    () =>
      notificacionesRaw.map((n) =>
        leidasLocal.has(n.id) ? { ...n, leida: true } : n,
      ),
    [notificacionesRaw, leidasLocal],
  );

  const noLeidas = useMemo(() => contarNoLeidas(notificaciones), [notificaciones]);

  const marcarComoLeida = useCallback((id: string) => {
    setLeidasLocal((prev) => new Set([...prev, id]));
  }, []);

  const marcarTodasComoLeidas = useCallback(() => {
    setLeidasLocal((prev) => {
      const ids = notificacionesRaw.map((n) => n.id);
      return new Set([...prev, ...ids]);
    });
  }, [notificacionesRaw]);

  return {
    notificaciones,
    noLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
  };
}
