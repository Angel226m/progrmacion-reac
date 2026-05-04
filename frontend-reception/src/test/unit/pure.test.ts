// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Funciones Puras del Dominio
//
// Verifica que las funciones puras sean deterministas,
// no muten datos y produzcan los valores esperados.
// ═══════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  calcularPrecioConIGV,
  clasificarHabitacion,
  agruparPorEstado,
  calcularOcupacion,
  filtrarDisponiblesConCapacidad,
  filtrarPorTipo,
  ordenarHabitaciones,
  calcularNoches,
  calcularTotalReserva,
  esReservaVencida,
  formatearPrecio,
  formatearPorcentaje,
  superaTiempoLimite,
} from '../../domain/pure';
import type { Habitacion } from '../../domain/entidades/habitacion';

// ─────────────────────────────────────────────────────────
// Datos de prueba
// ─────────────────────────────────────────────────────────

const habitaciones: readonly Habitacion[] = [
  { id: '1', numero: '101', piso: 1, tipo: 'simple', estado: 'disponible', capacidad: 1, precio_noche: '80.00', amenidades: [], clasificacion: null, caracteristicas: null, notas: null, inserted_at: '', updated_at: '' },
  { id: '2', numero: '102', piso: 1, tipo: 'doble', estado: 'ocupada', capacidad: 2, precio_noche: '120.00', amenidades: [], clasificacion: null, caracteristicas: null, notas: null, inserted_at: '', updated_at: '' },
  { id: '3', numero: '201', piso: 2, tipo: 'suite', estado: 'disponible', capacidad: 4, precio_noche: '250.00', amenidades: [], clasificacion: null, caracteristicas: null, notas: null, inserted_at: '', updated_at: '' },
  { id: '4', numero: '202', piso: 2, tipo: 'doble', estado: 'en_limpieza', capacidad: 2, precio_noche: '110.00', amenidades: [], clasificacion: null, caracteristicas: null, notas: null, inserted_at: '', updated_at: '' },
  { id: '5', numero: '301', piso: 3, tipo: 'simple', estado: 'disponible', capacidad: 1, precio_noche: '75.00', amenidades: [], clasificacion: null, caracteristicas: null, notas: null, inserted_at: '', updated_at: '' },
];

// ─────────────────────────────────────────────────────────

describe('calcularPrecioConIGV — función pura', () => {
  it('aplica 18% de IGV al precio base', () => {
    expect(calcularPrecioConIGV(100)).toBeCloseTo(118);
  });

  it('es determinista: mismo input → mismo output', () => {
    expect(calcularPrecioConIGV(200)).toBe(calcularPrecioConIGV(200));
  });

  it('precio 0 retorna 0', () => {
    expect(calcularPrecioConIGV(0)).toBe(0);
  });
});

describe('clasificarHabitacion — función pura', () => {
  it('clasifica como economica si precio < 100', () => {
    const hab = { ...habitaciones[0]!, precio_noche: '80.00' };
    expect(clasificarHabitacion(hab)).toBe('economica');
  });

  it('clasifica como estandar si 100 ≤ precio < 200', () => {
    const hab = { ...habitaciones[1]!, precio_noche: '150.00' };
    expect(clasificarHabitacion(hab)).toBe('estandar');
  });

  it('clasifica como premium si precio ≥ 200', () => {
    const hab = { ...habitaciones[2]!, precio_noche: '250.00' };
    expect(clasificarHabitacion(hab)).toBe('premium');
  });
});

describe('agruparPorEstado — pura, no muta', () => {
  it('agrupa correctamente por estado', () => {
    const grupos = agruparPorEstado(habitaciones);
    expect(grupos['disponible']).toHaveLength(3);
    expect(grupos['ocupada']).toHaveLength(1);
    expect(grupos['en_limpieza']).toHaveLength(1);
  });

  it('no muta el array original', () => {
    const copia = [...habitaciones];
    agruparPorEstado(habitaciones);
    expect(habitaciones).toEqual(copia);
  });
});

describe('calcularOcupacion — porcentaje puro', () => {
  it('calcula porcentaje de habitaciones ocupadas', () => {
    const pct = calcularOcupacion(habitaciones);
    // 1 de 5 ocupadas = 20%
    expect(pct).toBeCloseTo(20);
  });

  it('retorna 0 si todas son disponibles', () => {
    const todas = habitaciones.map((h) => ({ ...h, estado: 'disponible' as const }));
    expect(calcularOcupacion(todas)).toBe(0);
  });

  it('retorna 100 si todas están ocupadas', () => {
    const todas = habitaciones.map((h) => ({ ...h, estado: 'ocupada' as const }));
    expect(calcularOcupacion(todas)).toBe(100);
  });

  it('retorna 0 con lista vacía', () => {
    expect(calcularOcupacion([])).toBe(0);
  });
});

