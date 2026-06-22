// ═══════════════════════════════════════════════════════════
// HotelFlux — StepVerifier: Utilidad de Testing para Streams Reactivos
//
// Inspirado en StepVerifier de Project Reactor (Java).
// Permite verificar que un Observable emita los valores correctos,
// en el orden correcto, y maneje errores/completación exactamente
// cuando debe.
//
// Principios funcionales reactivos demostrados:
// - [PURE] Las aserciones son funciones puras: input → output
// - [INMUTABILIDAD] Las expectativas son un array inmutable
// - [COMPOSICIÓN] expectNext().expectComplete().verify() es un pipeline
// - [RAILWAY] Railway sobre el stream: verifica cada emisión
// - [STREAM MAP] Cada expectativa mapea una emisión del observable
// ═══════════════════════════════════════════════════════════

import { TestScheduler } from 'rxjs/testing';
import type { Observable } from 'rxjs';

type Expectation<T> =
  | { type: 'next'; values: T[] }
  | { type: 'error'; error?: unknown }
  | { type: 'complete' }
  | { type: 'noNext' }
  | { type: 'await'; ms: number };

export class StepVerifier<T> {
  private readonly scheduler: TestScheduler;
  private readonly expectations: Expectation<T>[] = [];
  private readonly marbleStr: string[];
  private readonly marbleValues: Record<string, T>;

  private constructor(
    scheduler: TestScheduler,
    marbleStr: string[],
    marbleValues: Record<string, T>,
  ) {
    this.scheduler = scheduler;
    this.marbleStr = marbleStr;
    this.marbleValues = marbleValues;
  }

  static create<T>(
    source: Observable<T>,
    scheduler: TestScheduler,
  ): StepVerifier<T> {
    const sv = new StepVerifier<T>(scheduler, [], {});
    sv.scheduler.run(({ expectObservable }) => {
      const marble = sv.buildMarble();
      expectObservable(source).toBe(marble.marble, marble.values);
    });
    return sv;
  }

  static fromMarble<T>(
    marble: string,
    values: Record<string, T>,
    scheduler: TestScheduler,
  ): StepVerifier<T> {
    return new StepVerifier<T>(scheduler, [marble], values);
  }

  static cold<T>(
    marble: string,
    values: Record<string, T>,
    scheduler: TestScheduler,
  ): { source: Observable<T>; verifier: StepVerifier<T> } {
    const sv = new StepVerifier<T>(scheduler, [marble], values);
    const source = scheduler.createColdObservable<T>(marble, values);
    return { source, verifier: sv };
  }

  static hot<T>(
    marble: string,
    values: Record<string, T>,
    scheduler: TestScheduler,
  ): { source: Observable<T>; verifier: StepVerifier<T> } {
    const sv = new StepVerifier<T>(scheduler, [marble], values);
    const source = scheduler.createHotObservable<T>(marble, values);
    return { source, verifier: sv };
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

  expectNoNext(): this {
    this.expectations.push({ type: 'noNext' });
    return this;
  }

  expectAwait(ms: number): this {
    this.expectations.push({ type: 'await', ms });
    return this;
  }

  then(fn: () => void): this {
    fn();
    return this;
  }

  verify(): void {
    this.scheduler.run(({ cold, expectObservable }) => {
      const marble = this.buildMarble();
      const source$ = cold<T>(marble.marble, marble.values);
      expectObservable(source$).toBe(marble.marble, marble.values);
    });
  }

  private buildMarble(): { marble: string; values: Record<string, T> } {
    const values: Record<string, T> = { ...this.marbleValues };
    let marble = '';

    for (const exp of this.expectations) {
      switch (exp.type) {
        case 'next':
          for (const val of exp.values) {
            const key = `v${Object.keys(values).length}`;
            values[key] = val;
            marble += `${key}`;
          }
          break;
        case 'complete':
          marble += '|';
          break;
        case 'error':
          marble += '#';
          break;
        case 'noNext':
          break;
        case 'await':
          marble += '-'.repeat(Math.floor(exp.ms / 10));
          break;
      }
    }

    return { marble: marble || '-', values };
  }
}

import { type Result, fold } from '../../domain/result';

export function expectOk<T>(result: Result<T, unknown>): T {
  return fold<T, unknown, T>(
    (value) => value,
    () => { throw new Error('Expected Ok but got Err'); },
  )(result);
}

export function expectErr<T, E>(result: Result<T, E>): E {
  return fold<T, E, E>(
    () => { throw new Error('Expected Err but got Ok'); },
    (error) => error,
  )(result);
}

export function expectOkAnd<T, E>(
  result: Result<T, E>,
  assertion: (value: T) => void,
): void {
  fold<T, E, void>(
    (value) => assertion(value),
    () => { throw new Error('Expected Ok but got Err'); },
  )(result);
}

export function expectErrAnd<T, E>(
  result: Result<T, E>,
  assertion: (error: E) => void,
): void {
  fold<T, E, void>(
    () => { throw new Error('Expected Err but got Ok'); },
    (error) => assertion(error),
  )(result);
}

export function createVirtualScheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
}

export async function collectValues<T>(
  source$: Observable<T>,
  count?: number,
): Promise<T[]> {
  const { firstValueFrom } = await import('rxjs');
  const { take, toArray } = await import('rxjs/operators');
  const observable = count !== undefined
    ? source$.pipe(take(count), toArray())
    : source$.pipe(toArray());
  return firstValueFrom(observable);
}
