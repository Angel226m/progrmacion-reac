// ═══════════════════════════════════════════════════════════
// HotelFlux — Notificación Stream (Alertas en tiempo real)
// Observable reactivo para alertas globales del sistema
// ═══════════════════════════════════════════════════════════

import { Observable, Subject, merge } from 'rxjs';
import { scan, startWith, map, shareReplay } from 'rxjs/operators';
import { Socket } from 'phoenix';
import { createChannelStream } from './websocket.stream';

// ── Tipos de notificación ──

export type TipoNotificacion = 'info' | 'success' | 'warning' | 'error';

export interface Notificacion {
  readonly id: string;
  readonly tipo: TipoNotificacion;
  readonly titulo: string;
  readonly mensaje: string;
  readonly timestamp: string;
  readonly leida: boolean;
}

// ── Subject para notificaciones locales (side-effect controlado) ──

const notificacionLocal$ = new Subject<Omit<Notificacion, 'id' | 'timestamp' | 'leida'>>();

export function emitirNotificacion(
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
): void {
  notificacionLocal$.next({ tipo, titulo, mensaje });
}

// ── Función pura: crear stream de notificaciones ──

export function createNotificacionStream(
  socket: Socket,
): Observable<readonly Notificacion[]> {
  // Stream desde el backend (Phoenix Channel)
  const remota$ = createChannelStream<{
    tipo: string;
    mensaje: string;
    titulo?: string;
  }>(socket, 'notificaciones:global', 'nueva_alerta').pipe(
    map((payload: { tipo: string; mensaje: string; titulo?: string }) => ({
      tipo: (payload.tipo ?? 'info') as TipoNotificacion,
      titulo: payload.titulo ?? 'Alerta',
      mensaje: payload.mensaje,
    })),
  );

  // Merge de fuentes: remotas + locales (composición funcional)
  return merge(remota$, notificacionLocal$).pipe(
    // Convertir a Notificacion completa con ID único
    map((partial: { tipo: TipoNotificacion; titulo: string; mensaje: string }) => ({
      ...partial,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      leida: false,
    })),

    // Acumular (últimas 50, backpressure)
    scan((acc: readonly Notificacion[], notif: Notificacion) => {
      const nuevas = [notif, ...acc];
      return nuevas.length > 50 ? nuevas.slice(0, 50) : nuevas;
    }, []),

    startWith([]),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ── Función pura: contar no leídas ──

export function contarNoLeidas(
  notificaciones: readonly Notificacion[],
): number {
  return notificaciones.filter((n) => !n.leida).length;
}

// ── Función pura: marcar como leída (inmutable) ──

export function marcarLeida(
  notificaciones: readonly Notificacion[],
  id: string,
): readonly Notificacion[] {
  return notificaciones.map((n) =>
    n.id === id ? { ...n, leida: true } : n,
  );
}

// ── Función pura: marcar todas como leídas ──

export function marcarTodasLeidas(
  notificaciones: readonly Notificacion[],
): readonly Notificacion[] {
  return notificaciones.map((n) => ({ ...n, leida: true }));
}
