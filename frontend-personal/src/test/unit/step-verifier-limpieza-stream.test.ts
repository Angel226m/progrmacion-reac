import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { of, Observable } from 'rxjs';
import { TareaLimpieza, EstadoTarea } from '../../domain/types';
import {
  filtrarPorEstado as filtrarTareasPorEstado,
  contarPorEstado,
} from '../../streams/limpieza.stream';

const tareaA: TareaLimpieza = {
  id: 't1', habitacion_id: 'h1', empleado_id: 'e1',
  estado: 'pendiente', prioridad: 5, notas: null,
  iniciada_at: null, completada_at: null, inserted_at: '',
};

const tareaB: TareaLimpieza = {
  id: 't2', habitacion_id: 'h2', empleado_id: null,
  estado: 'en_proceso', prioridad: 3, notas: null,
  iniciada_at: '2026-01-01', completada_at: null, inserted_at: '',
};

const tareaC: TareaLimpieza = {
  id: 't3', habitacion_id: 'h3', empleado_id: 'e2',
  estado: 'completada', prioridad: 1, notas: 'ok',
  iniciada_at: '2026-01-01', completada_at: '2026-01-02', inserted_at: '',
};

const tareaD: TareaLimpieza = {
  id: 't4', habitacion_id: 'h4', empleado_id: 'e1',
  estado: 'con_problema', prioridad: 4, notas: 'fuga agua',
  iniciada_at: '2026-01-01', completada_at: null, inserted_at: '',
};

const tareas = [tareaA, tareaB, tareaC, tareaD] as readonly TareaLimpieza[];

describe('[StepVerifier] limpieza.stream — funciones puras', () => {
  it('contarPorEstado — cuenta correctamente cada estado', () => {
    const conteo = contarPorEstado(tareas);
    expect(conteo.pendiente).toBe(1);
    expect(conteo.en_proceso).toBe(1);
    expect(conteo.completada).toBe(1);
    expect(conteo.con_problema).toBe(1);
  });

  it('contarPorEstado — lista vacía retorna todos en 0', () => {
    const conteo = contarPorEstado([]);
    expect(conteo.pendiente).toBe(0);
    expect(conteo.en_proceso).toBe(0);
    expect(conteo.completada).toBe(0);
    expect(conteo.con_problema).toBe(0);
  });

  it('contarPorEstado — múltiples en mismo estado', () => {
    const extras = [
      { ...tareaA, id: 't5' },
      { ...tareaA, id: 't6' },
    ] as readonly TareaLimpieza[];
    const conteo = contarPorEstado(extras);
    expect(conteo.pendiente).toBe(2);
  });
});

describe('[StepVerifier] limpieza.stream — stream de filtros (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('filtrarPorEstado — filuta por estado pendiente', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: tareas });
      const filtrado$ = filtrarTareasPorEstado(source$, 'pendiente');

      expectObservable(filtrado$).toBe('(a|)', {
        a: [tareaA] as readonly TareaLimpieza[],
      });
    });
  });

  it('filtrarPorEstado — con_problema filtra correctamente', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: tareas });
      const filtrado$ = filtrarTareasPorEstado(source$, 'con_problema');

      expectObservable(filtrado$).toBe('(a|)', {
        a: [tareaD] as readonly TareaLimpieza[],
      });
    });
  });

  it('filtrarPorEstado — sin coincidencias emite array vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: [] });
      const filtrado$ = filtrarTareasPorEstado(source$, 'pendiente');

      expectObservable(filtrado$).toBe('(a|)', {
        a: [] as readonly TareaLimpieza[],
      });
    });
  });
});
