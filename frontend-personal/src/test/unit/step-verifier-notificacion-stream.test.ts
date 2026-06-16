import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { of, Observable } from 'rxjs';
import { scan, startWith, map } from 'rxjs/operators';
import {
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  Notificacion,
  TipoNotificacion,
} from '../../streams/notificacion.stream';

const notifBase: Notificacion = {
  id: 'n1',
  tipo: 'info',
  titulo: 'Bienvenida',
  mensaje: 'Sistema listo',
  timestamp: '2026-01-01T00:00:00Z',
  leida: false,
};

const notifLeida: Notificacion = { ...notifBase, id: 'n2', leida: true };
const notifWarning: Notificacion = { ...notifBase, id: 'n3', tipo: 'warning', leida: false };

describe('[StepVerifier] notificacion.stream — funciones puras', () => {
  it('contarNoLeidas — cuenta correctamente', () => {
    const notificaciones = [notifBase, notifLeida, notifWarning];
    expect(contarNoLeidas(notificaciones)).toBe(2);
  });

  it('contarNoLeidas — todas leídas retorna 0', () => {
    expect(contarNoLeidas([notifLeida])).toBe(0);
  });

  it('contarNoLeidas — array vacío retorna 0', () => {
    expect(contarNoLeidas([])).toBe(0);
  });

  it('marcarLeida — marca una como leída (inmutable)', () => {
    const resultado = marcarLeida([notifBase, notifLeida], 'n1');
    expect(resultado[0]!.leida).toBe(true);
    expect(resultado[1]!.leida).toBe(true);
    expect(notifBase.leida).toBe(false);
  });

  it('marcarLeida — id inexistente no modifica nada', () => {
    const resultado = marcarLeida([notifBase], 'inexistente');
    expect(resultado).toEqual([notifBase]);
  });

  it('marcarTodasLeidas — marca todas como leídas (inmutable)', () => {
    const resultado = marcarTodasLeidas([notifBase, notifWarning]);
    expect(resultado.every((n) => n.leida)).toBe(true);
    expect(notifBase.leida).toBe(false);
    expect(notifWarning.leida).toBe(false);
  });

  it('marcarTodasLeidas — array vacío retorna array vacío', () => {
    expect(marcarTodasLeidas([])).toEqual([]);
  });
});

describe('[StepVerifier] notificacion.stream — scan acumulación (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('scan acumula notificaciones con límite de 50', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', {
        a: { tipo: 'info' as TipoNotificacion, titulo: 'A', mensaje: 'Msg A' },
        b: { tipo: 'warning' as TipoNotificacion, titulo: 'B', mensaje: 'Msg B' },
      });

      const result$ = source$.pipe(
        map((partial: { tipo: TipoNotificacion; titulo: string; mensaje: string }) => ({
          ...partial,
          id: 'test-id',
          timestamp: '2026-01-01T00:00:00Z',
          leida: false,
        })),
        scan((acc: readonly Notificacion[], notif: Notificacion) => {
          const nuevas = [notif, ...acc];
          return nuevas.length > 50 ? nuevas.slice(0, 50) : nuevas;
        }, [] as readonly Notificacion[]),
        startWith([] as readonly Notificacion[]),
      );

      expectObservable(result$).toBe('(abc|)', {
        a: [],
        b: [
          { id: 'test-id', tipo: 'info', titulo: 'A', mensaje: 'Msg A', timestamp: '2026-01-01T00:00:00Z', leida: false },
        ],
        c: [
          { id: 'test-id', tipo: 'warning', titulo: 'B', mensaje: 'Msg B', timestamp: '2026-01-01T00:00:00Z', leida: false },
          { id: 'test-id', tipo: 'info', titulo: 'A', mensaje: 'Msg A', timestamp: '2026-01-01T00:00:00Z', leida: false },
        ],
      });
    });
  });
});
