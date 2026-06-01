// ═══════════════════════════════════════════════════════════
// HotelFlux — LABORATORIO DE PRUEBAS REACTIVAS Y FUNCIONALES
//
// Principios del laboratorio:
// - [COMPOSICIÓN] Operadores se componen en pipelines — verificado
// - [INMUTABILIDAD] Ningún operador muta el valor emitido
// - [BACKPRESSURE] Control de flujo bajo carga N-eventos
// - [FAKE TIMERS] Tiempo controlable para debounce/throttle
// - [PROPIEDAD] Tests que verifican leyes (fold, identity, simetría)
// - [CARGA] Emisión de 100-1000 eventos en streams síncronos
//
// Todos los operadores son funciones puras (HOF) que retornan
// OperatorFunction<T,R> — la sinergia reactivo+funcional.
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Subject,
  BehaviorSubject,
  firstValueFrom,
  toArray,
  from,
  of,
  throwError,
} from 'rxjs';
import { take, tap } from 'rxjs/operators';
import {
  withBackpressure,
  slidingWindow,
  withDebounce,
  withFallback,
  distinctUntilChangedDeep,
  distinctByKey,
  scanInmutable,
  adaptiveThrottle,
  retryWithExponentialBackoff,
  asHotWithReplay,
} from '../../streams/operators';

// ═════════════════════════════════════════════════════════
// SECCIÓN 1: withBackpressure — BATCH PROCESSING HOF
//
// Principios: bufferCount + mergeMap = pipeline puro
// Bajo carga: N elementos se procesan sin pérdida
// ═════════════════════════════════════════════════════════

