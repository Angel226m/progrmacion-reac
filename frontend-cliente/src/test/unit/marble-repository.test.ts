import { describe, it, expect } from 'vitest';
import { TestScheduler } from 'rxjs/testing';
import { of, merge } from 'rxjs';
import { map, scan, distinctUntilChanged, catchError } from 'rxjs/operators';
import {
  ok,
  err,
  flatMapResult,
  mapResult,
  sequence,
  traverse,
  tryCatch,
  fromPromise,
  type Result,
} from '../../domain/result';

function scheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
}

describe('flatMapResult — Monadic bind en streams (Railway)', () => {
  it('propaga el valor Ok a través del pipeline', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(a|)', { a: ok(42) });
      const transformed$ = source$.pipe(
        map(flatMapResult<number, string, string>((x) => ok(`valor: ${x}`))),
      );
      expectObservable(transformed$).toBe('(a|)', {
        a: { ok: true, value: 'valor: 42' },
      });
    });
  });

  it('propaga el error sin ejecutar la función', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(a|)', { a: err('fallo') });
      const transformed$ = source$.pipe(
        map(flatMapResult<number, number, string>((x) => ok(x * 2))),
      );
      expectObservable(transformed$).toBe('(a|)', {
        a: { ok: false, error: 'fallo' },
      });
    });
  });

  it('encadena múltiples flatMapResult (composición funcional)', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(a|)', { a: ok(5) });
      const pipeline$ = source$.pipe(
        map(flatMapResult<number, number, string>((x) => ok(x + 3))),
        map(flatMapResult<number, string, string>((x) => ok(`total: ${x}`))),
      );
      expectObservable(pipeline$).toBe('(a|)', {
        a: { ok: true, value: 'total: 8' },
      });
    });
  });
});

describe('mapResult — Functor sobre Result en streams', () => {
  it('aplica función solo al carril Ok', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(a|)', { a: ok(10) });
      const mapped$ = source$.pipe(
        map(mapResult<number, number, string>((x) => x * 3)),
      );
      expectObservable(mapped$).toBe('(a|)', {
        a: { ok: true, value: 30 },
      });
    });
  });

  it('salta el error sin aplicar función', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(a|)', { a: err('error') });
      const mapped$ = source$.pipe(
        map(mapResult<number, number, string>((x) => x * 3)),
      );
      expectObservable(mapped$).toBe('(a|)', {
        a: { ok: false, error: 'error' },
      });
    });
  });
});

describe('SCAN — Fold reactivo (acumulación inmutable)', () => {
  it('acumula eventos en un mapa inmutable', () => {
    scheduler().run(({ cold, expectObservable }) => {
      type State = ReadonlyArray<{ id: number; valor: string }>;
      const reducer = (acc: State, item: { id: number; valor: string }): State =>
        acc.some((x) => x.id === item.id)
          ? acc.map((x) => (x.id === item.id ? item : x))
          : [...acc, item];

      const events$ = cold<{ id: number; valor: string }>('-a-b-c-|', {
        a: { id: 1, valor: 'A' },
        b: { id: 2, valor: 'B' },
        c: { id: 1, valor: 'A2' },
      });

      const state$ = events$.pipe(
        scan(reducer, [] as State),
      );

      expectObservable(state$).toBe('-a-b-c-|', {
        a: [{ id: 1, valor: 'A' }],
        b: [{ id: 1, valor: 'A' }, { id: 2, valor: 'B' }],
        c: [{ id: 1, valor: 'A2' }, { id: 2, valor: 'B' }],
      });
    });
  });

  it('scan con Result: acumula Ok y propaga Err', () => {
    scheduler().run(({ cold, expectObservable }) => {
      type Acc = readonly number[];
      const reducer = (acc: Acc, item: Result<number, string>): Acc =>
        item.ok ? [...acc, item.value] : acc;

      const items$ = cold<Result<number, string>>('-a-b-c-|', {
        a: ok(1),
        b: ok(2),
        c: err('fallo'),
      });

      const accumulated$ = items$.pipe(
        scan(reducer, [] as Acc),
      );

      expectObservable(accumulated$).toBe('-a-b-c-|', {
        a: [1],
        b: [1, 2],
        c: [1, 2],
      });
    });
  });
});

describe('distinctUntilChanged — Comparación funcional de Results', () => {
  it('no emite si Ok contiene mismo valor', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(ab|)', {
        a: ok(42),
        b: ok(42),
      });
      const deduped$ = source$.pipe(
        distinctUntilChanged((prev, curr) =>
          prev.ok && curr.ok
            ? prev.value === curr.value
            : prev.ok === curr.ok,
        ),
      );
      expectObservable(deduped$).toBe('(a|)', {
        a: { ok: true, value: 42 },
      });
    });
  });

  it('emite si Ok tiene valor diferente', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<Result<number, string>>('(ab|)', {
        a: ok(1),
        b: ok(2),
      });
      const deduped$ = source$.pipe(
        distinctUntilChanged((prev, curr) =>
          prev.ok && curr.ok
            ? prev.value === curr.value
            : prev.ok === curr.ok,
        ),
      );
      expectObservable(deduped$).toBe('(ab|)', {
        a: { ok: true, value: 1 },
        b: { ok: true, value: 2 },
      });
    });
  });
});

