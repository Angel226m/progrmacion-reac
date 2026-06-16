import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { Observable, of, Subject, firstValueFrom } from 'rxjs';
import { Habitacion, TareaLimpieza, MetricasDashboard } from '../../domain/types';
import {
  withAutoRetry,
  withSliding,
  onlyChanged,
  generarAlertas,
  calcularResumen,
  Alerta,
  ResumenOperacional,
} from '../../streams/combined.stream';

const habBase: Habitacion = {
  id: 'h1', numero: '101', tipo: 'doble', piso: 1, capacidad: 2,
  precio_noche: '120', estado: 'disponible', amenidades: [], clasificacion: null,
  caracteristicas: null, notas: null, inserted_at: '', updated_at: '',
};

const habMant: Habitacion = {
  ...habBase, id: 'h2', numero: '201', piso: 2, estado: 'en_mantenimiento',
};

const tareaPendiente: TareaLimpieza = {
  id: 't1', habitacion_id: 'h1', empleado_id: 'e1',
  estado: 'pendiente', prioridad: 5, notas: null,
  iniciada_at: null, completada_at: null, inserted_at: '',
};

const metricas: MetricasDashboard = {
  total_habitaciones: 50, disponibles: 10, ocupadas: 35,
  en_limpieza: 3, en_mantenimiento: 2, reservadas: 0,
  porcentaje_ocupacion: 70, ingresos_hoy: '35000',
  checkins_hoy: 8, checkouts_hoy: 5, promedio_limpieza_min: 25,
};

describe('[StepVerifier] combined.stream — funciones puras', () => {
  it('generarAlertas — genera alertas de mantenimiento', () => {
    const alertas = generarAlertas([habMant], [], metricas);
    expect(alertas.some((a) => a.origen === 'habitaciones')).toBe(true);
    expect(alertas.some((a) => a.nivel === 'warning')).toBe(true);
  });

  it('generarAlertas — genera alertas de tareas pendientes', () => {
    const alertas = generarAlertas([], [tareaPendiente], metricas);
    expect(alertas.some((a) => a.origen === 'limpieza')).toBe(true);
  });

  it('generarAlertas — genera alertas de ocupación crítica (>90%)', () => {
    const alertas = generarAlertas([], [],
      { ...metricas, porcentaje_ocupacion: 95 });
    expect(alertas.some((a) => a.origen === 'metricas' && a.nivel === 'critical')).toBe(true);
  });

  it('generarAlertas — sin condiciones no genera alertas', () => {
    const alertas = generarAlertas([habBase], [], metricas);
    expect(alertas.length).toBe(0);
  });

  it('calcularResumen — calcula ocupación real correctamente', () => {
    const resumen = calcularResumen(
      [habBase, { ...habBase, id: 'h2', estado: 'ocupada' }],
      [tareaPendiente],
      metricas,
    );
    expect(resumen.ocupacionReal).toBe(50);
    expect(resumen.tareasCriticas).toBe(1);
    expect(resumen.ingresosDia).toBe(35000);
    expect(resumen.eficienciaLimpieza).toBe(0);
  });

  it('calcularResumen — eficiencia 100% sin tareas', () => {
    const resumen = calcularResumen([habBase], [], metricas);
    expect(resumen.eficienciaLimpieza).toBe(100);
  });

  it('calcularResumen — maneja división por cero en habitaciones', () => {
    const resumen = calcularResumen([], [], metricas);
    expect(resumen.ocupacionReal).toBe(0);
  });
});

describe('[StepVerifier] combined.stream — HOF operadores (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('withSliding — mantiene ventana de N elementos', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abcd|)', { a: 1, b: 2, c: 3, d: 4 });
      const result$ = source$.pipe(withSliding<number>(3));

      expectObservable(result$).toBe('(abcd|)', {
        a: [1],
        b: [1, 2],
        c: [1, 2, 3],
        d: [2, 3, 4],
      });
    });
  });

  it('withSliding — ventana mayor que elementos contiene todos', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 10, b: 20 });
      const result$ = source$.pipe(withSliding<number>(10));

      expectObservable(result$).toBe('(ab|)', {
        a: [10],
        b: [10, 20],
      });
    });
  });

  it('onlyChanged — emite solo cuando el campo seleccionado cambia', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abc|)', {
        a: { id: 1, v: 10 },
        b: { id: 1, v: 10 },
        c: { id: 1, v: 20 },
      });
      const result$ = source$.pipe(onlyChanged((x: { id: number; v: number }) => x.v));

      expectObservable(result$).toBe('(a-c|)', {
        a: { id: 1, v: 10 },
        c: { id: 1, v: 20 },
      });
    });
  });
});

describe('[StepVerifier] combined.stream — withAutoRetry', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('withAutoRetry — stream exitoso no se ve afectado', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(a|)', { a: 42 });
      const result$ = source$.pipe(withAutoRetry<number>(3, 10));
      expectObservable(result$).toBe('(a|)', { a: 42 });
    });
  });

  it('withAutoRetry — stream sin error pasa directo', async () => {
    const source$ = of(42);
    const result$ = source$.pipe(withAutoRetry<number>(3, 10));
    const val = await firstValueFrom(result$);
    expect(val).toBe(42);
  });
});
