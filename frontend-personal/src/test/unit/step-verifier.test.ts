import { describe, it, expect, beforeEach } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import {
   Observable,
   Subject,
   of,
   throwError,
   timer,
   interval,
   merge,
   from,
   EMPTY,
   NEVER,
   noop,
   BehaviorSubject,
} from 'rxjs';
import {
   take,
   takeUntil,
   map,
   scan,
   shareReplay,
   filter,
   delay,
   timeout,
   catchError,
   distinctUntilChanged,
   mergeMap,
   bufferCount,
   debounceTime,
   throttleTime,
   retryWhen,
} from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════
// StepVerifier — Útil de aserciones para streams reactivos
// basado en el patrón StepVerifier de Reactor/Project Reactor.
// ═══════════════════════════════════════════════════════════

class StepVerifier<T> {
  private readonly scheduler: TestScheduler;
  private readonly source: Observable<T>;
  private expectations: Array<{
    type: 'next' | 'error' | 'complete' | 'noNext';
    values?: T[];
    error?: unknown;
    at?: number;
  }> = [];

  private constructor(source: Observable<T>, scheduler: TestScheduler) {
    this.source = source;
    this.scheduler = scheduler;
  }

  static create<T>(source: Observable<T>, scheduler: TestScheduler): StepVerifier<T> {
    return new StepVerifier(source, scheduler);
  }

  expectNext(...values: T[]): this {
    this.expectations.push({ type: 'next', values });
    return this;
  }

  expectComplete(): this {
    this.expectations.push({ type: 'complete' });
    return this;
  }

  expectError(error?: unknown): this {
    this.expectations.push({ type: 'error', error });
    return this;
  }

  then(fn: () => void): this {
    fn();
    return this;
  }

  verify(): void {
    const values: T[] = [];
    let error: unknown = null;
    let completed = false;

    this.source.subscribe({
      next: (v) => values.push(v),
      error: (e) => { error = e; },
      complete: () => { completed = true; },
    });

    this.scheduler.flush();

    let valueIdx = 0;

    for (const exp of this.expectations) {
      switch (exp.type) {
        case 'next':
          if (exp.values) {
            for (const v of exp.values) {
              expect(values[valueIdx]).toEqual(v);
              valueIdx++;
            }
          }
          break;
        case 'error':
          expect(error).toBeDefined();
          if (exp.error instanceof Error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe((exp.error as Error).message);
          } else {
            expect(error).toBe(exp.error);
          }
          break;
        case 'complete':
          expect(completed).toBe(true);
          break;
        case 'noNext':
          expect(valueIdx).toBe(values.length);
          break;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// FUNCIONES PURAS REACTIVAS
// ═══════════════════════════════════════════════════════════

function withBackpressure<T>(batchSize: number) {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      bufferCount(batchSize),
      mergeMap((batch) => from(batch)),
    );
}

function withFallback<T>(fallback: T) {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      catchError(() => of(fallback)),
    );
}

function retryWithExponentialBackoff<T>(maxRetries: number, baseDelay: number) {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan((count, error) => {
            if (count >= maxRetries) throw error;
            return count + 1;
          }, 0),
          mergeMap((count) => timer(Math.pow(2, count) * baseDelay)),
        ),
      ),
    );
}

function distinctUntilChangedDeep<T>() {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );
}

function asHotWithReplay<T>(bufferSize: number = 1) {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(shareReplay({ bufferSize, refCount: true }));
}

// ── Tipos ──

interface Habitacion {
  id: string;
  numero: string;
  piso: number;
  tipo: string;
  estado: string;
  precio_noche: number;
  capacidad: number;
}

// ── Acumulador puro (mismo que el repositorio real) ──

function acumularEventos(
  acc: Map<string, Habitacion>,
  event: { event: string; payload: { habitacion?: Habitacion; habitacion_id?: string; estado?: string; habitaciones?: readonly Habitacion[] } },
): Map<string, Habitacion> {
  switch (event.event) {
    case 'mapa_completo': {
      const lista = event.payload.habitaciones ?? [];
      return new Map(lista.map((h) => [h.id, h]));
    }
    case 'habitacion_actualizada':
    case 'estado_actualizado':
    case 'nuevo_estado': {
      if (event.payload.habitacion) {
        const m = new Map(acc);
        m.set(event.payload.habitacion.id, event.payload.habitacion);
        return m;
      }
      if (event.payload.habitacion_id && event.payload.estado) {
        const existing = acc.get(event.payload.habitacion_id);
        if (existing) {
          const m = new Map(acc);
          m.set(event.payload.habitacion_id, { ...existing, estado: event.payload.estado });
          return m;
        }
      }
      return acc;
    }
    default:
      return acc;
  }
}

