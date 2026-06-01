// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Funciones Recursivas del Dominio
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
    const eventos: EventoAnidado<string>[] = [{ tipo: 'check_in', payload: 'A' }];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.tipo).toBe('check_in');
  });

  it('aplana un nivel de hijos correctamente', () => {
    const eventos: EventoAnidado<string>[] = [
      {
        tipo: 'reserva_creada',
        payload: 'root',
        hijos: [
          { tipo: 'habitacion_bloqueada', payload: 'child' },
          { tipo: 'notificacion_enviada', payload: 'child2' },
        ],
      },
    ];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(3);
    const tipos = resultado.map((e) => e.tipo);
    expect(tipos).toContain('reserva_creada');
    expect(tipos).toContain('habitacion_bloqueada');
    expect(tipos).toContain('notificacion_enviada');
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
      { tipo: 'A', payload: 1 },
      { tipo: 'B', payload: 2 },
      { tipo: 'C', payload: 3 },
    ];
    const resultado = aplanarEventos(eventos);
    expect(resultado).toHaveLength(3);
    expect(resultado[0]!.tipo).toBe('A');
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

  it('map(f ∘ g) ≡ map(f) ∘ map(g) — composición', () => {
    const f = (x: number) => x + 1;
    const g = (x: number) => x * 2;
    const composicion = mapArbol(arbolSimple, (x) => f(g(x)));
    const encadenado = mapArbol(mapArbol(arbolSimple, g), f);
    expect(composicion.valor).toBe(encadenado.valor);
    expect(composicion.hijos[0]!.valor).toBe(encadenado.hijos[0]!.valor);
  });

  it('no muta el árbol original', () => {
    const valorOriginal = arbolSimple.valor;
    mapArbol(arbolSimple, (x) => x * 999);
    expect(arbolSimple.valor).toBe(valorOriginal);
  });

  it('árbol hoja (sin hijos) retorna nodo transformado', () => {
    const hoja: Arbol<string> = { valor: 'X', hijos: [] };
    const resultado = mapArbol(hoja, (s) => s.toLowerCase());
    expect(resultado.valor).toBe('x');
    expect(resultado.hijos).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// profundidadArbol — recursión con caso base
// ─────────────────────────────────────────────────────────

describe('profundidadArbol — caso base: nodo hoja = 1', () => {
  it('nodo hoja tiene profundidad 1', () => {
    const hoja: Arbol<number> = { valor: 42, hijos: [] };
    expect(profundidadArbol(hoja)).toBe(1);
  });

  it('árbol de 2 niveles tiene profundidad 2', () => {
    const arbol: Arbol<number> = {
      valor: 1,
      hijos: [{ valor: 2, hijos: [] }],
    };
    expect(profundidadArbol(arbol)).toBe(2);
  });

  it('calcula la profundidad máxima entre ramas', () => {
    // arbolSimple: raíz(1) → hijo(2,[]) y hijo(3,[nieto(4)])
    // profundidad máxima = 3 (raíz → 3 → 4)
    expect(profundidadArbol(arbolSimple)).toBe(3);
  });

  it('árbol equilibrado: nodos balanceados tienen la misma profundidad', () => {
    const balanceado: Arbol<number> = {
      valor: 0,
      hijos: [
        { valor: 1, hijos: [{ valor: 3, hijos: [] }] },
        { valor: 2, hijos: [{ valor: 4, hijos: [] }] },
      ],
    };
    expect(profundidadArbol(balanceado)).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────
// filtrarArbol — HOF + recursión
// ─────────────────────────────────────────────────────────

describe('filtrarArbol — HOF predicado + recursión', () => {
  it('retorna null si la raíz no cumple el predicado', () => {
    const resultado = filtrarArbol(arbolSimple, (x) => x > 10);
    expect(resultado).toBeNull();
  });

  it('mantiene raíz si cumple el predicado', () => {
    const resultado = filtrarArbol(arbolSimple, (x) => x >= 1);
    expect(resultado).not.toBeNull();
    expect(resultado!.valor).toBe(1);
  });

  it('poda hijos que no cumplen el predicado', () => {
    // Solo dejar nodos con valor impar
    const resultado = filtrarArbol(arbolSimple, (x) => x % 2 !== 0);
    expect(resultado).not.toBeNull();
    expect(resultado!.valor).toBe(1); // raíz impar
    // hijo 2 es par → podado
    // hijo 3 es impar → conservado, pero su hijo 4 es par → podado
    expect(resultado!.hijos.some((h) => h.valor === 2)).toBe(false);
    expect(resultado!.hijos.some((h) => h.valor === 3)).toBe(true);
  });

  it('no muta el árbol original', () => {
    const snapshot = JSON.stringify(arbolSimple);
    filtrarArbol(arbolSimple, (x) => x < 3);
    expect(JSON.stringify(arbolSimple)).toBe(snapshot);
  });
});

// ─────────────────────────────────────────────────────────
// recorrerHotel — TCO con acumulador (estructura hotelera)
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

  it('el visitante recibe también el piso como contexto', () => {
    const pisos = recorrerHotel(hotel, (_, piso) => piso.numero);
    // Piso 1 tiene 2 habs, piso 2 tiene 1 hab
    expect(pisos.filter((p) => p === 1)).toHaveLength(2);
    expect(pisos.filter((p) => p === 2)).toHaveLength(1);
  });

  it('hotel sin pisos retorna lista vacía', () => {
    const hotelVacio: NodoHotel = { nombre: 'Vacío', pisos: [] };
    const resultado = recorrerHotel(hotelVacio, (h) => h.id);
    expect(resultado).toHaveLength(0);
  });

  it('piso sin habitaciones no aporta elementos', () => {
    const pisoVacio: NodoPiso = { id: 'p3', numero: 3, nombre: 'Piso 3', habitaciones: [] };
    const hotelMixto: NodoHotel = { nombre: 'Mixto', pisos: [piso1, pisoVacio] };
    const resultado = recorrerHotel(hotelMixto, (h) => h.id);
    expect(resultado).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────
// reconstruirEstado — fold/Event Sourcing, TCO
// ─────────────────────────────────────────────────────────

describe('reconstruirEstado — Event Sourcing, TCO fold', () => {
  it('sin eventos retorna el estado inicial', () => {
    const resultado = reconstruirEstado(0, [], (s: number, _e: number) => s + _e);
    expect(resultado).toBe(0);
  });

  it('aplica un único evento al estado inicial', () => {
    const resultado = reconstruirEstado(10, [5], (s, e) => s + e);
    expect(resultado).toBe(15);
  });

  it('aplica múltiples eventos en orden (fold izquierdo)', () => {
    const eventos = [1, 2, 3, 4, 5];
    const resultado = reconstruirEstado(0, eventos, (s, e) => s + e);
    expect(resultado).toBe(15); // 0+1+2+3+4+5
  });

  it('reconstruye estado de habitación desde eventos de dominio', () => {
    type EstadoHab = { estado: string; notas: string | null };
    type EventoHab = { tipo: 'ocupar' | 'liberar' | 'anotar'; payload: string };

    const estadoInicial: EstadoHab = { estado: 'disponible', notas: null };
    const eventos: EventoHab[] = [
      { tipo: 'ocupar', payload: 'check_in' },
      { tipo: 'anotar', payload: 'Cliente VIP' },
      { tipo: 'liberar', payload: 'check_out' },
    ];

    const aplicar = (s: EstadoHab, e: EventoHab): EstadoHab => {
      if (e.tipo === 'ocupar') return { ...s, estado: 'ocupada' };
      if (e.tipo === 'liberar') return { ...s, estado: 'disponible' };
      if (e.tipo === 'anotar') return { ...s, notas: e.payload };
      return s;
    };

    const resultado = reconstruirEstado(estadoInicial, eventos, aplicar);
    expect(resultado.estado).toBe('disponible');
    expect(resultado.notas).toBe('Cliente VIP');
  });

  it('no muta el estado inicial', () => {
    const inicial = { count: 0 };
    reconstruirEstado(inicial, [1, 2], (s, _e) => ({ count: s.count + _e }));
    expect(inicial.count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// agruparEnChunks — recursión divide-y-vencerás
// ─────────────────────────────────────────────────────────

describe('agruparEnChunks — divide lista en grupos de tamaño N', () => {
  it('lista vacía retorna array vacío', () => {
    const resultado = agruparEnChunks([], 3);
    expect(resultado).toHaveLength(0);
  });

  it('lista con menos elementos que N retorna un único chunk', () => {
    const resultado = agruparEnChunks([1, 2], 5);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual([1, 2]);
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

  it('todos los elementos originales están en los chunks', () => {
    const lista = [10, 20, 30, 40, 50, 60];
    const chunks = agruparEnChunks(lista, 3);
    const aplanado = chunks.flat();
    expect(aplanado).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('no muta la lista original', () => {
    const lista = [1, 2, 3, 4];
    const copia = [...lista];
    agruparEnChunks(lista, 2);
    expect(lista).toEqual(copia);
  });

  it('chunk de tamaño 1 produce N chunks unitarios', () => {
    const resultado = agruparEnChunks(['a', 'b', 'c'], 1);
    expect(resultado).toHaveLength(3);
    resultado.forEach((c) => expect(c).toHaveLength(1));
  });
});
