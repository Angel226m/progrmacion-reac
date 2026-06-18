// ═══════════════════════════════════════════════════════════
// HotelFlux — WebSocket Stream (Observable reactivo)
// Wraps Phoenix Channels con RxJS para reactividad pura
//
// Demuestra:
// - Observable.create: construcción de Observable desde WebSocket
// - retry con delay-backoff: resiliencia reactiva (retryWhen deprecado en RxJS 7)
// - shareReplay: multicast — un solo canal para N suscriptores
// - debounceTime: backpressure — consolida ráfagas de eventos
// - BehaviorSubject: estado de conexión como stream
// ═══════════════════════════════════════════════════════════

import { Observable, BehaviorSubject, timer } from 'rxjs';
import { retry, shareReplay, debounceTime } from 'rxjs/operators';
import { Socket, Channel } from 'phoenix';

// ── Estado de conexión como tipo inmutable ──

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Singleton del socket Phoenix ──

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socketInstance && (socketInstance as any).isConnected?.()) {
    return socketInstance;
  }

  const wsUrl = import.meta.env.VITE_WS_URL || '/socket';

  socketInstance = new Socket(wsUrl, {
    params: token ? { token } : {},
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
    heartbeatIntervalMs: 30000,
  });

  socketInstance.connect();
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// ── Estado de conexión como Observable reactivo ──

const connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');

export function getConnectionState$(): Observable<ConnectionState> {
  return connectionState$.asObservable();
}

// ── Función pura: crea un Observable desde un Phoenix Channel ──
// Patrón Observer: cada evento del channel se emite como valor del stream

export function createChannelStream<T>(
  socket: Socket,
  topic: string,
  event: string,
  params: Record<string, unknown> = {},
): Observable<T> {
  return new Observable<T>((subscriber: import('rxjs').Subscriber<T>) => {
    const channel: Channel = socket.channel(topic, params);

    // Escuchar evento específico → emitir en el stream
    channel.on(event, (payload: T) => {
      subscriber.next(payload);
    });

    // Unirse al canal
    channel
      .join()
      .receive('ok', (resp: Record<string, unknown>) => {
        connectionState$.next('connected');
        // Si la respuesta inicial contiene datos, emitirlos
        if (resp && typeof resp === 'object' && Object.keys(resp).length > 0) {
          subscriber.next(resp as T);
        }
      })
      .receive('error', (reason: Record<string, unknown>) => {
        connectionState$.next('error');
        subscriber.error(new Error(`Channel join error: ${JSON.stringify(reason)}`));
      })
      .receive('timeout', () => {
        connectionState$.next('error');
        subscriber.error(new Error(`Channel join timeout: ${topic}`));
      });

    // Cleanup al unsubscribe (funcional: sin side-effects residuales)
    return () => {
      channel.leave();
    };
  }).pipe(
    // Retry con backoff exponencial (resiliencia reactiva — retry moderno RxJS 7)
    retry({
      count: 10,
      delay: (_err, retryCount) => {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
        return timer(delayMs);
      },
    }),
    // Compartir la suscripción (multicast) — un solo canal para N subscribers
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ── Función pura: crea un Observable multi-evento desde un Channel ──
// debounceTime: si varios eventos llegan en ráfaga (ej: checkout dispara
// habitación + limpieza + dashboard), espera 30ms para emitir el último.
// Evita actualizaciones redundantes del frontend (backpressure).

export function createMultiEventStream<T>(
  socket: Socket,
  topic: string,
  events: readonly string[],
  params: Record<string, unknown> = {},
): Observable<{ event: string; payload: T }> {
  return new Observable<{ event: string; payload: T }>((subscriber: import('rxjs').Subscriber<{ event: string; payload: T }>) => {
    const channel = socket.channel(topic, params);

    // Registrar listener por cada evento (HOF: forEach con closure)
    events.forEach((event) => {
      channel.on(event, (payload: T) => {
        subscriber.next({ event, payload });
      });
    });

    channel
      .join()
      .receive('ok', () => connectionState$.next('connected'))
      .receive('error', (reason: Record<string, unknown>) => {
        subscriber.error(new Error(`Multi-event join error: ${JSON.stringify(reason)}`));
      });

    return () => channel.leave();
  }).pipe(
    // debounceTime: backpressure — esperar 30ms de silencio antes de emitir
    // Útil cuando el backend emite varios eventos relacionados casi simultáneamente
    debounceTime(30),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

// ── Push de comandos al channel (side-effect controlado) ──

export function pushToChannel<T>(
  socket: Socket,
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const channel = socket.channel(topic, {});

    channel
      .join()
      .receive('ok', () => {
        channel
          .push(event, payload)
          .receive('ok', (resp: T) => {
            channel.leave();
            resolve(resp);
          })
          .receive('error', (reason: Record<string, unknown>) => {
            channel.leave();
            reject(new Error(JSON.stringify(reason)));
          });
      })
      .receive('error', (reason: Record<string, unknown>) => {
        reject(new Error(JSON.stringify(reason)));
      });
  });
}