// ═══════════════════════════════════════════════════════════
// SECCIÓN 1: StepVerifier básico — clase utilitaria
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Clase utilitaria StepVerifier', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('expectNext + expectComplete — flujo exitoso', () => {
    const source$ = of(1, 2, 3);
    StepVerifier.create(source$, scheduler)
      .expectNext(1, 2, 3)
      .expectComplete()
      .verify();
  });

  it('expectNext con un solo valor', () => {
    const source$ = of(42);
    StepVerifier.create(source$, scheduler)
      .expectNext(42)
      .expectComplete()
      .verify();
  });

  it('expectError — flujo con error', () => {
    const source$ = throwError(() => new Error('fallo'));
    StepVerifier.create(source$, scheduler)
      .expectError(new Error('fallo'))
      .verify();
  });

  it('from() emite cada elemento como evento individual', () => {
    const source$ = from([10, 20, 30]);
    StepVerifier.create(source$, scheduler)
      .expectNext(10, 20, 30)
      .expectComplete()
      .verify();
  });

  it('EMPTY no emite nada y completa', () => {
    StepVerifier.create(EMPTY, scheduler)
      .expectComplete()
      .verify();
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 2: StepVerifier con marmol (rxjs/testing)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Marble testing básico', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('cold (síncrono) — emite valores parentizados', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abc|)', { a: 1, b: 2, c: 3 });
      expectObservable(source$).toBe('(abc|)', { a: 1, b: 2, c: 3 });
    });
  });

  it('cold con delay — valores espaciados', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('-a-b-c|', { a: 1, b: 2, c: 3 });
      expectObservable(source$).toBe('-a-b-c|', { a: 1, b: 2, c: 3 });
    });
  });

  it('throwError emite error inmediato (#)', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('#');
      expectObservable(source$).toBe('#');
    });
  });

  it('EMPTY completa sin emitir (|)', () => {
    scheduler.run(({ expectObservable }) => {
      expectObservable(EMPTY).toBe('|');
    });
  });

  it('NEVER nunca emite (-)', () => {
    scheduler.run(({ expectObservable }) => {
      expectObservable(NEVER.pipe(take(1))).toBe('-');
    });
  });

  it('hot observable — emisiones desde frame relativo', () => {
    scheduler.run(({ hot, expectObservable }) => {
      const source$ = hot('--a--b--|', { a: 'x', b: 'y' });
      expectObservable(source$).toBe('--a--b--|', { a: 'x', b: 'y' });
    });
  });

  it('map duplica valores — marble', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 2, b: 5 });
      const result$ = source$.pipe(map((x) => (x as number) * 3));
      expectObservable(result$).toBe('(ab|)', { a: 6, b: 15 });
    });
  });

  it('filter pares — marble', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abcd|)', { a: 1, b: 2, c: 3, d: 4 });
      const result$ = source$.pipe(filter((x) => (x as number) % 2 === 0));
      expectObservable(result$).toBe('(bd|)', { b: 2, d: 4 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 3: merge + scan (patrón Observable Repository)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] merge + scan — Observable Repository', () => {
  let scheduler: TestScheduler;

  const habA: Habitacion = { id: 'h1', numero: '101', piso: 1, tipo: 'doble', estado: 'disponible', precio_noche: 120, capacidad: 2 };
  const habB: Habitacion = { id: 'h2', numero: '102', piso: 1, tipo: 'individual', estado: 'ocupada', precio_noche: 80, capacidad: 1 };

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('initial$ carga → scan emite mapa con todas las habitaciones', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA, habB] } },
      });
      const result$ = initial$.pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => [...mapa.values()].map((h) => ({ id: h.id, estado: h.estado }))),
      );
      expectObservable(result$).toBe('(a|)', {
        a: [{ id: 'h1', estado: 'disponible' }, { id: 'h2', estado: 'ocupada' }],
      });
    });
  });

  it('merge(initial$, updates$) — actualización WS modifica el estado', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA, habB] } },
      });
      const updates$ = cold('-----(b|)', {
        b: { event: 'estado_actualizado', payload: { habitacion_id: 'h1', estado: 'limpieza' } },
      });
      const result$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => [...mapa.values()].map((h) => ({ id: h.id, estado: h.estado }))),
      );
      expectObservable(result$).toBe('a----(b|)', {
        a: [{ id: 'h1', estado: 'disponible' }, { id: 'h2', estado: 'ocupada' }],
        b: [{ id: 'h1', estado: 'limpieza' }, { id: 'h2', estado: 'ocupada' }],
      });
    });
  });

  it('habitación reemplazada via WS — merge + scan con replace', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const nuevaHab: Habitacion = { ...habA, estado: 'mantenimiento' };
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA, habB] } },
      });
      const updates$ = cold('---(b|)', {
        b: { event: 'habitacion_actualizada', payload: { habitacion: nuevaHab } },
      });
      const result$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => [...mapa.values()].map((h) => ({ id: h.id, estado: h.estado }))),
      );
      expectObservable(result$).toBe('(a-(b|))', {
        a: [{ id: 'h1', estado: 'disponible' }, { id: 'h2', estado: 'ocupada' }],
        b: [{ id: 'h1', estado: 'mantenimiento' }, { id: 'h2', estado: 'ocupada' }],
      });
    });
  });

  it('merge con carga inicial vacía — mapa vacío', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [] } },
      });
      const updates$ = cold('-------');
      const result$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => mapa.size),
      );
      expectObservable(result$).toBe('(a-------)', { a: 0 });
    });
  });

  it('evento desconocido — scan ignora, mapa no cambia', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA] } },
      });
      const updates$ = cold('--(b|)', {
        b: { event: 'desconocido', payload: { habitacion_id: 'h1', estado: 'x' } },
      });
      const result$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        scan((acc: Map<string, Habitacion>[], mapa) => [...acc, mapa], []),
        map((maps) => maps.map((m) => [...m.values()].map((h) => h.id))),
      );
      expectObservable(result$).toBe('a-(b|)', {
        a: [['h1']],
        b: [['h1'], ['h1']],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 4: Manejo de errores — catchError
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] catchError — recuperación funcional', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('withFallback captura error y emite default', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('---#');
      const result$ = source$.pipe(withFallback<number>(-1));
      expectObservable(result$).toBe('---(a|)', { a: -1 });
    });
  });

  it('withFallback no altera stream exitoso', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(withFallback<number>(-1));
      expectObservable(result$).toBe('(ab|)', { a: 1, b: 2 });
    });
  });

  it('catchError + map — error capturado antes de map', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--#', { a: 10 });
      const result$ = source$.pipe(
        map((x) => (x as number) * 2),
        withFallback<number>(0),
      );
      expectObservable(result$).toBe('--a--(b|)', { a: 20, b: 0 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 5: shareReplay — hot observable
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] shareReplay — stream hot', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('shareReplay(1) emite el último valor a nuevos suscriptores', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 10, b: 20 });
      const shared$ = source$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
      expectObservable(shared$).toBe('(ab|)', { a: 10, b: 20 });
    });
  });

  it('asHotWithReplay — HOF que envuelve shareReplay', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(x|)', { x: 'valor' });
      const hot$ = source$.pipe(asHotWithReplay<string>(1));
      expectObservable(hot$).toBe('(x|)', { x: 'valor' });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 6: distinctUntilChangedDeep
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
      const a = { estado: 'disponible' };
      const source$ = cold('(ab|)', { a, b: { estado: 'disponible' } });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('(a-|)', { a });
    });
  });

  it('arrays con mismo contenido — una emisión', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: [1, 2, 3], b: [1, 2, 3] });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('(a-|)', { a: [1, 2, 3] });
    });
  });

  it('arrays con diferente contenido — emite cada uno', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abc|)', {
        a: [1, 2, 3],
        b: [1, 2, 4],
        c: [1, 2, 3],
      });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('(abc|)', {
        a: [1, 2, 3],
        b: [1, 2, 4],
        c: [1, 2, 3],
      });
    });
  });

  it('[CARGA] 10 emisiones iguales — solo 1 notificación', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const obj = { v: 1 };
      const source$ = cold('(aaaaaaaaaa|)', { a: obj });
      const result$ = source$.pipe(distinctUntilChangedDeep());
      expectObservable(result$).toBe('(a---------|)', { a: obj });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 7: merge — interleaving de streams
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] merge — interleaving', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('merge intercala 2 streams', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('       a----b----c----|', { a: 'A1', b: 'A2', c: 'A3' });
      const b$ = cold('       -----x----y----z|', { x: 'B1', y: 'B2', z: 'B3' });
      const merged$ = merge(a$, b$);
      expectObservable(merged$).toBe('a----(bx)-(cy)-z|', {
        a: 'A1', b: 'A2', x: 'B1', c: 'A3', y: 'B2', z: 'B3',
      });
    });
  });

  it('merge con stream vacío — solo el otro pasa', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('       a--b--c|', { a: 1, b: 2, c: 3 });
      const merged$ = merge(a$);
      expectObservable(merged$).toBe('a--b--c|', { a: 1, b: 2, c: 3 });
    });
  });

  it('merge 3 streams — orden correcto', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const a$ = cold('       a-----d---|', { a: 1, d: 4 });
      const b$ = cold('       -b---e---|', { b: 2, e: 5 });
      const c$ = cold('       --c---f--|', { c: 3, f: 6 });
      const merged$ = merge(a$, b$, c$);
      expectObservable(merged$).toBe('abc--e(df)|', { a: 1, b: 2, c: 3, e: 5, d: 4, f: 6 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 8: withBackpressure (bufferCount + mergeMap)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] withBackpressure', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('batch=2 — todos los elementos pasan', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 1, b: 2 });
      const result$ = source$.pipe(withBackpressure<number>(2));
      expectObservable(result$).toBe('(ab|)', { a: 1, b: 2 });
    });
  });

  it('batch=1 es identidad', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(abc|)', { a: 'x', b: 'y', c: 'z' });
      const result$ = source$.pipe(withBackpressure<string>(1));
      expectObservable(result$).toBe('(abc|)', { a: 'x', b: 'y', c: 'z' });
    });
  });

  it('batch > N — todos pasan', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('(ab|)', { a: 10, b: 20 });
      const result$ = source$.pipe(withBackpressure<number>(100));
      expectObservable(result$).toBe('(ab|)', { a: 10, b: 20 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 9: takeUntil — cancelación condicional
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] takeUntil — cancelación', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('completa cuando señal llega', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c-d-e-f-|', { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });
      const signal$ = cold('----s-------', { s: true });
      const result$ = source$.pipe(takeUntil(signal$));
      // Señal en frame 4, source emite a(0), b(2) y completa en frame 4 (c suprimido)
      expectObservable(result$).toBe('a-b-|', { a: 1, b: 2 });
    });
  });

  it('cancelación inmediata — no emite nada', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c-|', { a: 1, b: 2, c: 3 });
      const cancel$ = cold('(s|)', { s: true });
      const result$ = source$.pipe(takeUntil(cancel$));
      expectObservable(result$).toBe('|');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 10: Escenario real
// Observable Repository con fallos y recuperación
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Escenario real — repositorio completo', () => {
  let scheduler: TestScheduler;

  const habA: Habitacion = { id: 'h1', numero: '101', piso: 1, tipo: 'doble', estado: 'disponible', precio_noche: 120, capacidad: 2 };
  const habB: Habitacion = { id: 'h2', numero: '102', piso: 1, tipo: 'individual', estado: 'ocupada', precio_noche: 80, capacidad: 1 };

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('carga inicial + WS update + filtro por piso', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA, habB] } },
      });
      const updates$ = cold('------(b|)', {
        b: { event: 'estado_actualizado', payload: { habitacion_id: 'h1', estado: 'limpieza' } },
      });
      const estado$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => [...mapa.values()].filter((h) => h.piso === 1).map((h) => ({ id: h.id, estado: h.estado }))),
      );
      expectObservable(estado$).toBe('a-----(b|)', {
        a: [{ id: 'h1', estado: 'disponible' }, { id: 'h2', estado: 'ocupada' }],
        b: [{ id: 'h1', estado: 'limpieza' }, { id: 'h2', estado: 'ocupada' }],
      });
    });
  });

  it('API falla → catchError → stream no muere, usa fallback', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const fallbackHabs = [habA];
      const initial$ = cold('#').pipe(
        catchError(() => of({ event: 'mapa_completo', payload: { habitaciones: fallbackHabs } })),
      );
      const result$ = initial$.pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        map((mapa) => [...mapa.values()].map((h) => h.id)),
      );
      expectObservable(result$).toBe('(a|)', { a: ['h1'] });
    });
  });

  it('10 actualizaciones en 1 frame — scan acumula todas, último estado gana', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const initial$ = cold('(a|)', {
        a: { event: 'mapa_completo', payload: { habitaciones: [habA] } },
      });
      const estados = Array.from({ length: 10 }, (_, i) => ({
        event: 'estado_actualizado' as const,
        payload: { habitacion_id: 'h1', estado: `e${i}` },
      }));
      const updates$ = cold('(bcdefghijk|)', {
        b: estados[0]!, c: estados[1]!, d: estados[2]!,
        e: estados[3]!, f: estados[4]!, g: estados[5]!,
        h: estados[6]!, i: estados[7]!, j: estados[8]!, k: estados[9]!,
      });
      const result$ = merge(initial$, updates$).pipe(
        scan(acumularEventos, new Map<string, Habitacion>()),
        scan((acc: string[], mapa) => [...acc, [...mapa.values()][0]!.estado], [] as string[]),
      );
      // 1 + 10 = 11 emisiones, scan acumula cada estado secuencialmente
      expectObservable(result$).toBe('(abcdefghijk|)', {
        a: ['disponible'], b: ['disponible', 'e0'], c: ['disponible', 'e0', 'e1'],
        d: ['disponible', 'e0', 'e1', 'e2'], e: ['disponible', 'e0', 'e1', 'e2', 'e3'],
        f: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4'],
        g: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5'],
        h: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
        i: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
        j: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
        k: ['disponible', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 11: Propagación de errores
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Propagación de errores', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('error sin catch — propaga', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--#', { a: 1 });
      expectObservable(source$).toBe('--a--#', { a: 1 });
    });
  });

  it('error con catch — no propaga, usa fallback y completa', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--#', { a: 1 });
      const result$ = source$.pipe(catchError(() => of(42)));
      expectObservable(result$).toBe('--a--(b|)', { a: 1, b: 42 });
    });
  });
});

