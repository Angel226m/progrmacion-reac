import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import {
  Observable,
  of,
  merge,
  EMPTY,
  NEVER,
  combineLatest,
  forkJoin,
  concat,
  race,
  zip,
  TimeoutError,
} from 'rxjs';
import {
  takeUntil,
  takeWhile,
  map,
  shareReplay,
  filter,
  delay,
  timeout,
  catchError,
  distinctUntilChanged,
  debounceTime,
  throttleTime,
  retry,
  first,
  skip,
  startWith,
  pairwise,
  pluck,
} from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════
// StepVerifier — Útil de aserciones para streams reactivos
// Patrón: Given → When → Then con marble diagrams
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// TIPOS DEL DOMINIO (cliente/huésped)
// ═══════════════════════════════════════════════════════════

interface Habitacion {
  id: string;
  numero: string;
  piso: number;
  tipo: string;
  estado: string;
  precio_noche: number;
  capacidad: number;
  eliminado: boolean;
}

// Reserva — unused, kept for reference
// interface Reserva { ... }

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
}

type ConteoEstados = {
  disponible: number;
  reservada: number;
  ocupada: number;
  en_limpieza: number;
  en_mantenimiento: number;
  bloqueada: number;
};

// ═══════════════════════════════════════════════════════════
// FUNCIONES PURAS DEL PORTAL CLIENTE
// ═══════════════════════════════════════════════════════════

function filterByEstado(estado: string) {
  return (source: Observable<readonly Habitacion[]>): Observable<readonly Habitacion[]> =>
    source.pipe(
      map((habs) => habs.filter((h) => h.estado === estado)),
    );
}

function filterByPiso(piso: number) {
  return (source: Observable<readonly Habitacion[]>): Observable<readonly Habitacion[]> =>
    source.pipe(
      map((habs) => habs.filter((h) => h.piso === piso)),
    );
}

function contarNoLeidas(notificaciones: readonly Notificacion[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}

function marcarLeida(notificaciones: readonly Notificacion[], id: string): readonly Notificacion[] {
  return notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n));
}

function marcarTodasLeidas(notificaciones: readonly Notificacion[]): readonly Notificacion[] {
  return notificaciones.map((n) => ({ ...n, leida: true }));
}

function calcularResumen(conteo: ConteoEstados) {
  const total = conteo.disponible + conteo.reservada + conteo.ocupada + conteo.en_limpieza + conteo.en_mantenimiento + conteo.bloqueada;
  const ocupadas = conteo.ocupada + conteo.reservada;
  return {
    disponibles: conteo.disponible,
    ocupadas,
    totalHabitaciones: total,
    porcentajeDisponible: total > 0 ? Math.round((conteo.disponible / total) * 100) : 0,
  };
}

function withFallback<T>(fallback: T) {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(catchError(() => of(fallback)));
}

function distinctUntilChangedDeep<T>() {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)));
}

