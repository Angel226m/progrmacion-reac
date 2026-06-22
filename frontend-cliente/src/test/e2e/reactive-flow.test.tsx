import { describe, it, expect } from 'vitest';
import { Subject, of } from 'rxjs';
import { scan } from 'rxjs/operators';
import { ok, err, fold, mapResult, flatMapResult, fromPromise, type Result } from '../../domain/result';

describe('E2E Reactivo: Result Railway en Streams', () => {
  it('Result Ok propaga datos correctamente', () => {
    const subject = new Subject<ReturnType<typeof ok> | ReturnType<typeof err>>();
    const values: unknown[] = [];

    const sub = subject.subscribe({
      next: (result) => {
        if (result.ok) values.push(result.value);
      },
    });

    subject.next(ok([{ id: 'h1', numero: '101', estado: 'disponible' }]));
    expect(values).toHaveLength(1);
    sub.unsubscribe();
  });

  it('Result Err no propaga datos (Railway)', () => {
    const subject = new Subject<ReturnType<typeof ok> | ReturnType<typeof err>>();
    const values: unknown[] = [];
    const errors: string[] = [];

    const sub = subject.subscribe({
      next: (result) => {
        if (result.ok) {
          values.push(result.value);
        } else {
          errors.push(result.error as string);
        }
      },
    });

    subject.next(err('Error de conexión'));
    expect(values).toHaveLength(0);
    expect(errors).toContain('Error de conexión');
    sub.unsubscribe();
  });

  it('fold() sobre Result transforma correctamente', () => {
    const subject = new Subject<ReturnType<typeof ok> | ReturnType<typeof err>>();
    const mensajes: string[] = [];

    const sub = subject.subscribe({
      next: (result) => {
        const mensaje = fold<unknown, string, string>(
          (habitaciones: unknown) => `Cargadas ${(habitaciones as unknown[]).length}`,
          (error: string) => `Error: ${error}`,
        )(result as Result<unknown, string>);
        mensajes.push(mensaje);
      },
    });

    subject.next(ok([{ id: 'h1' }, { id: 'h2' }]));
    expect(mensajes).toContain('Cargadas 2');
    sub.unsubscribe();
  });
});

describe('E2E Reactivo: Actualización en tiempo real (scan)', () => {
  it('scan acumula cambios de estado inmutable', () => {
    type State = ReadonlyArray<{ id: string; estado: string }>;
    const reducer = (acc: State, item: { id: string; estado: string }) =>
      acc.some((x) => x.id === item.id)
        ? acc.map((x) => (x.id === item.id ? item : x))
        : [...acc, item];

    const events$ = of(
      { id: 'h1', estado: 'disponible' },
      { id: 'h2', estado: 'ocupada' },
      { id: 'h1', estado: 'ocupada' },
    );

    const result: Array<{ id: string; estado: string }> = [];
    events$.pipe(scan(reducer, [] as State)).subscribe({
      next: (state) => {
        result.length = 0;
        result.push(...state);
      },
    });

    expect(result).toHaveLength(2);
    expect(result.find((h) => h.id === 'h1')?.estado).toBe('ocupada');
  });
});

describe('E2E Reactivo: fromPromise + Result + fold (Railway)', () => {
  it('fromPromise exitosa → fold Ok', async () => {
    const resultado = await fromPromise(
      Promise.resolve({ habitaciones: [{ id: 'h1' }, { id: 'h2' }] }),
      (e) => e instanceof Error ? e.message : String(e),
    );

    const mensaje = fold(
      (data: { habitaciones: unknown[] }) => `Éxito: ${data.habitaciones.length} habs`,
      (error: string) => `Error: ${error}`,
    )(resultado);

    expect(mensaje).toMatch(/Éxito/);
  });

  it('fromPromise fallida → fold Err', async () => {
    const resultado = await fromPromise(
      Promise.reject(new Error('Network error')),
      (e) => e instanceof Error ? e.message : String(e),
    );

    const mensaje = fold(
      (data: unknown) => `Éxito: ${JSON.stringify(data)}`,
      (error: string) => `Error: ${error}`,
    )(resultado);

    expect(mensaje).toMatch(/Error/);
  });
});

describe('E2E Reactivo: Composición función pura + Result', () => {
  it('mapResult: transforma valor Ok con función pura', () => {
    const transformar = (x: number) => x * 2;
    const resultado = mapResult<number, number, string>(transformar)(ok(21));
    const valor = fold(
      (v: number) => v,
      (_: string) => 0,
    )(resultado);

    expect(valor).toBe(42);
  });

  it('composición: flatMapResult después de mapResult', () => {
    const pipeline = (x: number) =>
      flatMapResult<number, string, string>(
        (y: number) => ok(`valor: ${y}`),
      )(mapResult<number, number, string>((n: number) => n * 2)(ok(x)));

    const resultado = pipeline(21);
    const valor = fold<string, string, string>(
      (v: string) => v,
      (_: string) => 'error',
    )(resultado as Result<string, string>);

    expect(valor).toBe('valor: 42');
  });
});