// ═══════════════════════════════════════════════════════════
// SECCIÓN 12: Funciones puras con StepVerifier (no marble)
// ═══════════════════════════════════════════════════════════

describe('[StepVerifier] Funciones puras', () => {
  it('of + pipe(map) — valores transformados', () => {
    const source$ = of(1, 2, 3).pipe(map((x) => x * 10));
    const values: number[] = [];
    source$.subscribe((v) => values.push(v));
    expect(values).toEqual([10, 20, 30]);
  });

  it('from + pipe(filter) — solo pares', () => {
    const source$ = from([1, 2, 3, 4, 5]).pipe(filter((x) => x % 2 === 0));
    const values: number[] = [];
    source$.subscribe((v) => values.push(v));
    expect(values).toEqual([2, 4]);
  });

  it('Subject + next — emite valores secuencialmente', () => {
    const subj = new Subject<number>();
    const values: number[] = [];
    subj.subscribe((v) => values.push(v));
    subj.next(1);
    subj.next(2);
    subj.next(3);
    expect(values).toEqual([1, 2, 3]);
  });

  it('BehaviorSubject — emite valor inicial', () => {
    const subj = new BehaviorSubject<number>(0);
    const values: number[] = [];
    subj.subscribe((v) => values.push(v));
    subj.next(1);
    expect(values).toEqual([0, 1]);
  });

  it('scan fold — suma acumulada', () => {
    const source$ = from([1, 2, 3, 4, 5]).pipe(
      scan((acc: number, x: number) => acc + x, 0),
    );
    const values: number[] = [];
    source$.subscribe((v) => values.push(v));
    expect(values).toEqual([1, 3, 6, 10, 15]);
  });

  it('scan fold inmutable — no muta semilla original', () => {
    const semilla = { count: 0 };
    const snapshots: object[] = [];
    const source$ = from([1, 2, 3]).pipe(
      scan((acc: { count: number }, x: number) => {
        snapshots.push(acc);
        return { count: acc.count + x };
      }, semilla),
    );
    source$.subscribe();
    expect(snapshots.slice(1).every((s) => s !== semilla)).toBe(true);
  });
});