describe('filtrarDisponiblesConCapacidad — HOF pura', () => {
  it('filtra disponibles con capacidad mínima', () => {
    const resultado = filtrarDisponiblesConCapacidad(habitaciones, 2);
    // Solo suite (cap 4) + disponible
    expect(resultado.every((h) => h.estado === 'disponible')).toBe(true);
    expect(resultado.every((h) => h.capacidad >= 2)).toBe(true);
  });

  it('retorna todas las disponibles con capacidad 1', () => {
    const resultado = filtrarDisponiblesConCapacidad(habitaciones, 1);
    expect(resultado).toHaveLength(3); // las 3 disponibles
  });
});

describe('filtrarPorTipo — HOF curried', () => {
  it('filtra por tipo usando currying', () => {
    const soloSimples = filtrarPorTipo('simple');
    const resultado = habitaciones.filter(soloSimples);
    expect(resultado.every((h) => h.tipo === 'simple')).toBe(true);
    expect(resultado).toHaveLength(2);
  });
});

describe('ordenarHabitaciones — pura, no muta', () => {
  it('ordena por piso y numero ascendente', () => {
    const ordenadas = ordenarHabitaciones(habitaciones);
    for (let i = 0; i < ordenadas.length - 1; i++) {
      if (ordenadas[i]!.piso !== ordenadas[i + 1]!.piso) {
        expect(ordenadas[i]!.piso).toBeLessThan(ordenadas[i + 1]!.piso);
      }
    }
  });

  it('no muta el array original', () => {
    const antes = habitaciones.map((h) => h.id);
    ordenarHabitaciones(habitaciones);
    const despues = habitaciones.map((h) => h.id);
    expect(despues).toEqual(antes);
  });
});

describe('calcularNoches — función pura de fechas', () => {
  it('calcula el número de noches correctamente', () => {
    const noches = calcularNoches('2025-01-01', '2025-01-05');
    expect(noches).toBe(4);
  });

  it('retorna 0 para misma fecha de entrada y salida', () => {
    const noches = calcularNoches('2025-01-01', '2025-01-01');
    expect(noches).toBe(0);
  });
});

describe('calcularTotalReserva — composición pura', () => {
  it('multiplica precio por noches con IGV', () => {
    const total = calcularTotalReserva(100, '2025-06-01', '2025-06-04');
    // 100 * 3 noches * 1.18 (IGV) = 354
    expect(total).toBeCloseTo(354);
  });
});

describe('esReservaVencida — predicado puro', () => {
  it('retorna true si la fecha de entrada es anterior a hoy y estado es confirmada', () => {
    const vencida = { fecha_entrada: '2020-01-01', estado: 'confirmada' } as any;
    expect(esReservaVencida(vencida, new Date())).toBe(true);
  });

  it('retorna false si la fecha de entrada es futura', () => {
    const activa = { fecha_entrada: '2099-01-01', estado: 'confirmada' } as any;
    expect(esReservaVencida(activa, new Date())).toBe(false);
  });

  it('retorna false si el estado no es confirmada', () => {
    const activa = { fecha_entrada: '2020-01-01', estado: 'checked_in' } as any;
    expect(esReservaVencida(activa, new Date())).toBe(false);
  });
});

describe('formatearPrecio — pura de presentación', () => {
  it('formatea número como moneda', () => {
    expect(formatearPrecio(1500)).toMatch(/1[.,]?500/);
  });
});

describe('formatearPorcentaje — pura de presentación', () => {
  it('formatea con símbolo %', () => {
    expect(formatearPorcentaje(75.5)).toContain('%');
  });
});

describe('superaTiempoLimite — predicado puro', () => {
  it('retorna true si el tiempo desde inicio supera el límite', () => {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const tarea = { iniciada_at: haceUnaHora, estado: 'en_proceso' } as any;
    const ahora = new Date();
    const minutos = Math.floor((ahora.getTime() - new Date(haceUnaHora).getTime()) / 60000);
    expect(minutos).toBeGreaterThan(45);
    expect(superaTiempoLimite(tarea, ahora, 45)).toBe(true);
  });

  it('retorna false si está dentro del límite', () => {
    const hace20Minutos = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const tarea = { iniciada_at: hace20Minutos, estado: 'en_proceso' } as any;
    const ahora = new Date();
    expect(superaTiempoLimite(tarea, ahora, 45)).toBe(false);
  });

  it('retorna false si no está en proceso', () => {
    const tarea = { iniciada_at: new Date().toISOString(), estado: 'pendiente' } as any;
    expect(superaTiempoLimite(tarea, new Date(), 45)).toBe(false);
  });
});
