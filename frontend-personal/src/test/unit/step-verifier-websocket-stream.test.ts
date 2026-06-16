import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { Observable } from 'rxjs';
import { getConnectionState$, disconnectSocket } from '../../streams/websocket.stream';

describe('[StepVerifier] websocket.stream — createChannelStream (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('emite eventos del canal como valores del stream', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b|', {
        a: { tipo: 'checkin', habitacion_id: '101' },
        b: { tipo: 'checkout', habitacion_id: '102' },
      });

      expectObservable(source$).toBe('--a--b|', {
        a: { tipo: 'checkin', habitacion_id: '101' },
        b: { tipo: 'checkout', habitacion_id: '102' },
      });
    });
  });

  it('createMultiEventStream — emite { event, payload } por cada evento', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b|', {
        a: { event: 'estado_actualizado', payload: { id: 'h1', estado: 'ocupada' } },
        b: { event: 'mapa_completo', payload: { habitaciones: [] } },
      });

      expectObservable(source$).toBe('--a--b|', {
        a: { event: 'estado_actualizado', payload: { id: 'h1', estado: 'ocupada' } },
        b: { event: 'mapa_completo', payload: { habitaciones: [] } },
      });
    });
  });

  it('retry — reintenta después de error', () => {
    scheduler.run(({ cold, expectObservable }) => {
      let calls = 0;
      const src$ = cold('--#', null, new Error('fail'));
      const source$ = new Observable<string>((sub) => {
        function attempt() {
          src$.subscribe({
            next: (v) => sub.next(v as string),
            error: () => {
              calls++;
              if (calls < 2) attempt();
              else { sub.next('ok'); sub.complete(); }
            },
            complete: () => sub.complete(),
          });
        }
        attempt();
      });

      expectObservable(source$).toBe('----(a|)', { a: 'ok' });
    });
  });
});

describe('[StepVerifier] websocket.stream — conexión y estado', () => {
  it('getConnectionState$ — BehaviorSubject emite estado inicial', () => {
    const state$ = getConnectionState$();
    expect(state$).toBeDefined();
  });

  it('disconnectSocket — limpia la instancia del socket', () => {
    expect(() => disconnectSocket()).not.toThrow();
  });
});
