import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { of, Observable } from 'rxjs';
import { EstadoHabitacion, Habitacion, ConteoEstados } from '../../domain/types';
import {
  buscarHabitacion,
  construirArbolPisos,
  filtrarPorEstado as filtrarHabsPorEstado,
  filtrarPorPiso,
  createConteoEstadosStream,
} from '../../streams/habitacion.stream';

const habA: Habitacion = {
  id: 'h1', numero: '101', tipo: 'doble', piso: 1, capacidad: 2,
  precio_noche: '120', estado: 'disponible', amenidades: [], clasificacion: null,
  caracteristicas: null, notas: null, inserted_at: '', updated_at: '',
};

const habB: Habitacion = {
  id: 'h2', numero: '102', tipo: 'individual', piso: 1, capacidad: 1,
  precio_noche: '80', estado: 'ocupada', amenidades: [], clasificacion: null,
  caracteristicas: null, notas: null, inserted_at: '', updated_at: '',
};

const habC: Habitacion = {
  id: 'h3', numero: '201', tipo: 'suite', piso: 2, capacidad: 3,
  precio_noche: '250', estado: 'disponible', amenidades: [], clasificacion: null,
  caracteristicas: null, notas: null, inserted_at: '', updated_at: '',
};

const habitaciones = [habA, habB, habC] as readonly Habitacion[];

describe('[StepVerifier] habitacion.stream — funciones puras', () => {
  it('buscarHabitacion — encuentra por id (recursiva)', () => {
    const result = buscarHabitacion(habitaciones, 'h2');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('h2');
    expect(result!.numero).toBe('102');
  });

  it('buscarHabitacion — retorna null si no existe', () => {
    expect(buscarHabitacion(habitaciones, 'inexistente')).toBeNull();
  });

  it('buscarHabitacion — lista vacía retorna null', () => {
    expect(buscarHabitacion([], 'h1')).toBeNull();
  });

  it('construirArbolPisos — agrupa por piso (recursiva)', () => {
    const arbol = construirArbolPisos(habitaciones);
    expect(arbol.size).toBe(2);
    expect(arbol.get(1)!.habitaciones.length).toBe(2);
    expect(arbol.get(2)!.habitaciones.length).toBe(1);
  });

  it('construirArbolPisos — lista vacía retorna mapa vacío', () => {
    const arbol = construirArbolPisos([]);
    expect(arbol.size).toBe(0);
  });
});

describe('[StepVerifier] habitacion.stream — stream de conteo', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('createConteoEstadosStream — cuenta estados correctamente', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: habitaciones });
      const conteo$ = createConteoEstadosStream(source$);

      const expected: ConteoEstados = {
        disponible: 2, reservada: 0, ocupada: 1,
        en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
      };

      expectObservable(conteo$).toBe('(a|)', { a: expected });
    });
  });

  it('createConteoEstadosStream — con lista vacía', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: [] });
      const conteo$ = createConteoEstadosStream(source$);

      const expected: ConteoEstados = {
        disponible: 0, reservada: 0, ocupada: 0,
        en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
      };

      expectObservable(conteo$).toBe('(a|)', { a: expected });
    });
  });

  it('createConteoEstadosStream — emite cada vez que cambia el array', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', {
        a: [habA],
        b: [habA, habB],
      });
      const conteo$ = createConteoEstadosStream(source$);

      expectObservable(conteo$).toBe('(ab|)', {
        a: { disponible: 1, reservada: 0, ocupada: 0, en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0 },
        b: { disponible: 1, reservada: 0, ocupada: 1, en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0 },
      });
    });
  });

  it('createConteoEstadosStream — no emite si el conteo no cambia (distinctUntilChanged)', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: [habA], b: [{ ...habA }] });
      const conteo$ = createConteoEstadosStream(source$);

      expectObservable(conteo$).toBe('(a-|)', {
        a: { disponible: 1, reservada: 0, ocupada: 0, en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0 },
      });
    });
  });
});

describe('[StepVerifier] habitacion.stream — filtros derivados', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('filtrarPorEstado — filtra correctamente por estado', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: habitaciones });
      const filtrado$ = filtrarHabsPorEstado(source$, 'disponible');

      expectObservable(filtrado$).toBe('(a|)', {
        a: [habA, habC] as readonly Habitacion[],
      });
    });
  });

  it('filtrarPorEstado — sin coincidencias emite array vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: habitaciones });
      const filtrado$ = filtrarHabsPorEstado(source$, 'en_mantenimiento');

      expectObservable(filtrado$).toBe('(a|)', {
        a: [] as readonly Habitacion[],
      });
    });
  });

  it('filtrarPorPiso — filtra por número de piso', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: habitaciones });
      const filtrado$ = filtrarPorPiso(source$, 2);

      expectObservable(filtrado$).toBe('(a|)', {
        a: [habC] as readonly Habitacion[],
      });
    });
  });

  it('filtrarPorPiso — piso sin habitaciones emite array vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: habitaciones });
      const filtrado$ = filtrarPorPiso(source$, 5);

      expectObservable(filtrado$).toBe('(a|)', {
        a: [] as readonly Habitacion[],
      });
    });
  });
});
