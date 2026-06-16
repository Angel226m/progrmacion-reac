import { describe, it, expect } from 'vitest';
import { Subject, firstValueFrom, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { getConnectionState$ } from '../../streams/websocket.stream';
import {
  buscarHabitacion,
  construirArbolPisos,
  filtrarPorEstado,
  filtrarPorPiso,
} from '../../streams/habitacion.stream';
import {
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from '../../streams/notificacion.stream';
import { calcularResumen, ESTADO_INICIAL } from '../../streams/composite/reserva-state.stream';
import type { Habitacion, EstadoHabitacion, ConteoEstados } from '../../domain/types';
import type { Notificacion } from '../../streams/notificacion.stream';

// ═══════════════════════════════════════════════════════════
// WEBSOCKET STREAM — conexión y estado
// ═══════════════════════════════════════════════════════════

describe('WebSocket stream / ConnectionState', () => {
  it('connectionState$ es un Observable', () => {
    const state$ = getConnectionState$();
    expect(state$).toBeInstanceOf(Observable);
  });

  it('connectionState$ emite disconnected al inicio', () => {
    const state$ = getConnectionState$();
    const states: string[] = [];
    const sub = state$.subscribe((s) => states.push(s));
    expect(states[0]).toBe('disconnected');
    sub.unsubscribe();
  });
});

// ═══════════════════════════════════════════════════════════
// HABITACION STREAM — funciones puras
// ═══════════════════════════════════════════════════════════

describe('Habitación stream / funciones puras', () => {
  const habs: readonly Habitacion[] = [
    { id: 'h1', numero: '101', piso: 1, tipo: 'individual', estado: 'disponible', eliminado: false } as unknown as Habitacion,
    { id: 'h2', numero: '102', piso: 1, tipo: 'doble', estado: 'ocupada', eliminado: false } as unknown as Habitacion,
    { id: 'h3', numero: '201', piso: 2, tipo: 'suite', estado: 'disponible', eliminado: false } as unknown as Habitacion,
    { id: 'h4', numero: '202', piso: 2, tipo: 'familiar', estado: 'en_limpieza', eliminado: false } as unknown as Habitacion,
  ];

  describe('buscarHabitacion (recursiva)', () => {
    it('encuentra por id existente', () => {
      const result = buscarHabitacion(habs, 'h2');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('h2');
    });

    it('retorna null si no existe', () => {
      expect(buscarHabitacion(habs, 'no-existe')).toBeNull();
    });

    it('retorna null en array vacío', () => {
      expect(buscarHabitacion([], 'h1')).toBeNull();
    });

    it('[CARGA] busca en 1000 habitaciones', () => {
      const many = Array.from({ length: 1000 }, (_, i) =>
        ({ id: `h${i}`, numero: String(i), piso: 1, tipo: 'individual', estado: 'disponible', eliminado: false } as unknown as Habitacion));
      const result = buscarHabitacion(many, 'h999');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('h999');
    });
  });

  describe('construirArbolPisos (recursiva)', () => {
    it('agrupa habitaciones por piso', () => {
      const arbol = construirArbolPisos(habs);
      expect(arbol.size).toBe(2);
      expect(arbol.get(1)!.habitaciones).toHaveLength(2);
      expect(arbol.get(2)!.habitaciones).toHaveLength(2);
    });

    it('piso 1 tiene numeros 101, 102', () => {
      const arbol = construirArbolPisos(habs);
      const nums = arbol.get(1)!.habitaciones.map((h) => h.numero).sort();
      expect(nums).toEqual(['101', '102']);
    });

    it('retorna Map vacío para array vacío', () => {
      expect(construirArbolPisos([]).size).toBe(0);
    });
  });

  describe('filtrarPorEstado (operador pipe)', async () => {
    it('filtra habitaciones por estado disponible', async () => {
      const source$ = new Subject<readonly Habitacion[]>();
      const filtrado$ = filtrarPorEstado(source$, 'disponible' as EstadoHabitacion);
      const result = firstValueFrom(filtrado$.pipe(take(1)));
      source$.next(habs);
      const val = await result;
      expect(val.every((h) => h.estado === 'disponible')).toBe(true);
      expect(val).toHaveLength(2);
    });

    it('filtra por estado ocupada', async () => {
      const source$ = new Subject<readonly Habitacion[]>();
      const filtrado$ = filtrarPorEstado(source$, 'ocupada' as EstadoHabitacion);
      const result = firstValueFrom(filtrado$.pipe(take(1)));
      source$.next(habs);
      const val = await result;
      expect(val).toHaveLength(1);
      expect(val[0]!.id).toBe('h2');
    });
  });

  describe('filtrarPorPiso (operador pipe)', () => {
    it('filtra habitaciones por piso 1', async () => {
      const source$ = new Subject<readonly Habitacion[]>();
      const filtrado$ = filtrarPorPiso(source$, 1);
      const result = firstValueFrom(filtrado$.pipe(take(1)));
      source$.next(habs);
      const val = await result;
      expect(val.every((h) => h.piso === 1)).toBe(true);
      expect(val).toHaveLength(2);
    });

    it('filtra por piso 2', async () => {
      const source$ = new Subject<readonly Habitacion[]>();
      const filtrado$ = filtrarPorPiso(source$, 2);
      const result = firstValueFrom(filtrado$.pipe(take(1)));
      source$.next(habs);
      const val = await result;
      expect(val.every((h) => h.piso === 2)).toBe(true);
      expect(val).toHaveLength(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// NOTIFICACION STREAM — funciones puras
// ═══════════════════════════════════════════════════════════

describe('Notificación stream / funciones puras', () => {
  const notif: Notificacion = {
    id: 'n1', tipo: 'info', titulo: 'Test', mensaje: 'Mensaje de prueba',
    timestamp: '2025-01-01T00:00:00Z', leida: false,
  };
  const notifLeida: Notificacion = { ...notif, id: 'n2', leida: true };

  describe('contarNoLeidas', () => {
    it('cuenta correctamente las no leídas', () => {
      expect(contarNoLeidas([notif, notifLeida])).toBe(1);
    });

    it('0 si todas están leídas', () => {
      expect(contarNoLeidas([notifLeida])).toBe(0);
    });

    it('0 si la lista está vacía', () => {
      expect(contarNoLeidas([])).toBe(0);
    });
  });

  describe('marcarLeida (inmutable)', () => {
    it('marca una notificación como leída', () => {
      const result = marcarLeida([notif], 'n1');
      expect(result[0]!.leida).toBe(true);
    });

    it('no muta el array original', () => {
      const original = [notif];
      marcarLeida(original, 'n1');
      expect(original[0]!.leida).toBe(false);
    });

    it('retorna el mismo array si el id no existe', () => {
      const result = marcarLeida([notif], 'no-existe');
      expect(result).toEqual([notif]);
    });
  });

  describe('marcarTodasLeidas (inmutable)', () => {
    it('marca todas como leídas', () => {
      const result = marcarTodasLeidas([notif, notifLeida]);
      expect(result.every((n) => n.leida)).toBe(true);
    });

    it('no muta el array original', () => {
      const original = [notif, notifLeida];
      marcarTodasLeidas(original);
      expect(original[0]!.leida).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// RESERVA STATE STREAM — funciones compuestas
// ═══════════════════════════════════════════════════════════

describe('ReservaState stream / funciones puras', () => {
  describe('calcularResumen', () => {
    it('calcula resumen con datos mixtos', () => {
      const conteo: ConteoEstados = {
        disponible: 10, reservada: 3, ocupada: 5,
        en_limpieza: 2, en_mantenimiento: 1, bloqueada: 0,
      };
      const resumen = calcularResumen(conteo);
      expect(resumen.disponibles).toBe(10);
      expect(resumen.ocupadas).toBe(8);
      expect(resumen.totalHabitaciones).toBe(21);
      expect(resumen.porcentajeDisponible).toBe(48);
    });

    it('todo ocupado = 0% disponible', () => {
      const conteo: ConteoEstados = {
        disponible: 0, reservada: 5, ocupada: 5,
        en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
      };
      const resumen = calcularResumen(conteo);
      expect(resumen.porcentajeDisponible).toBe(0);
    });

    it('todo disponible = 100%', () => {
      const conteo: ConteoEstados = {
        disponible: 20, reservada: 0, ocupada: 0,
        en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
      };
      const resumen = calcularResumen(conteo);
      expect(resumen.porcentajeDisponible).toBe(100);
    });

    it('sin habitaciones = 0%', () => {
      const conteo: ConteoEstados = {
        disponible: 0, reservada: 0, ocupada: 0,
        en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
      };
      const resumen = calcularResumen(conteo);
      expect(resumen.porcentajeDisponible).toBe(0);
    });
  });

  describe('ESTADO_INICIAL', () => {
    it('es inmutable y tiene la estructura correcta', () => {
      expect(ESTADO_INICIAL.habitaciones).toEqual([]);
      expect(ESTADO_INICIAL.conteo.disponible).toBe(0);
      expect(ESTADO_INICIAL.resumen.porcentajeDisponible).toBe(0);
    });
  });
});
