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
  it('clasifica como económica si precio < 100', () => {
    const hab = { ...habitaciones[0]!, precio_noche: '80.00' };
    expect(clasificarHabitacion(hab)).toBe('económica');
  });

  it('clasifica como estándar si 100 ≤ precio < 200', () => {
    const hab = { ...habitaciones[1]!, precio_noche: '150.00' };
    expect(clasificarHabitacion(hab)).toBe('estándar');
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
  it('calcula porcentaje de habitaciones no disponibles', () => {
    const pct = calcularOcupacion(habitaciones);
    // 2 de 5 no disponibles = 40%
    expect(pct).toBeCloseTo(40);
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
  it('ordena por precio ascendente', () => {
    const ordenadas = ordenarHabitaciones(habitaciones);
    for (let i = 0; i < ordenadas.length - 1; i++) {
      expect(parseFloat(ordenadas[i]!.precio_noche)).toBeLessThanOrEqual(
        parseFloat(ordenadas[i + 1]!.precio_noche),
      );
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
  it('multiplica precio por noches correctamente', () => {
    const total = calcularTotalReserva(100, '2025-06-01', '2025-06-04');
    expect(total).toBeCloseTo(300);
  });
});

describe('esReservaVencida — predicado puro', () => {
  it('retorna true si la fecha de salida es anterior a hoy', () => {
    const vencida = { fecha_salida: '2020-01-01', estado: 'activa' } as any;
    expect(esReservaVencida(vencida, new Date())).toBe(true);
  });

  it('retorna false si la fecha de salida es futura', () => {
    const activa = { fecha_salida: '2099-01-01', estado: 'activa' } as any;
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
  it('retorna true si los minutos superan el límite', () => {
    const tarea = { minutos_en_progreso: 60, tiempo_limite_min: 45 } as any;
    expect(superaTiempoLimite(tarea, new Date())).toBe(true);
  });

  it('retorna false si está dentro del límite', () => {
    const tarea = { minutos_en_progreso: 30, tiempo_limite_min: 45 } as any;
    expect(superaTiempoLimite(tarea, new Date())).toBe(false);
  });
});
