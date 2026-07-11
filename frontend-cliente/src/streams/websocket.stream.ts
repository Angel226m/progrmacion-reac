import { Observable, BehaviorSubject, timer } from 'rxjs';
import { retry, shareReplay, debounceTime } from 'rxjs/operators';
import { Socket, Channel } from 'phoenix';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socketInstance && (socketInstance as any).isConnected?.()) return socketInstance;

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
  socketInstance?.disconnect();
  socketInstance = null;
}

const connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');

export function getConnectionState$(): Observable<ConnectionState> {
  return connectionState$.asObservable();
}

export function createChannelStream<T>(
  socket: Socket,
  topic: string,
  event: string,
  params: Record<string, unknown> = {},
): Observable<T> {
  return new Observable<T>((subscriber: import('rxjs').Subscriber<T>) => {
    const channel: Channel = socket.channel(topic, params);

    channel.on(event, (payload: T) => {
      subscriber.next(payload);
    });

    channel
      .join()
      .receive('ok', (resp: Record<string, unknown>) => {
        connectionState$.next('connected');
        const hasData = resp && typeof resp === 'object' && Object.keys(resp).length > 0;
        hasData && subscriber.next(resp as T);
      })
      .receive('error', (reason: Record<string, unknown>) => {
        connectionState$.next('error');
        subscriber.error(new Error(`Channel join error: ${JSON.stringify(reason)}`));
      })
      .receive('timeout', () => {
        connectionState$.next('error');
        subscriber.error(new Error(`Channel join timeout: ${topic}`));
      });

    return () => {
      channel.leave();
    };
  }).pipe(
    retry({
      count: 10,
      delay: (_err, retryCount) => {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
        return timer(delayMs);
      },
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

export function createMultiEventStream<T>(
  socket: Socket,
  topic: string,
  events: readonly string[],
  params: Record<string, unknown> = {},
): Observable<{ event: string; payload: T }> {
  return new Observable<{ event: string; payload: T }>((subscriber: import('rxjs').Subscriber<{ event: string; payload: T }>) => {
    const channel = socket.channel(topic, params);

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
    debounceTime(30),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}

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
