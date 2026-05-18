// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Funciones de Orden Superior (HOF)
//
// Verifica las propiedades matemáticas de las HOF:
// - Composición asociativa
// - Identidad (identity law)
// - Currying correcto (aplicación parcial)
// - Pureza (sin efectos secundarios)
// - Inmutabilidad (los inputs no se mutan)
// ═══════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest';
import {
  pipe,
  compose,
  filtrarPor,
  agruparPor,
  ordenarPor,
  transformar,
  filtrarCon,
  reducir,
  todosLosPredicados,
  algunPredicado,
  negar,
  memoize,
  identity,
  constant,
  tap,
  siCondicion,
} from '../../domain/higher-order';

// ─────────────────────────────────────────────────────────
// Datos de prueba
// ─────────────────────────────────────────────────────────

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
}

const productos: readonly Producto[] = [
  { id: 1, nombre: 'Manzana', precio: 1.5, categoria: 'fruta' },
  { id: 2, nombre: 'Banana', precio: 0.8, categoria: 'fruta' },
  { id: 3, nombre: 'Leche', precio: 2.0, categoria: 'lácteo' },
  { id: 4, nombre: 'Queso', precio: 5.0, categoria: 'lácteo' },
  { id: 5, nombre: 'Pan', precio: 1.2, categoria: 'cereal' },
];

// ─────────────────────────────────────────────────────────

describe('pipe — composición izquierda a derecha (data-first)', () => {
  it('aplica funciones en orden izquierda → derecha', () => {
    // [HOF - PIPE] pipe(valor, f1, f2, f3) === f3(f2(f1(valor)))
    // El primer argumento es el dato; los siguientes son las transformaciones.
    const resultado = pipe(10,
      (x: number) => x + 1,  // 11
      (x: number) => x * 2,  // 22
      (x: number) => x - 3,  // 19
    );
    expect(resultado).toBe(19);
  });

  it('sin funciones es la identidad', () => {
    // pipe(x) === x — Ley de identidad del pipe
    expect(pipe(42)).toBe(42);
  });

  it('pipe(x, f, g) ≡ g(f(x)) — propiedad asociativa', () => {
    const f = (x: number) => x + 1;
    const g = (x: number) => x * 2;
    // [PROPIEDAD] La composición es matemáticamente equivalente
    expect(pipe(5, f, g)).toBe(g(f(5)));
  });
});

describe('compose — composición derecha a izquierda (f ∘ g)', () => {
  it('aplica funciones en orden derecha → izquierda', () => {
    // [HOF - COMPOSE] compose(f, g)(x) === f(g(x))
    // Notación matemática: (f ∘ g)(x)
    const f = (x: number) => x + 1;
    const g = (x: number) => x * 2;
    // compose(f, g)(5) = f(g(5)) = f(10) = 11
    expect(compose(f, g)(5)).toBe(11);
  });

  it('compose(f, g)(x) ≡ pipe(x, g, f) — dualidad con pipe', () => {
    const f = (x: string) => x.toUpperCase();
    const g = (x: string) => x.trim();
    const input = '  hola  ';
    // compose aplica g primero, luego f; pipe data-first aplica igual si invertimos el orden
    expect(compose(f, g)(input)).toBe(pipe(input, g, f));
  });
});

describe('filtrarPor — currying por propiedad', () => {
  it('filtra por categoría exacta', () => {
    // [CURRYING] filtrarPor<T>(propiedad)(valor)(lista) — 3 niveles de aplicación
    const frutas = filtrarPor<Producto>('categoria')('fruta')(productos);
    expect(frutas).toHaveLength(2);
    expect(frutas.every((p) => p.categoria === 'fruta')).toBe(true);
  });

  it('retorna array vacío si no hay coincidencias', () => {
    const resultado = filtrarPor<Producto>('categoria')('electrónico')(productos);
    expect(resultado).toHaveLength(0);
  });

  it('puede reutilizarse — función parcialmente aplicada', () => {
    // [REUTILIZACIÓN] La función parcialmente aplicada se puede guardar
    const soloFrutas = filtrarPor<Producto>('categoria')('fruta');
    expect(soloFrutas(productos)).toHaveLength(2);
  });
});

describe('agruparPor — groupBy curried', () => {
  it('agrupa por categoría correctamente', () => {
    // [HOF] agruparPor retorna un Record con los grupos
    const grupos = agruparPor<Producto>('categoria')(productos);
    expect(Object.keys(grupos)).toHaveLength(3);
    expect(grupos['fruta']).toHaveLength(2);
    expect(grupos['lácteo']).toHaveLength(2);
    expect(grupos['cereal']).toHaveLength(1);
  });
});

describe('ordenarPor — comparador curried', () => {
  it('ordena por precio ascendente', () => {
    // [INMUTABILIDAD] ordenarPor retorna un comparador para Array.sort
    // No muta el original; spread crea una copia nueva antes de ordenar
    const ordenados = [...productos].sort(ordenarPor<Producto>('precio')('asc'));
    expect(ordenados[0]!.precio).toBeLessThanOrEqual(ordenados[1]!.precio);
  });

  it('ordena por precio descendente', () => {
    const ordenados = [...productos].sort(ordenarPor<Producto>('precio')('desc'));
    expect(ordenados[0]!.precio).toBeGreaterThanOrEqual(ordenados[1]!.precio);
  });

  it('[INMUTABILIDAD] no muta el array original', () => {
    const original = [...productos];
    [...productos].sort(ordenarPor<Producto>('precio')('asc'));
    // El spread crea una copia; el array original permanece igual
    expect(productos).toEqual(original);
  });
});

