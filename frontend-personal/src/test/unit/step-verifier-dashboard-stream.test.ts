import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { Observable, of, pipe } from 'rxjs';
import { map, scan, startWith } from 'rxjs/operators';
import { MetricasDashboard, EventoDominio } from '../../domain/types';
import { calcularKPIs, KPIs, MetricasHistorial } from '../../streams/dashboard.stream';

const metricasBase: MetricasDashboard = {
  total_habitaciones: 50,
  disponibles: 10,
  ocupadas: 35,
  en_limpieza: 3,
  en_mantenimiento: 2,
  reservadas: 0,
  porcentaje_ocupacion: 70,
  ingresos_hoy: '35000',
  checkins_hoy: 8,
  checkouts_hoy: 5,
  promedio_limpieza_min: 25,
};

describe('[StepVerifier] dashboard.stream — calcularKPIs', () => {
  it('calcula KPIs correctamente con datos normales', () => {
    const kpi = calcularKPIs(metricasBase);
    expect(kpi.revpar).toBe(35000 / 50);
    expect(kpi.adr).toBe(35000 / 35);
    expect(kpi.tasaOcupacion).toBe(70);
    expect(kpi.habitacionesLibres).toBe(10);
  });

  it('adr = 0 cuando no hay ocupadas', () => {
    const metricas: MetricasDashboard = { ...metricasBase, ocupadas: 0, ingresos_hoy: '0' };
    const kpi = calcularKPIs(metricas);
    expect(kpi.adr).toBe(0);
    expect(kpi.revpar).toBe(0);
  });

  it('maneja total_habitaciones = 0 sin división por cero', () => {
    const metricas: MetricasDashboard = { ...metricasBase, total_habitaciones: 0 };
    const kpi = calcularKPIs(metricas);
    expect(kpi.revpar).toBe(35000 / 1);
  });

  it('maneja ingresos_hoy vacío', () => {
    const metricas: MetricasDashboard = { ...metricasBase, ingresos_hoy: '' };
    const kpi = calcularKPIs(metricas);
    expect(kpi.revpar).toBe(0);
    expect(kpi.adr).toBe(0);
  });
});

describe('[StepVerifier] dashboard.stream — createHistorialStream (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('acumula puntos en el historial vía scan', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const metricas$ = cold('(ab|)', {
        a: metricasBase,
        b: { ...metricasBase, porcentaje_ocupacion: 75, ingresos_hoy: '40000' },
      });

      type Punto = { ocupacion: number; disponibles: number; ingresos: number };
      const historial$ = metricas$.pipe(
        scan((historial: readonly Punto[], m: MetricasDashboard) => {
          const punto: Punto = { ocupacion: m.porcentaje_ocupacion, disponibles: m.disponibles, ingresos: parseFloat(m.ingresos_hoy || '0') };
          return [...historial, punto];
        }, [] as readonly Punto[]),
        startWith([] as readonly Punto[]),
      );

      expectObservable(historial$).toBe('(abc|)', {
        a: [],
        b: [{ ocupacion: 70, disponibles: 10, ingresos: 35000 }],
        c: [{ ocupacion: 70, disponibles: 10, ingresos: 35000 }, { ocupacion: 75, disponibles: 10, ingresos: 40000 }],
      });
    });
  });

  it('ventana deslizante de 60 puntos — descarta los más viejos', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const items = Array.from({ length: 65 }, (_, i) => ({
        ...metricasBase,
        porcentaje_ocupacion: i,
        ingresos_hoy: String(i * 100),
      }));
      const metricas$ = cold('(a|)', { a: items[items.length - 1]! });

      type Punto = { ocupacion: number };
      const historial$ = metricas$.pipe(
        scan((historial: readonly Punto[], m: MetricasDashboard) => {
          const punto: Punto = { ocupacion: m.porcentaje_ocupacion };
          const nuevo = [...historial, punto];
          return nuevo.length > 60 ? nuevo.slice(-60) : nuevo;
        }, [] as readonly Punto[]),
        startWith([] as readonly Punto[]),
        map((h) => h.length),
      );

      expectObservable(historial$).toBe('(ab|)', { a: 0, b: 1 });
    });
  });
});

describe('[StepVerifier] dashboard.stream — createEventosStream (marble)', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('acumula eventos con startWith([]) y scan', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const eventos$ = cold('--a--b|', {
        a: { tipo: 'checkin', datos: { hab: '101' }, timestamp: '', origen: '' },
        b: { tipo: 'checkout', datos: { hab: '102' }, timestamp: '', origen: '' },
      });

      const result$ = eventos$.pipe(
        scan((eventos: readonly EventoDominio[], evento: EventoDominio) => {
          const nuevos = [evento, ...eventos];
          return nuevos.length > 100 ? nuevos.slice(0, 100) : nuevos;
        }, [] as readonly EventoDominio[]),
        startWith([] as readonly EventoDominio[]),
      );

      expectObservable(result$).toBe('s-a--b|', {
        s: [],
        a: [{ tipo: 'checkin', datos: { hab: '101' }, timestamp: '', origen: '' }],
        b: [
          { tipo: 'checkout', datos: { hab: '102' }, timestamp: '', origen: '' },
          { tipo: 'checkin', datos: { hab: '101' }, timestamp: '', origen: '' },
        ],
      });
    });
  });
});
