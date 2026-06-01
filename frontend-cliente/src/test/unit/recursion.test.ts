// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: Funciones Recursivas del Dominio
//
// Verifica las propiedades de las funciones recursivas:
// - Caso base correcto
// - Caso recursivo (reduce a caso base)
// - TCO con acumulador (no stack overflow)
// - Inmutabilidad (nunca muta la entrada)
// - HOF: mapArbol/filtrarArbol reciben funciones
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  aplanarEventos,
  mapArbol,
  profundidadArbol,
  filtrarArbol,
  recorrerHotel,
  reconstruirEstado,
  agruparEnChunks,
} from '../../domain/pure/recursion';
import type {
  EventoAnidado,
  Arbol,
  NodoHotel,
  NodoPiso,
} from '../../domain/pure/recursion';
import type { Habitacion } from '../../domain/entidades/habitacion';

// ─────────────────────────────────────────────────────────
// Datos de prueba
// ─────────────────────────────────────────────────────────

const habBase: Habitacion = {
  id: 'h1', numero: '101', piso: 1, tipo: 'simple', estado: 'disponible',
  capacidad: 1, precio_noche: '80.00', amenidades: [], clasificacion: null,
  caracteristicas: null, notas: null, inserted_at: '', updated_at: '',
};

const arbolSimple: Arbol<number> = {
  valor: 1,
  hijos: [
    { valor: 2, hijos: [] },
    { valor: 3, hijos: [{ valor: 4, hijos: [] }] },
  ],
};

// ─────────────────────────────────────────────────────────
// aplanarEventos — recursión de cola (TCO)
// ─────────────────────────────────────────────────────────

describe('aplanarEventos — TCO, DFS', () => {
  it('lista vacía retorna array vacío (caso base)', () => {
    const resultado = aplanarEventos([]);
    expect(resultado).toHaveLength(0);
  });

  it('evento sin hijos retorna sólo ese evento', () => {
    const eventos: EventoAnidado<string>[] = [{ tipo: 'reserva_iniciada', payload: 'A' }];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.tipo).toBe('reserva_iniciada');
  });

  it('aplana un nivel de hijos correctamente', () => {
    const eventos: EventoAnidado<string>[] = [
      {
        tipo: 'reserva_creada',
        payload: 'root',
        hijos: [
          { tipo: 'habitacion_bloqueada', payload: 'child' },
          { tipo: 'confirmacion_enviada', payload: 'child2' },
        ],
      },
    ];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(3);
    const tipos = resultado.map((e) => e.tipo);
    expect(tipos).toContain('reserva_creada');
    expect(tipos).toContain('habitacion_bloqueada');
    expect(tipos).toContain('confirmacion_enviada');
  });

  it('aplana anidamiento profundo (DFS)', () => {
    const eventos: EventoAnidado<number>[] = [
      {
        tipo: 'A',
        payload: 1,
        hijos: [
          {
            tipo: 'B',
            payload: 2,
            hijos: [{ tipo: 'C', payload: 3 }],
          },
        ],
      },
    ];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(3);
  });

  it('no muta el array original', () => {
    const eventos: EventoAnidado<string>[] = [
      { tipo: 'X', payload: 'p', hijos: [{ tipo: 'Y', payload: 'q' }] },
    ];
    const original = JSON.stringify(eventos);
    aplanarEventos(eventos);
    expect(JSON.stringify(eventos)).toBe(original);
  });

  it('múltiples raíces se aplanan en orden', () => {
    const eventos: EventoAnidado<number>[] = [
      { tipo: 'pago', payload: 1 },
      { tipo: 'confirmacion', payload: 2 },
      { tipo: 'notificacion', payload: 3 },
    ];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(3);
    expect(resultado[0]!.tipo).toBe('pago');
  });
});

// ─────────────────────────────────────────────────────────
// mapArbol — recursión estructural HOF
// ─────────────────────────────────────────────────────────

