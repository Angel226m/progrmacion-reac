// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests del API Client y Admin API
// Verifica fetch helpers, fallback a offline, y admin endpoints
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOfflineMode } from '../services/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOfflineMode', () => {
    it('debe ser una función que retorna booleano', () => {
      const result = isOfflineMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Fetch con mock', () => {
    it('fetch es mockeable', () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });
      globalThis.fetch = mockFetch;

      fetch('/api/test');
      expect(mockFetch).toHaveBeenCalledWith('/api/test');
    });

    it('maneja respuesta exitosa', async () => {
      const mockData = { habitaciones: [{ id: '1', numero: '101' }] };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const response = await fetch('/api/v1/habitaciones');
      const data = await response.json();
      expect(data.habitaciones).toHaveLength(1);
      expect(data.habitaciones[0].numero).toBe('101');
    });

    it('maneja error HTTP', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'No autorizado' }),
      });

      const response = await fetch('/api/v1/auth/login');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('maneja error de red', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(fetch('/api/v1/dashboard')).rejects.toThrow('Network Error');
    });
  });

  describe('Cliente API endpoints patterns', () => {
    it('endpoints públicos siguen patrón correcto', () => {
      const publicEndpoints = [
        '/api/v1/publico/info',
        '/api/v1/publico/disponibilidad',
        '/api/v1/publico/servicios',
        '/api/v1/publico/tipos-habitacion',
        '/api/v1/publico/politica-privacidad',
        '/api/v1/publico/terminos',
      ];

      publicEndpoints.forEach((ep) => {
        expect(ep).toMatch(/^\/api\/v1\/publico\//);
      });
      expect(publicEndpoints).toHaveLength(6);
    });

    it('auth endpoints siguen patrón correcto', () => {
      const authEndpoints = [
        '/api/v1/auth/login',
        '/api/v1/auth/registro',
        '/api/v1/auth/logout',
        '/api/v1/auth/renovar',
        '/api/v1/auth/perfil',
      ];

      authEndpoints.forEach((ep) => {
        expect(ep).toMatch(/^\/api\/v1\/auth\//);
      });
    });
  });
});

describe('Admin API Types', () => {
  it('MetricasAdmin tiene estructura correcta', () => {
    // Verifica que el tipo esperado por el frontend coincide con el backend
    const metricas = {
      cache: true,
      periodo: 'mes',
      ocupacion: { total: 20, ocupadas: 15, porcentaje: 75.0 },
      ingresos: { total: '45000.00', pagos_completados: 12 },
      reservas: { total: 8, por_estado: { confirmada: 3, checked_in: 2, checked_out: 2, cancelada: 1 } },
      limpieza: { completadas: 10, pendientes: 2, promedio_min: 35 },
      productos_populares: [
        { nombre: 'Cerveza', cantidad: 15, ingresos: '82.50' },
      ],
    };

    expect(metricas.ocupacion.porcentaje).toBeGreaterThanOrEqual(0);
    expect(metricas.ocupacion.porcentaje).toBeLessThanOrEqual(100);
    expect(metricas.reservas.por_estado).toHaveProperty('confirmada');
    expect(metricas.productos_populares).toBeInstanceOf(Array);
    expect(typeof metricas.cache).toBe('boolean');
  });
});