describe('[HOF] withBackpressure — batch processing', () => {
  it('todos los elementos pasan (batch=2, entrada=4)', async () => {
    const resultado = await firstValueFrom(
      from([1, 2, 3, 4]).pipe(withBackpressure<number>(2), toArray()),
    );
    expect(resultado).toHaveLength(4);
    expect(resultado).toEqual([1, 2, 3, 4]);
  });

  it('batch=1 emite elemento a elemento (sin reordenar)', async () => {
    const resultado = await firstValueFrom(
      from([10, 20, 30]).pipe(withBackpressure<number>(1), toArray()),
    );
    expect(resultado).toEqual([10, 20, 30]);
  });

  it('batch mayor que la lista: todos los elementos pasan', async () => {
    const resultado = await firstValueFrom(
      from([1, 2]).pipe(withBackpressure<number>(100), toArray()),
    );
    expect(resultado).toEqual([1, 2]);
  });

  it('[CARGA] 100 eventos procesados en batches de 10 sin pérdida', async () => {
    const N = 100;
    const entrada = Array.from({ length: N }, (_, i) => i + 1);
    const resultado = await firstValueFrom(
      from(entrada).pipe(withBackpressure<number>(10), toArray()),
    );
    expect(resultado).toHaveLength(N);
    expect(resultado).toEqual(entrada);
  });

  it('[PROPIEDAD] withBackpressure(1) es la identidad (preserva el orden)', async () => {
    const entrada = [5, 3, 8, 1, 9, 2];
    const resultado = await firstValueFrom(
      from(entrada).pipe(withBackpressure<number>(1), toArray()),
    );
    expect(resultado).toEqual(entrada);
  });

  it('[INMUTABILIDAD] los objetos emitidos son la misma referencia (no copia)', async () => {
    const objetos = [{ id: 1 }, { id: 2 }];
    const resultado = await firstValueFrom(
      from(objetos).pipe(withBackpressure<{ id: number }>(2), toArray()),
    );
    expect(resultado[0]).toBe(objetos[0]);
    expect(resultado[1]).toBe(objetos[1]);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 2: slidingWindow — SCAN INMUTABLE
// ═════════════════════════════════════════════════════════

describe('[SCAN] slidingWindow — ventana deslizante inmutable', () => {
  it('ventana crece hasta maxItems', () => {
    const subj = new Subject<number>();
    const emitidos: number[][] = [];
    subj.pipe(slidingWindow<number>(3)).subscribe((w) => emitidos.push([...w]));
    subj.next(1); subj.next(2); subj.next(3);
    expect(emitidos[0]).toEqual([1]);
    expect(emitidos[1]).toEqual([1, 2]);
    expect(emitidos[2]).toEqual([1, 2, 3]);
  });

  it('descarta el más antiguo (FIFO) al superar maxItems', () => {
    const subj = new Subject<number>();
    const emitidos: number[][] = [];
    subj.pipe(slidingWindow<number>(3)).subscribe((w) => emitidos.push([...w]));
    subj.next(1); subj.next(2); subj.next(3); subj.next(4);
    const ultima = emitidos[emitidos.length - 1]!;
    expect(ultima).toEqual([2, 3, 4]);
    expect(ultima).not.toContain(1);
  });

  it('[INMUTABILIDAD] no muta snapshots anteriores', () => {
    const subj = new Subject<string>();
    const snapshots: string[][] = [];
    subj.pipe(slidingWindow<string>(3)).subscribe((w) => snapshots.push([...w]));
    subj.next('a'); subj.next('b');
    expect(snapshots[0]).toEqual(['a']);
    expect(snapshots[1]).toEqual(['a', 'b']);
  });

  it('[CARGA] 50 eventos: ventana siempre tiene exactamente maxItems=10 después del llenado', () => {
    const subj = new Subject<number>();
    const ventanas: (readonly number[])[] = [];
    subj.pipe(slidingWindow<number>(10)).subscribe((w) => ventanas.push(w));
    Array.from({ length: 50 }, (_, i) => subj.next(i));
    const ultimas = ventanas.slice(10);
    expect(ultimas.every((v) => v.length === 10)).toBe(true);
  });

  it('[PROPIEDAD] ventana(N) siempre tiene ≤ N elementos', () => {
    const subj = new Subject<number>();
    const ventanas: (readonly number[])[] = [];
    subj.pipe(slidingWindow<number>(5)).subscribe((v) => ventanas.push(v));
    Array.from({ length: 20 }, (_, i) => subj.next(i));
    expect(ventanas.every((v) => v.length <= 5)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 3: withFallback — ERROR HANDLING FUNCIONAL
// ═════════════════════════════════════════════════════════

describe('[HOF] withFallback — manejo funcional de errores', () => {
  it('retorna fallback cuando el stream falla', async () => {
    const fuente$ = new Subject<number[]>();
    const result$ = fuente$.pipe(withFallback<number[]>([]));
    const promesa = firstValueFrom(result$);
    fuente$.error(new Error('API caída'));
    expect(await promesa).toEqual([]);
  });

  it('emite valores normales si no hay error', async () => {
    expect(await firstValueFrom(of(42).pipe(withFallback<number>(0)))).toBe(42);
  });

  it('fallback null es válido', async () => {
    const p = firstValueFrom(throwError(() => new Error('x')).pipe(withFallback<null>(null)));
    expect(await p).toBeNull();
  });

  it('[PROPIEDAD] withFallback no altera stream sin errores', async () => {
    const entrada = [1, 2, 3, 4, 5];
    const resultado = await firstValueFrom(
      from(entrada).pipe(withFallback<number>(-1), toArray()),
    );
    expect(resultado).toEqual(entrada);
  });

  it('[COMPOSICIÓN] withBackpressure + withFallback componen sin conflicto', async () => {
    const resultado = await firstValueFrom(
      from([10, 20, 30]).pipe(
        withBackpressure<number>(2),
        withFallback<number>(-1),
        toArray(),
      ),
    );
    expect(resultado).toEqual([10, 20, 30]);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 4: distinctUntilChangedDeep — DEEP EQUALITY
// ═════════════════════════════════════════════════════════

describe('[HOF] distinctUntilChangedDeep — comparación profunda', () => {
  it('no emite si el objeto es estructuralmente igual', () => {
    const subj = new BehaviorSubject<{ estado: string }>({ estado: 'disponible' });
    const emitidos: { estado: string }[] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((v) => emitidos.push(v));
    subj.next({ estado: 'disponible' });
    expect(emitidos).toHaveLength(1);
  });

  it('emite si el objeto cambia estructuralmente', () => {
    const subj = new BehaviorSubject<{ estado: string }>({ estado: 'disponible' });
    const emitidos: { estado: string }[] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((v) => emitidos.push(v));
    subj.next({ estado: 'ocupada' });
    expect(emitidos).toHaveLength(2);
    expect(emitidos[1]!.estado).toBe('ocupada');
  });

  it('funciona con arrays: igual contenido → no emite', () => {
    const subj = new BehaviorSubject<number[]>([1, 2, 3]);
    const emitidos: number[][] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((v) => emitidos.push(v));
    subj.next([1, 2, 3]);
    expect(emitidos).toHaveLength(1);
  });

  it('funciona con arrays: distinto contenido → emite', () => {
    const subj = new BehaviorSubject<number[]>([1, 2, 3]);
    const emitidos: number[][] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((v) => emitidos.push(v));
    subj.next([1, 2, 4]);
    expect(emitidos).toHaveLength(2);
  });

  it('[CARGA] 50 emisiones iguales → solo 1 notificación', () => {
    const subj = new BehaviorSubject<{ v: number }>({ v: 1 });
    const emitidos: { v: number }[] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((x) => emitidos.push(x));
    Array.from({ length: 50 }, () => subj.next({ v: 1 }));
    expect(emitidos).toHaveLength(1);
  });

  it('[CARGA] 50 emisiones distintas → 51 notificaciones (inicial + 50)', () => {
    const subj = new BehaviorSubject<{ v: number }>({ v: 0 });
    const emitidos: { v: number }[] = [];
    subj.pipe(distinctUntilChangedDeep()).subscribe((x) => emitidos.push(x));
    Array.from({ length: 50 }, (_, i) => subj.next({ v: i + 1 }));
    expect(emitidos).toHaveLength(51);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 5: distinctByKey — DISTINCCIÓN POR CLAVE
// ═════════════════════════════════════════════════════════

describe('[HOF] distinctByKey — distincción por propiedad', () => {
  interface Hab { id: string; estado: string; precio: number }

  it('no emite si la clave vigilada no cambió (aunque cambien otras)', () => {
    const subj = new BehaviorSubject<Hab>({ id: 'h1', estado: 'disponible', precio: 100 });
    const emitidos: Hab[] = [];
    subj.pipe(distinctByKey<Hab, 'estado'>('estado')).subscribe((v) => emitidos.push(v));
    subj.next({ id: 'h1', estado: 'disponible', precio: 999 });
    expect(emitidos).toHaveLength(1);
  });

  it('emite si la clave vigilada cambia', () => {
    const subj = new BehaviorSubject<Hab>({ id: 'h1', estado: 'disponible', precio: 100 });
    const emitidos: Hab[] = [];
    subj.pipe(distinctByKey<Hab, 'estado'>('estado')).subscribe((v) => emitidos.push(v));
    subj.next({ id: 'h1', estado: 'ocupada', precio: 100 });
    expect(emitidos).toHaveLength(2);
    expect(emitidos[1]!.estado).toBe('ocupada');
  });

  it('[PROPIEDAD] distinctByKey es menos restrictivo que distinctUntilChangedDeep', () => {
    const subj = new BehaviorSubject<Hab>({ id: 'h1', estado: 'disponible', precio: 100 });
    const byKey: Hab[] = [];
    const deep: Hab[] = [];
    subj.pipe(distinctByKey<Hab, 'estado'>('estado')).subscribe((v) => byKey.push(v));
    subj.pipe(distinctUntilChangedDeep()).subscribe((v) => deep.push(v));
    subj.next({ id: 'h1', estado: 'disponible', precio: 200 });
    expect(byKey).toHaveLength(1);  // clave no cambió
    expect(deep).toHaveLength(2);   // deep detecta cambio de precio
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 6: scanInmutable — FOLD REACTIVO
// ═════════════════════════════════════════════════════════

describe('[SCAN/FOLD] scanInmutable — fold reactivo inmutable', () => {
  it('acumula suma numérica (fold clásico)', async () => {
    const resultado = await firstValueFrom(
      from([1, 2, 3, 4, 5]).pipe(
        scanInmutable((acc: { suma: number }, x: number) => ({ suma: acc.suma + x }), { suma: 0 }),
        toArray(),
      ),
    );
    expect(resultado.map((r) => r.suma)).toEqual([1, 3, 6, 10, 15]);
  });

  it('[INMUTABILIDAD] la semilla NO es mutada entre iteraciones', async () => {
    const snapshots: object[] = [];
    const semilla = { count: 0 };
    await firstValueFrom(
      from([1, 2, 3]).pipe(
        scanInmutable((acc: typeof semilla, x: number) => {
          snapshots.push(acc);
          return { count: acc.count + x };
        }, semilla),
        toArray(),
      ),
    );
    expect(snapshots.every((s) => s !== semilla)).toBe(true);
  });

  it('[CARGA] fold de 1000 eventos — suma correcta (fórmula de Gauss)', async () => {
    const N = 1000;
    const entrada = Array.from({ length: N }, (_, i) => i + 1);
    const sumaEsperada = (N * (N + 1)) / 2;
    const final = await firstValueFrom(
      from(entrada).pipe(
        scanInmutable((acc: { suma: number }, x: number) => ({ suma: acc.suma + x }), { suma: 0 }),
        toArray(),
      ),
    );
    expect(final[final.length - 1]!.suma).toBe(sumaEsperada);
  });

  it('[COMPOSICIÓN] scanInmutable + slidingWindow: promedio de ventana', async () => {
    const subj = new Subject<number>();
    const promedios: number[] = [];
    subj.pipe(
      slidingWindow<number>(3),
      scanInmutable(
        (_acc: { prom: number }, v: readonly number[]) => ({
          prom: v.reduce((s, x) => s + x, 0) / v.length,
        }),
        { prom: 0 },
      ),
    ).subscribe((r) => promedios.push(r.prom));
    subj.next(10); subj.next(20); subj.next(30); subj.next(40);
    expect(promedios).toEqual([10, 15, 20, 30]);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 7: withDebounce — TIEMPO CONTROLADO (FAKE TIMERS)
// ═════════════════════════════════════════════════════════

describe('[HOF] withDebounce — fake timers', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('no emite inmediatamente tras keystrokes', () => {
    const subj = new Subject<string>();
    const emitidos: string[] = [];
    subj.pipe(withDebounce<string>(300)).subscribe((v) => emitidos.push(v));
    subj.next('h'); subj.next('ha'); subj.next('hab');
    expect(emitidos).toHaveLength(0);
  });

  it('emite solo el último valor tras el silencio', () => {
    const subj = new Subject<string>();
    const emitidos: string[] = [];
    subj.pipe(withDebounce<string>(300)).subscribe((v) => emitidos.push(v));
    subj.next('h'); subj.next('ha'); subj.next('hab');
    vi.advanceTimersByTime(300);
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toBe('hab');
  });

  it('[BACKPRESSURE] ráfaga de 20 eventos → solo 1 emisión', () => {
    const subj = new Subject<number>();
    const emitidos: number[] = [];
    subj.pipe(withDebounce<number>(200)).subscribe((v) => emitidos.push(v));
    Array.from({ length: 20 }, (_, i) => subj.next(i));
    vi.advanceTimersByTime(200);
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toBe(19);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 8: adaptiveThrottle — THROTTLE ALTA CARGA
// ═════════════════════════════════════════════════════════

describe('[HOF] adaptiveThrottle — control de flujo bajo carga', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('devuelve OperatorFunction (HOF verificado)', () => {
    expect(typeof adaptiveThrottle<number>(100)).toBe('function');
  });

  it('emite el primer evento de una ráfaga (leading=true)', () => {
    const subj = new Subject<number>();
    const emitidos: number[] = [];
    subj.pipe(adaptiveThrottle<number>(100)).subscribe((v) => emitidos.push(v));
    subj.next(1); subj.next(2); subj.next(3);
    expect(emitidos[0]).toBe(1);
  });

  it('emite el último de una ráfaga tras el intervalo (trailing=true)', () => {
    const subj = new Subject<number>();
    const emitidos: number[] = [];
    subj.pipe(adaptiveThrottle<number>(100)).subscribe((v) => emitidos.push(v));
    subj.next(1); subj.next(2); subj.next(3);
    vi.advanceTimersByTime(100);
    expect(emitidos).toContain(3);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 9: retryWithExponentialBackoff — RESILIENCIA
// ═════════════════════════════════════════════════════════

describe('[HOF] retryWithExponentialBackoff — resiliencia reactiva', () => {
  it('devuelve OperatorFunction (HOF verificado)', () => {
    expect(typeof retryWithExponentialBackoff<number>(3, 100)).toBe('function');
  });

  it('no reintenta si el primer intento tiene éxito', () => {
    let intentos = 0;
    const subj = new Subject<number>();
    subj.pipe(
      tap(() => { intentos++; }),
      retryWithExponentialBackoff<number>(3, 100),
    ).subscribe();
    subj.next(42);
    subj.complete();
    expect(intentos).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 10: asHotWithReplay — STREAM HOT + REPLAY
// ═════════════════════════════════════════════════════════

describe('[HOF] asHotWithReplay — estado compartido', () => {
  it('devuelve OperatorFunction', () => {
    expect(typeof asHotWithReplay<number>(1)).toBe('function');
  });

  it('múltiples suscriptores reciben el mismo último valor', async () => {
    const subj = new BehaviorSubject<number>(0);
    const hot$ = subj.pipe(asHotWithReplay<number>(1));
    hot$.subscribe();
    subj.next(42);
    const r1 = await firstValueFrom(hot$.pipe(take(1)));
    const r2 = await firstValueFrom(hot$.pipe(take(1)));
    expect(r1).toBe(r2);
    expect(r1).toBe(42);
  });

  it('[PROPIEDAD] nuevo suscriptor recibe el último valor (replay)', async () => {
    const subj = new BehaviorSubject<string>('inicial');
    const hot$ = subj.pipe(asHotWithReplay<string>(1));
    const primero: string[] = [];
    hot$.pipe(take(2)).subscribe((v) => primero.push(v));
    subj.next('actualizado');
    const ultimo = await firstValueFrom(hot$.pipe(take(1)));
    expect(ultimo).toBe('actualizado');
  });
});

// ═════════════════════════════════════════════════════════
// SECCIÓN 11: PIPELINE COMPLETO — SINERGIA REACTIVO+FUNCIONAL
// ═════════════════════════════════════════════════════════

describe('[SINERGIA] pipelines reactivo-funcionales end-to-end', () => {
  it('withBackpressure + distinctUntilChangedDeep + scanInmutable', async () => {
    const eventos = [
      { id: 'h1', estado: 'disponible' },
      { id: 'h1', estado: 'disponible' }, // duplicado
      { id: 'h2', estado: 'ocupada' },
      { id: 'h2', estado: 'ocupada' },    // duplicado
      { id: 'h3', estado: 'limpieza' },
    ];
    const resultado = await firstValueFrom(
      from(eventos).pipe(
        withBackpressure<{ id: string; estado: string }>(3),
        distinctUntilChangedDeep(),
        scanInmutable(
          (acc: { count: number }, _: { id: string; estado: string }) => ({ count: acc.count + 1 }),
          { count: 0 },
        ),
        toArray(),
      ),
    );
    // Solo 3 eventos únicos (los duplicados filtrados)
    expect(resultado[resultado.length - 1]!.count).toBe(3);
  });

  it('[CARGA] pipeline completo con 100 eventos — sin pérdida', async () => {
    const N = 100;
    const entrada = Array.from({ length: N }, (_, i) => ({ id: `h${i}`, valor: i }));
    const resultado = await firstValueFrom(
      from(entrada).pipe(
        withBackpressure<{ id: string; valor: number }>(10),
        scanInmutable(
          (acc: { count: number }, _: unknown) => ({ count: acc.count + 1 }),
          { count: 0 },
        ),
        toArray(),
      ),
    );
    expect(resultado[resultado.length - 1]!.count).toBe(N);
  });
});
