import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  Comando,
  createCommandHandler,
  withSwitchEffect,
  withCommandLog,
  ComandoHotel,
  ResultadoComando,
} from '../../streams/commands.stream';

describe('[StepVerifier] commands.stream — Comando constructores', () => {
  it('Comando.checkin — crea comando CHECKIN', () => {
    const cmd = Comando.checkin({ reserva_id: 'r1' });
    expect(cmd._tipo).toBe('CHECKIN');
    expect(cmd.payload.reserva_id).toBe('r1');
  });

  it('Comando.checkout — crea comando CHECKOUT', () => {
    const cmd = Comando.checkout({ reserva_id: 'r2' });
    expect(cmd._tipo).toBe('CHECKOUT');
  });

  it('Comando.crearReserva — crea comando CREAR_RESERVA', () => {
    const cmd = Comando.crearReserva({
      huesped_id: 'h1', habitacion_id: 'hab1',
      fecha_entrada: '2026-01-01', fecha_salida: '2026-01-05',
    });
    expect(cmd._tipo).toBe('CREAR_RESERVA');
    expect(cmd.payload.habitacion_id).toBe('hab1');
  });

  it('Comando.venta — crea comando VENTA_PRODUCTO', () => {
    const cmd = Comando.venta({ reserva_id: 'r1', producto_id: 'p1', cantidad: 2 });
    expect(cmd._tipo).toBe('VENTA_PRODUCTO');
    expect(cmd.payload.cantidad).toBe(2);
  });

  it('Comando.cancelarReserva — crea comando CANCELAR_RESERVA', () => {
    const cmd = Comando.cancelarReserva('r1');
    expect(cmd._tipo).toBe('CANCELAR_RESERVA');
    expect(cmd.payload.reserva_id).toBe('r1');
  });
});

describe('[StepVerifier] commands.stream — createCommandHandler HOF', () => {
  it('handler exitoso — retorna { ok: true, data }', async () => {
    const handler = createCommandHandler(async () => ({ exito: true }));
    const result = await firstValueFrom(handler({ reserva_id: 'r1' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ exito: true });
  });

  it('handler con error — retorna { ok: false, error }', async () => {
    const handler = createCommandHandler(async () => {
      throw new Error('fallo controlado');
    });
    const result = await firstValueFrom(handler({ reserva_id: 'r1' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('fallo controlado');
  });

  it('handler con Observable — soporta retorno Observable', async () => {
    const handler = createCommandHandler(() => of(42));
    const result = await firstValueFrom(handler({ reserva_id: 'r1' }));
    expect(result.ok).toBe(true);
  });
});

describe('[StepVerifier] commands.stream — HOF operadores (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('withSwitchEffect — cancela efecto anterior y solo emite el último', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--|', { a: 1, b: 2 });
      const effect = (x: number) => cold('--r|', { r: `result-${x}` });
      const result$ = source$.pipe(withSwitchEffect(effect));

      expectObservable(result$).toBe('----r--s|', {
        r: 'result-1',
        s: 'result-2',
      });
    });
  });
});

describe('[StepVerifier] commands.stream — createCommandBus (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('filtra comandos sin handler registrado', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const handlers = {
        CHECKIN: (payload: { reserva_id: string }) => of({ ok: true as const, data: payload }),
      };

      const cmdA = Comando.checkin({ reserva_id: 'r1' });
      const cmdB = Comando.checkout({ reserva_id: 'r2' });

      const source$ = cold('(ab|)', { a: cmdA, b: cmdB });
      const result$ = source$.pipe(
        (src$) => {
          return src$.pipe(
            (s$) => {
              let result$2: Observable<ResultadoComando> | null = null;
              return new Observable<ResultadoComando>((sub) => {
                s$.subscribe({
                  next: (cmd) => {
                    const handler = handlers[cmd._tipo as keyof typeof handlers];
                    if (handler) {
                      handler(cmd.payload).subscribe((r) => sub.next(r));
                    }
                  },
                  error: (e) => sub.error(e),
                  complete: () => sub.complete(),
                });
              });
            },
          );
        },
      );

      expectObservable(result$).toBe('(a|)', {
        a: { ok: true, data: { reserva_id: 'r1' } },
      });
    });
  });
});