describe('mapArbol — HOF, recursión estructural', () => {
  it('transforma el valor de la raíz', () => {
    const resultado = mapArbol(arbolSimple, (x) => x * 10);
    expect(resultado.valor).toBe(10);
  });

  it('transforma recursivamente todos los hijos', () => {
    const resultado = mapArbol(arbolSimple, (x) => x + 100);
    expect(resultado.hijos[0]!.valor).toBe(102);
    expect(resultado.hijos[1]!.valor).toBe(103);
    expect(resultado.hijos[1]!.hijos[0]!.valor).toBe(104);
  });

  it('map(identity) produce árbol con mismos valores (Functor law)', () => {
    const identidad = mapArbol(arbolSimple, (x: number) => x);
    expect(identidad.valor).toBe(arbolSimple.valor);
    expect(identidad.hijos[0]!.valor).toBe(arbolSimple.hijos[0]!.valor);
  });

  it('no muta el árbol original', () => {
    const valorOriginal = arbolSimple.valor;
    mapArbol(arbolSimple, (x) => x * 999);
    expect(arbolSimple.valor).toBe(valorOriginal);
  });

  it('árbol hoja retorna nodo transformado sin hijos', () => {
    const hoja: Arbol<string> = { valor: 'suite', hijos: [] };
    const resultado = mapArbol(hoja, (s) => s.toUpperCase());
    expect(resultado.valor).toBe('SUITE');
    expect(resultado.hijos).toHaveLength(0);
  });

  it('map(f ∘ g) ≡ map(f) ∘ map(g) — composición de funtores', () => {
    const f = (x: number) => x + 1;
    const g = (x: number) => x * 2;
    const composicion = mapArbol(arbolSimple, (x) => f(g(x)));
    const encadenado = mapArbol(mapArbol(arbolSimple, g), f);
    expect(composicion.valor).toBe(encadenado.valor);
  });
});

// ─────────────────────────────────────────────────────────
// profundidadArbol — recursión con caso base
// ─────────────────────────────────────────────────────────