describe('transformar — map curried', () => {
  it('aplica la función a todos los elementos', () => {
    // [HOF] transformar<T, U>(fn)(lista) — map funcional curried
    const nombres = transformar<Producto, string>((p) => p.nombre)(productos);
    expect(nombres).toHaveLength(productos.length);
    expect(nombres[0]).toBe('Manzana');
  });
});

describe('filtrarCon — filter curried', () => {
  it('filtra con predicado dado', () => {
    const caros = filtrarCon<Producto>((p) => p.precio > 2)(productos);
    expect(caros.every((p) => p.precio > 2)).toBe(true);
  });
});

describe('reducir — reduce curried', () => {
  it('suma precios con reduce (fold izquierdo)', () => {
    // [HOF] reducir<T, U>(fn, inicial)(lista) — fold izquierdo curried
    const total = reducir<Producto, number>((acc, p) => acc + p.precio, 0)(productos);
    const expected = productos.reduce((a, p) => a + p.precio, 0);
    expect(total).toBeCloseTo(expected);
  });
});

describe('todosLosPredicados — AND combinator (toma array de predicados)', () => {
  it('retorna true solo si TODOS los predicados se cumplen', () => {
    // [HOF] todosLosPredicados recibe un array de predicados
    const esFruta = (p: Producto) => p.categoria === 'fruta';
    const esCaro = (p: Producto) => p.precio > 1;

    const frutaCara = todosLosPredicados([esFruta, esCaro]);
    expect(frutaCara(productos[0]!)).toBe(true);  // Manzana: fruta y 1.5 > 1
    expect(frutaCara(productos[1]!)).toBe(false); // Banana: fruta pero 0.8 < 1
  });
});

describe('algunPredicado — OR combinator (toma array de predicados)', () => {
  it('retorna true si AL MENOS UN predicado se cumple', () => {
    // [HOF] algunPredicado recibe un array de predicados
    const esFruta = (p: Producto) => p.categoria === 'fruta';
    const esCaro = (p: Producto) => p.precio > 4;

    const frutaOCaro = algunPredicado([esFruta, esCaro]);
    expect(frutaOCaro(productos[3]!)).toBe(true);  // Queso: lácteo pero 5.0 > 4
    expect(frutaOCaro(productos[4]!)).toBe(false); // Pan: cereal y 1.2 ≤ 4
  });
});

describe('negar — negación de predicado', () => {
  it('invierte el resultado del predicado', () => {
    // [HOF] negar envuelve un predicado y lo invierte — combinador booleano
    const esFruta = (p: Producto) => p.categoria === 'fruta';
    const noEsFruta = negar(esFruta);

    expect(noEsFruta(productos[0]!)).toBe(false); // Manzana es fruta → negar → false
    expect(noEsFruta(productos[2]!)).toBe(true);  // Leche no es fruta → negar → true
  });
});

describe('memoize — caché de resultados (optimización pura)', () => {
  it('retorna el mismo resultado sin llamar a la función de nuevo', () => {
    // [MEMOIZACIÓN] Solo válido para funciones puras (mismo input → mismo output)
    const expensiva = vi.fn((x: number) => x * x);
    const memoizada = memoize(expensiva);

    expect(memoizada(5)).toBe(25);
    expect(memoizada(5)).toBe(25); // usa caché
    expect(expensiva).toHaveBeenCalledTimes(1);
  });

  it('llama a la función para argumentos distintos', () => {
    const fn = vi.fn((x: number) => x + 1);
    const memo = memoize(fn);

    memo(1);
    memo(2);
    memo(1); // usa caché

    expect(fn).toHaveBeenCalledTimes(2); // solo 1 y 2
  });
});

describe('identity — función identidad (ley cero)', () => {
  it('retorna el mismo valor sin modificarlo', () => {
    // identity(x) === x — elemento neutro de la composición
    expect(identity(42)).toBe(42);
    expect(identity('hola')).toBe('hola');
  });
});

describe('constant — función constante', () => {
  it('retorna siempre el mismo valor ignorando el argumento', () => {
    // [HOF] constant(x) retorna una función que siempre devuelve x
    const siempre5 = constant(5);
    expect(siempre5('a')).toBe(5);
    expect(siempre5(999)).toBe(5);
  });
});

describe('tap — efecto sin mutación', () => {
  it('ejecuta el efecto y retorna el valor original', () => {
    const log = vi.fn();
    const resultado = tap<number>(log)(42);
    expect(resultado).toBe(42);
    expect(log).toHaveBeenCalledWith(42);
  });
});

describe('siCondicion — aplicación condicional', () => {
  it('aplica la función si el predicado es verdadero', () => {
    const doble = (x: number) => x * 2;
    const mayores5 = (x: number) => x > 5;

    const r1 = siCondicion(mayores5, doble)(10); // 10 > 5 → doble
    const r2 = siCondicion(mayores5, doble)(3);  // 3 ≤ 5 → sin cambio

    expect(r1).toBe(20);
    expect(r2).toBe(3);
  });
});