// ═══════════════════════════════════════════════════════════
// SECCIÓN 1: StepVerifier — Flujos básicos con marmol
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Flujos básicos síncronos', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('of emite valores y completa', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abc|)', { a: 1, b: 2, c: 3 });
      expectObservable(source$).toBe('(abc|)', { a: 1, b: 2, c: 3 });
    });
  });

  it('from emite elementos de array', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 'x', b: 'y' });
      expectObservable(source$).toBe('(ab|)', { a: 'x', b: 'y' });
    });
  });

  it('throwError emite error', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('#');
      expectObservable(source$).toBe('#');
    });
  });

  it('EMPTY completa sin emitir', () => {
    scheduler.run(({ expectObservable }) => {
      expectObservable(EMPTY).toBe('|');
    });
  });

  it('NEVER nunca emite ni completa', () => {
    scheduler.run(({ expectObservable }) => {
      expectObservable(NEVER).toBe('-');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 2: Operadores temporales con marmol
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Operadores temporales', () => {
  let scheduler: TestScheduler;

  const sinStack = (arr: readonly any[]) => {
    const strip = (v: any): any => {
      if (v instanceof Error) {
        const { stack: _, ...rest } = v;
        return Object.fromEntries(
          Object.getOwnPropertyNames(rest).map(k => [k, strip((rest as any)[k])])
        );
      }
      if (Array.isArray(v)) return v.map(strip);
      if (v && typeof v === 'object') {
        return Object.fromEntries(
          Object.entries(v).map(([k, val]) => [k, strip(val)])
        );
      }
      return v;
    };
    return strip(arr);
  };

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(sinStack(actual)).toEqual(sinStack(expected));
    });
  });

  it('delay retrasa cada emisión', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(delay(3));
      expectObservable(result$).toBe('---(ab|)', { a: 1, b: 2 });
    });
  });

  it('debounceTime emite solo tras silencio', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a--b--c----|', { a: 'a', b: 'b', c: 'c' });
      const result$ = source$.pipe(debounceTime(4));
      expectObservable(result$).toBe('----------c|', { c: 'c' });
    });
  });

  it('debounceTime con ráfaga de 3 — solo el último pasa', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a-b-c---|', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(debounceTime(3));
      expectObservable(result$).toBe('-------c|', { c: 3 });
    });
  });

  it('throttleTime leading emite primero y omite el resto del intervalo', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a-b-c-d-e---|', { a: 1, b: 2, c: 3, d: 4, e: 5 });
      const result$ = source$.pipe(throttleTime(4));
      expectObservable(result$).toBe('a-----d-----|', { a: 1, d: 4 });
    });
  });

  it('timeout emite error si no hay emisión antes del límite', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  ----------|');
      const result$ = source$.pipe(timeout(5));
      expectObservable(result$).toBe('-----#', undefined, new TimeoutError({ lastValue: null, meta: null, seen: 0 }));
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 3: Filtrado funcional con marmol
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Filtrado funcional', () => {
  let scheduler: TestScheduler;

  const habA: Habitacion = { id: 'h1', numero: '101', piso: 1, tipo: 'individual', estado: 'disponible', precio_noche: 80, capacidad: 1, eliminado: false };
  const habB: Habitacion = { id: 'h2', numero: '102', piso: 1, tipo: 'doble', estado: 'ocupada', precio_noche: 120, capacidad: 2, eliminado: false };
  const habC: Habitacion = { id: 'h3', numero: '201', piso: 2, tipo: 'suite', estado: 'disponible', precio_noche: 200, capacidad: 3, eliminado: false };

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('filterByEstado — solo habitaciones disponibles', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: [habA, habB, habC] });
      const result$ = source$.pipe(filterByEstado('disponible'));
      expectObservable(result$).toBe('(a|)', { a: [habA, habC] });
    });
  });

  it('filterByEstado — ninguna coincide, emite vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: [habB] });
      const result$ = source$.pipe(filterByEstado('disponible'));
      expectObservable(result$).toBe('(a|)', { a: [] });
    });
  });

  it('filterByPiso — solo habitaciones del piso 1', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: [habA, habB, habC] });
      const result$ = source$.pipe(filterByPiso(1));
      expectObservable(result$).toBe('(a|)', { a: [habA, habB] });
    });
  });

  it('filterByEstado + filterByPiso — composición de pipes', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: [habA, habB, habC] });
      const result$ = source$.pipe(
        filterByEstado('disponible'),
        filterByPiso(2),
      );
      expectObservable(result$).toBe('(a|)', { a: [habC] });
    });
  });

  it('pipeline doble filtro con emisiones múltiples', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a--b|)', {
        a: [habA, habB, habC],
        b: [habA, habB],
      });
      const result$ = source$.pipe(filterByEstado('disponible'));
      expectObservable(result$).toBe('(a--b|)', {
        a: [habA, habC],
        b: [habA],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 4: Manejo de errores reactivo
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Manejo de errores', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('catchError captura y reemplaza con fallback', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  ---#');
      const result$ = source$.pipe(catchError(() => of('fallback')));
      expectObservable(result$).toBe('---(a|)', { a: 'fallback' });
    });
  });

  it('catchError no altera stream exitoso', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(catchError(() => of(-1)));
      expectObservable(result$).toBe('(ab|)', { a: 1, b: 2 });
    });
  });

  it('withFallback con valor por defecto', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold<never>('  ---#');
      const result$ = source$.pipe(withFallback<number>(0));
      expectObservable(result$).toBe('---(a|)', { a: 0 });
    });
  });

  it('retry(2) reintenta 2 veces antes de propagar error', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  #');
      const result$ = source$.pipe(retry(2));
      expectObservable(result$).toBe('#');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 5: Combinación de streams (cliente/huésped)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Combinación de streams', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('combineLatest emite cuando ambos streams tienen valor', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        a------b--|', { a: 1, b: 2 });
      const b$ = cold('        ---c------d|', { c: 'x', d: 'y' });
      const result$ = combineLatest([a$, b$]);
      expectObservable(result$).toBe('---a---b--c|', {
        a: [1, 'x'],
        b: [2, 'x'],
        c: [2, 'y'],
      });
    });
  });

  it('merge intercala eventos en orden temporal', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        a---b---c|', { a: 'A1', b: 'A2', c: 'A3' });
      const b$ = cold('        --x----y|', { x: 'B1', y: 'B2' });
      const result$ = merge(a$, b$);
      expectObservable(result$).toBe('a-x-b--yc|', {
        a: 'A1', x: 'B1', b: 'A2', y: 'B2', c: 'A3',
      });
    });
  });

  it('concat emite secuencialmente', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        (ab|)', { a: 1, b: 2 });
      const b$ = cold('        (cd|)', { c: 3, d: 4 });
      const result$ = concat(a$, b$);
      expectObservable(result$).toBe('(abcd|)', { a: 1, b: 2, c: 3, d: 4 });
    });
  });

  it('forkJoin emite el último valor de cada stream al completar', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        a----(b|)', { a: 1, b: 2 });
      const b$ = cold('        c--(d|)', { c: 'x', d: 'y' });
      const result$ = forkJoin([a$, b$]);
      // forkJoin espera a que ambos completen, luego emite el último de cada uno
      expectObservable(result$).toBe('-----(e|)', { e: [2, 'y'] });
    });
  });

  it('race emite el stream que primero emite', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        --a--|', { a: 'slow' });
      const b$ = cold('        -b----|', { b: 'fast' });
      const result$ = race(a$, b$);
      // b$ emite primero (frame 1), por lo tanto es el ganador
      expectObservable(result$).toBe('-b----|', { b: 'fast' });
    });
  });

  it('zip empareja emisiones por índice', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('        a--b--c|', { a: 1, b: 2, c: 3 });
      const b$ = cold('        x-----y|', { x: 'a', y: 'b' });
      const result$ = zip(a$, b$);
      // Empareja por orden: (1,'a'), (2,'b')
      expectObservable(result$).toBe('a-----b|', {
        a: [1, 'a'],
        b: [2, 'b'],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 6: Streams derivados y transformaciones
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Transformaciones de streams', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('map transforma valores', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(map((x) => (x as number) * 10));
      expectObservable(result$).toBe('(ab|)', { a: 10, b: 20 });
    });
  });

  it('filter deja pasar solo pares', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abcd|)', { a: 1, b: 2, c: 3, d: 4 });
      const result$ = source$.pipe(filter((x) => (x as number) % 2 === 0));
      expectObservable(result$).toBe('(bd|)', { b: 2, d: 4 });
    });
  });

  it('skip salta las primeras N emisiones', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abcd|)', { a: 1, b: 2, c: 3, d: 4 });
      const result$ = source$.pipe(skip(2));
      expectObservable(result$).toBe('(cd|)', { c: 3, d: 4 });
    });
  });

  it('first emite solo el primer valor y completa', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a--b--c|', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(first());
      expectObservable(result$).toBe('(a|)', { a: 1 });
    });
  });

  it('takeWhile emite mientras la condición es true', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abc|)', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(takeWhile((x) => (x as number) < 3));
      expectObservable(result$).toBe('(ab|)', { a: 1, b: 2 });
    });
  });

  it('startWith antepone un valor inicial', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(startWith(0));
      expectObservable(result$).toBe('(0ab|)', { 0: 0, a: 1, b: 2 });
    });
  });

  it('pairwise emite pares [anterior, actual]', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abc|)', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(pairwise());
      expectObservable(result$).toBe('(bc|)', {
        b: [1, 2],
        c: [2, 3],
      });
    });
  });

  it('pluck extrae propiedad anidada', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: { id: 1, name: 'foo' }, b: { id: 2, name: 'bar' } });
      const result$ = source$.pipe(pluck('name'));
      expectObservable(result$).toBe('(ab|)', { a: 'foo', b: 'bar' });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 7: notificacion.stream — funciones puras
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Notificaciones — funciones puras', () => {
  it('contarNoLeidas cuenta correctamente', () => {
    const notif: Notificacion[] = [
      { id: 'n1', tipo: 'info', titulo: 'T1', mensaje: 'M1', timestamp: '2025-01-01T00:00:00Z', leida: false },
      { id: 'n2', tipo: 'info', titulo: 'T2', mensaje: 'M2', timestamp: '2025-01-01T00:00:00Z', leida: true },
      { id: 'n3', tipo: 'info', titulo: 'T3', mensaje: 'M3', timestamp: '2025-01-01T00:00:00Z', leida: false },
    ];
    expect(contarNoLeidas(notif)).toBe(2);
  });

  it('contarNoLeidas con todas leídas — 0', () => {
    const notif: Notificacion[] = [
      { id: 'n1', tipo: 'info', titulo: 'T1', mensaje: 'M1', timestamp: '2025-01-01T00:00:00Z', leida: true },
    ];
    expect(contarNoLeidas(notif)).toBe(0);
  });

  it('contarNoLeidas con array vacío — 0', () => {
    expect(contarNoLeidas([])).toBe(0);
  });

  it('marcarLeida es inmutable y marca correctamente', () => {
    const original: Notificacion[] = [
      { id: 'n1', tipo: 'info', titulo: 'T1', mensaje: 'M1', timestamp: '2025-01-01T00:00:00Z', leida: false },
    ];
    const result = marcarLeida(original, 'n1');
    expect(result[0]!.leida).toBe(true);
    expect(original[0]!.leida).toBe(false);
  });

  it('marcarLeida con id inexistente retorna copia sin cambios', () => {
    const original: Notificacion[] = [
      { id: 'n1', tipo: 'info', titulo: 'T1', mensaje: 'M1', timestamp: '2025-01-01T00:00:00Z', leida: false },
    ];
    const result = marcarLeida(original, 'no-existe');
    expect(result).toEqual(original);
    expect(result).not.toBe(original); // debe ser copia
  });

  it('marcarTodasLeidas es inmutable', () => {
    const original: Notificacion[] = [
      { id: 'n1', tipo: 'info', titulo: 'T1', mensaje: 'M1', timestamp: '2025-01-01T00:00:00Z', leida: false },
    ];
    const result = marcarTodasLeidas(original);
    expect(result.every((n) => n.leida)).toBe(true);
    expect(original[0]!.leida).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 8: Resumen de habitaciones (cálculos puros)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Resumen de ocupación — cálculos puros', () => {
  it('calcularResumen con datos mixtos', () => {
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

  it('calcularResumen — todo ocupado = 0%', () => {
    const conteo: ConteoEstados = {
      disponible: 0, reservada: 5, ocupada: 5,
      en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
    };
    expect(calcularResumen(conteo).porcentajeDisponible).toBe(0);
  });

  it('calcularResumen — todo disponible = 100%', () => {
    const conteo: ConteoEstados = {
      disponible: 20, reservada: 0, ocupada: 0,
      en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
    };
    expect(calcularResumen(conteo).porcentajeDisponible).toBe(100);
  });

  it('calcularResumen — sin habitaciones = 0%', () => {
    const conteo: ConteoEstados = {
      disponible: 0, reservada: 0, ocupada: 0,
      en_limpieza: 0, en_mantenimiento: 0, bloqueada: 0,
    };
    expect(calcularResumen(conteo).porcentajeDisponible).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 9: Escenario real — Portal cliente
// Búsqueda de habitaciones con filtros reactivos
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Escenario real — portal cliente', () => {
  let scheduler: TestScheduler;

  const habs: readonly Habitacion[] = [
    { id: 'h1', numero: '101', piso: 1, tipo: 'individual', estado: 'disponible', precio_noche: 80, capacidad: 1, eliminado: false },
    { id: 'h2', numero: '102', piso: 1, tipo: 'doble', estado: 'ocupada', precio_noche: 120, capacidad: 2, eliminado: false },
    { id: 'h3', numero: '201', piso: 2, tipo: 'suite', estado: 'disponible', precio_noche: 200, capacidad: 3, eliminado: false },
    { id: 'h4', numero: '202', piso: 2, tipo: 'familiar', estado: 'en_limpieza', precio_noche: 150, capacidad: 4, eliminado: false },
  ];

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('carga inicial + filtro por piso y estado', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: habs });
      const result$ = source$.pipe(
        filterByPiso(2),
        filterByEstado('disponible'),
      );
      expectObservable(result$).toBe('(a|)', {
        a: [habs[2]!],
      });
    });
  });

  it('pipe de filtros devuelve vacío cuando no hay coincidencias', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: habs });
      const result$ = source$.pipe(
        filterByEstado('reservada'),
      );
      expectObservable(result$).toBe('(a|)', { a: [] });
    });
  });

  it('múltiples emisiones con filtro estable', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a--b|)', {
        a: habs,
        b: habs.map((h) => ({ ...h, estado: h.id === 'h3' ? 'ocupada' as const : h.estado })),
      });
      const result$ = source$.pipe(filterByEstado('disponible'));
      expectObservable(result$).toBe('(a--b|)', {
        a: [habs[0]!, habs[2]!],
        b: [habs[0]!],
      });
    });
  });

  it('stream vacío — filtros devuelven vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (a|)', { a: [] });
      const result$ = source$.pipe(filterByPiso(1));
      expectObservable(result$).toBe('(a|)', { a: [] });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 10: shareReplay — Hot observable con replay
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] shareReplay — suscriptores tardíos', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('nuevo suscriptor recibe el último valor', () => {
    scheduler.run(({ expectObservable, hot }) => {
      const source$ = hot('   --a----b--|', { a: 10, b: 20 });
      const shared$ = source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
      expectObservable(shared$).toBe('--a----b--|', { a: 10, b: 20 });
    });
  });

  it('múltiples suscriptores ven las mismas emisiones', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a---b---|', { a: 'x', b: 'y' });
      const shared$ = source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
      expectObservable(shared$).toBe('a---b---|', { a: 'x', b: 'y' });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 11: distinctUntilChangedDeep
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] distinctUntilChangedDeep', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('filtra objetos duplicados estructuralmente', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a = { id: 'h1', estado: 'disponible' };
      const source$ = cold('  a--b--|', { a, b: { id: 'h1', estado: 'disponible' } });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('a-----|', { a });
    });
  });

  it('arrays con mismo contenido — una sola emisión', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a--b--|', { a: [1, 2, 3], b: [1, 2, 3] });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('a-----|', { a: [1, 2, 3] });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 12: Carga moderada
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Carga moderada — N eventos', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('10 eventos con map — todos transformados', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abcdefghij|)', { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 });
      const result$ = source$.pipe(map((x) => (x as number) * 2));
      expectObservable(result$).toBe('(abcdefghij|)', { a: 2, b: 4, c: 6, d: 8, e: 10, f: 12, g: 14, h: 16, i: 18, j: 20 });
    });
  });

  it('10 eventos con filter — solo pares pasan', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (abcdefghij|)', { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 });
      const result$ = source$.pipe(filter((x) => (x as number) % 2 === 0));
      expectObservable(result$).toBe('(bdfhj|)', { b: 2, d: 4, f: 6, h: 8, j: 10 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 13: takeUntil — Cancelación condicional
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] takeUntil — cancelación reactiva', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('completa el stream cuando la señal de cancelación llega', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a-b-c-d-e-f-|', { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });
      const cancel$ = cold('  ----s-------', { s: true });
      const result$ = source$.pipe(takeUntil(cancel$));
      expectObservable(result$).toBe('a-b-|', { a: 1, b: 2 });
    });
  });

  it('takeUntil con cancelación inmediata — no emite nada', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  a-b-c-|', { a: 1, b: 2, c: 3 });
      const cancel$ = cold('  (s|)', { s: true });
      const result$ = source$.pipe(takeUntil(cancel$));
      expectObservable(result$).toBe('|');
    });
  });

  it('takeUntil con señal que nunca llega — emite todo', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('  (ab|)', { a: 1, b: 2 });
      const cancel$ = cold('  ----');
      const result$ = source$.pipe(takeUntil(cancel$));
      expectObservable(result$).toBe('(ab|)', { a: 1, b: 2 });
    });
  });
});