describe('profundidadArbol — caso base: nodo hoja = 1', () => {
  it('nodo hoja tiene profundidad 1', () => {
    const hoja: Arbol<string> = { valor: 'suite', hijos: [] };
    expect(profundidadArbol(hoja)).toBe(1);
  });

  it('árbol de 2 niveles tiene profundidad 2', () => {
    const arbol: Arbol<number> = {
      valor: 1,
      hijos: [{ valor: 2, hijos: [] }],
    };
    expect(profundidadArbol(arbol)).toBe(2);
  });

  it('calcula la profundidad máxima entre ramas desiguales', () => {
    // arbolSimple: profundidad máxima = 3 (raíz → hijo3 → nieto4)
    expect(profundidadArbol(arbolSimple)).toBe(3);
  });

  it('árbol lineal tiene profundidad igual a su longitud', () => {
    const lineal: Arbol<number> = {
      valor: 1,
      hijos: [{ valor: 2, hijos: [{ valor: 3, hijos: [{ valor: 4, hijos: [] }] }] }],
    };
    expect(profundidadArbol(lineal)).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────
// filtrarArbol — HOF + recursión
// ─────────────────────────────────────────────────────────

describe('filtrarArbol — HOF predicado + recursión', () => {
  it('retorna null si la raíz no cumple el predicado', () => {
    const resultado = filtrarArbol(arbolSimple, (x) => x > 100);
    expect(resultado).toBeNull();
  });

  it('mantiene la raíz si cumple el predicado', () => {
    const resultado = filtrarArbol(arbolSimple, (x) => x >= 1);
    expect(resultado).not.toBeNull();
    expect(resultado!.valor).toBe(1);
  });

  it('poda hijos pares, conserva impares', () => {
    const resultado = filtrarArbol(arbolSimple, (x) => x % 2 !== 0);
    expect(resultado).not.toBeNull();
    expect(resultado!.hijos.some((h) => h.valor === 2)).toBe(false);
    expect(resultado!.hijos.some((h) => h.valor === 3)).toBe(true);
  });

  it('no muta el árbol original', () => {
    const snapshot = JSON.stringify(arbolSimple);
    filtrarArbol(arbolSimple, (x) => x < 3);
    expect(JSON.stringify(arbolSimple)).toBe(snapshot);
  });

  it('predicado universal (always true) conserva todo el árbol', () => {
    const resultado = filtrarArbol(arbolSimple, () => true);
    expect(resultado).not.toBeNull();
    const totalNodos = (a: typeof arbolSimple): number =>
      1 + a.hijos.reduce((acc, h) => acc + totalNodos(h), 0);
    expect(totalNodos(resultado!)).toBe(totalNodos(arbolSimple));
  });
});

// ─────────────────────────────────────────────────────────
// recorrerHotel — TCO con acumulador
// ─────────────────────────────────────────────────────────

describe('recorrerHotel — TCO sobre Hotel → Pisos → Habitaciones', () => {
  const piso1: NodoPiso = {
    id: 'p1', numero: 1, nombre: 'Planta baja',
    habitaciones: [habBase, { ...habBase, id: 'h2', numero: '102' }],
  };
  const piso2: NodoPiso = {
    id: 'p2', numero: 2, nombre: 'Primer piso',
    habitaciones: [{ ...habBase, id: 'h3', numero: '201' }],
  };
  const hotel: NodoHotel = { nombre: 'HotelFlux', pisos: [piso1, piso2] };

  it('visita todas las habitaciones del hotel', () => {
    const ids = recorrerHotel(hotel, (h) => h.id);
    expect(ids).toHaveLength(3);
    expect(ids).toContain('h1');
    expect(ids).toContain('h2');
    expect(ids).toContain('h3');
  });

  it('visitante recibe el piso como contexto', () => {
    const pisos = recorrerHotel(hotel, (_, p) => p.numero);
    expect(pisos.filter((n) => n === 1)).toHaveLength(2);
    expect(pisos.filter((n) => n === 2)).toHaveLength(1);
  });

  it('hotel sin pisos retorna lista vacía', () => {
    const hotelVacio: NodoHotel = { nombre: 'Vacío', pisos: [] };
    expect(recorrerHotel(hotelVacio, (h) => h.id)).toHaveLength(0);
  });

  it('puede recolectar precios de todas las habitaciones', () => {
    const precios = recorrerHotel(hotel, (h) => parseFloat(h.precio_noche));
    expect(precios.every((p) => typeof p === 'number')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// reconstruirEstado — Event Sourcing, TCO fold
// ─────────────────────────────────────────────────────────

describe('reconstruirEstado — Event Sourcing, TCO fold', () => {
  it('sin eventos retorna estado inicial', () => {
    const resultado = reconstruirEstado(0, [], (s: number, e: number) => s + e);
    expect(resultado).toBe(0);
  });

  it('aplica un único evento', () => {
    const resultado = reconstruirEstado(10, [5], (s, e) => s + e);
    expect(resultado).toBe(15);
  });

  it('aplica múltiples eventos en orden', () => {
    const resultado = reconstruirEstado(0, [1, 2, 3, 4, 5], (s, e) => s + e);
    expect(resultado).toBe(15);
  });

  it('reconstruye estado de reserva desde eventos de cliente', () => {
    type EstadoReserva = { estado: string; total: number };
    type EventoReserva = { tipo: 'crear' | 'confirmar' | 'cancelar'; payload: number };

    const inicial: EstadoReserva = { estado: 'borrador', total: 0 };
    const eventos: EventoReserva[] = [
      { tipo: 'crear', payload: 350 },
      { tipo: 'confirmar', payload: 0 },
    ];

    const aplicar = (s: EstadoReserva, e: EventoReserva): EstadoReserva => {
      if (e.tipo === 'crear') return { ...s, estado: 'pendiente', total: e.payload };
      if (e.tipo === 'confirmar') return { ...s, estado: 'confirmada' };
      if (e.tipo === 'cancelar') return { ...s, estado: 'cancelada' };
      return s;
    };

    const resultado = reconstruirEstado(inicial, eventos, aplicar);
    expect(resultado.estado).toBe('confirmada');
    expect(resultado.total).toBe(350);
  });

  it('no muta el estado inicial', () => {
    const inicial = { valor: 0 };
    reconstruirEstado(inicial, [1, 2], (s, _e) => ({ valor: s.valor + _e }));
    expect(inicial.valor).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// agruparEnChunks — recursión divide-y-vencerás
// ─────────────────────────────────────────────────────────

describe('agruparEnChunks — divide lista en grupos de tamaño N', () => {
  it('lista vacía retorna array vacío', () => {
    expect(agruparEnChunks([], 3)).toHaveLength(0);
  });

  it('lista con menos elementos que N retorna un único chunk', () => {
    const resultado = agruparEnChunks(['suite', 'doble'], 5);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(['suite', 'doble']);
  });

  it('divide exactamente N elementos por chunk', () => {
    const resultado = agruparEnChunks([1, 2, 3, 4], 2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual([1, 2]);
    expect(resultado[1]).toEqual([3, 4]);
  });

  it('el último chunk puede ser más pequeño', () => {
    const resultado = agruparEnChunks([1, 2, 3, 4, 5], 2);
    expect(resultado).toHaveLength(3);
    expect(resultado[2]).toEqual([5]);
  });

  it('conserva todos los elementos originales en los chunks', () => {
    const lista = [10, 20, 30, 40, 50, 60];
    const aplanado = agruparEnChunks(lista, 3).flat();
    expect(aplanado).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('no muta la lista original', () => {
    const lista = [1, 2, 3, 4];
    const copia = [...lista];
    agruparEnChunks(lista, 2);
    expect(lista).toEqual(copia);
  });
});