describe('catchError con Result — Railway Oriented Programming', () => {
  it('atrapa error del stream y lo convierte en Result.Err', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source$ = cold<number>('-a-#', { a: 1 }).pipe(
        map((x) => ok(x)),
        catchError((e) => of(err(e instanceof Error ? e.message : String(e)))),
      );
      expectObservable(source$).toBe('-a-(b|)', {
        a: { ok: true, value: 1 },
        b: { ok: false, error: 'error' },
      });
    });
  });
});

describe('Observable Repository Pattern — Merge + Scan', () => {
  it('merge de carga inicial + updates produce stream continuo', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const initial$ = cold<Result<string[], string>>('(a|)', {
        a: ok(['hab1', 'hab2']),
      });
      const updates$ = cold<Result<string[], string>>('----b|', {
        b: ok(['hab1', 'hab2', 'hab3']),
      });

      const stream$ = merge(initial$, updates$).pipe(
        scan((acc: string[], curr: Result<string[], string>) =>
          curr.ok ? [...curr.value] : acc,
          [] as string[],
        ),
      );

      expectObservable(stream$).toBe('a---b|', {
        a: ['hab1', 'hab2'],
        b: ['hab1', 'hab2', 'hab3'],
      });
    });
  });
});

describe('WebSocket Event Accumulation — Scan como fold reactivo', () => {
  it('acumula eventos de WebSocket en un mapa', () => {
    scheduler().run(({ cold, expectObservable }) => {
      type Event =
        | { type: 'add'; id: string; name: string }
        | { type: 'remove'; id: string };

      type State = ReadonlyMap<string, { id: string; name: string }>;

      const reducer = (state: State, event: Event): State => {
        switch (event.type) {
          case 'add':
            return new Map(state).set(event.id, { id: event.id, name: event.name });
          case 'remove': {
            const next = new Map(state);
            next.delete(event.id);
            return next;
          }
        }
      };

      const events$ = cold<Event>('-a-b-c-|', {
        a: { type: 'add', id: '1', name: 'Hab 1' },
        b: { type: 'add', id: '2', name: 'Hab 2' },
        c: { type: 'remove', id: '1' },
      });

      const state$ = events$.pipe(
        scan(reducer, new Map<string, { id: string; name: string }>()),
        map((m) => [...m.values()].sort((a, b) => a.id.localeCompare(b.id))),
      );

      expectObservable(state$).toBe('-a-b-c-|', {
        a: [{ id: '1', name: 'Hab 1' }],
        b: [{ id: '1', name: 'Hab 1' }, { id: '2', name: 'Hab 2' }],
        c: [{ id: '2', name: 'Hab 2' }],
      });
    });
  });
});

describe('fromPromise — Bridge asíncrono en Tests', () => {
  it('envuelve promesa exitosa en Result.Ok', async () => {
    const result = await fromPromise(
      Promise.resolve(42),
      () => 'error',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it('envuelve promesa fallida en Result.Err', async () => {
    const result = await fromPromise(
      Promise.reject(new Error('fallo')),
      (e) => e instanceof Error ? e.message : String(e),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('fallo');
  });
});

describe('sequence y traverse — Railway sobre colecciones', () => {
  it('sequence: todos Ok → Ok de array', () => {
    const result = sequence([ok(1), ok(2), ok(3)]);
    expect(result).toEqual({ ok: true, value: [1, 2, 3] });
  });

  it('sequence: un Err → propaga el error', () => {
    const result = sequence([ok(1), err('fallo'), ok(3)]);
    expect(result).toEqual({ ok: false, error: 'fallo' });
  });

  it('traverse: aplica función a cada elemento y secuencia', () => {
    const fn = (x: number) => x > 0 ? ok(x * 2) : err('negativo');
    const result = traverse(fn)([1, 2, 3]);
    expect(result).toEqual({ ok: true, value: [2, 4, 6] });
  });

  it('traverse: falla en el primer error', () => {
    const fn = (x: number) => x > 0 ? ok(x) : err('cero');
    const result = traverse(fn)([1, 0, 3]);
    expect(result).toEqual({ ok: false, error: 'cero' });
  });
});

describe('tryCatch — Envuelve funciones impuras en Result', () => {
  it('captura valor de retorno exitoso', () => {
    const result = tryCatch(() => JSON.parse('{"a":1}'), (e) => String(e));
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it('captura excepción en Err', () => {
    const result = tryCatch(() => JSON.parse('invalido'), (e) => String(e));
    expect(result.ok).toBe(false);
  });
});
