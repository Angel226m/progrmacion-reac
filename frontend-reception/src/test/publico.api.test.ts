// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests de la API pública (publico.api.ts)
// Verifica endpoints públicos para huéspedes
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obtenerInfoHotel,
  buscarDisponibilidad,
  obtenerTiposHabitacion,
  crearReservaPublica,
  consultarReserva,
  obtenerServicios,
  obtenerPoliticaPrivacidad,
  obtenerTerminos,
  obtenerPoliticaCookies,
} from '../services/publico.api';

describe('Publico API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('obtenerInfoHotel', () => {
    it('retorna información del hotel', async () => {
      const mockData = {
        nombre: 'HotelFlux',
        pisos: [{ numero: 1, nombre: 'Primer Piso' }],
        tipos_habitacion: ['individual', 'doble'],
        servicios: ['WiFi', 'Piscina'],
        contacto: { telefono: '+51 1 234 5678' },
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await obtenerInfoHotel();
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/publico/info'),
        expect.any(Object),
      );
    });
  });

  describe('buscarDisponibilidad', () => {
    it('envía fechas como query params', async () => {
      const mockData = {
        habitaciones: [{ id: '1', numero: '101', tipo: 'doble', precio_noche: '150.00' }],
        total: 1,
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-05',
        noches: 4,
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await buscarDisponibilidad({
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-05',
      });
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('fecha_entrada=2025-08-01'),
        expect.any(Object),
      );
    });

    it('incluye filtros opcionales de tipo y capacidad', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { habitaciones: [], total: 0, fecha_entrada: '', fecha_salida: '', noches: 0 } }),
      });

      await buscarDisponibilidad({
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-05',
        tipo: 'suite',
        capacidad: 3,
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tipo=suite'),
        expect.any(Object),
      );
    });
  });

  describe('crearReservaPublica', () => {
    it('envía datos de reserva por POST', async () => {
      const mockResult = {
        id: 'uuid-123',
        codigo_confirmacion: 'HF-AB12CD34',
        total: '600.00',
        estado: 'confirmada',
        habitacion_numero: 101,
        habitacion_tipo: 'doble',
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-05',
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, reserva: mockResult }),
      });

      const result = await crearReservaPublica({
        habitacion_id: 'hab-1',
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-05',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@test.com',
        telefono: '+51999999999',
        documento: '12345678',
      });

      expect(result.codigo_confirmacion).toBe('HF-AB12CD34');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/publico/reservar'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('consultarReserva', () => {
    it('consulta reserva por ID', async () => {
      const mockReserva = { id: 'uuid-123', estado: 'confirmada', fecha_entrada: '2025-08-01', fecha_salida: '2025-08-05', total: '600.00', noches: 4 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockReserva }),
      });

      const result = await consultarReserva('uuid-123');
      expect(result.estado).toBe('confirmada');
    });
  });

  describe('obtenerServicios', () => {
    it('retorna lista de servicios agrupados', async () => {
      const mockServicios = [
        { categoria: 'Restaurante', productos: [{ id: '1', nombre: 'Desayuno', descripcion: null, precio: '25.00' }] },
      ];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockServicios }),
      });

      const result = await obtenerServicios();
      expect(result).toHaveLength(1);
      expect(result[0]!.categoria).toBe('Restaurante');
    });
  });

  describe('Documentos legales', () => {
    it('obtenerPoliticaPrivacidad retorna documento', async () => {
      const mockDoc = {
        titulo: 'Política de Privacidad',
        version: '1.0',
        fecha_actualizacion: '2025-01-01',
        secciones: [{ titulo: 'Introducción', contenido: 'Lorem ipsum' }],
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockDoc }),
      });

      const result = await obtenerPoliticaPrivacidad();
      expect(result.titulo).toBe('Política de Privacidad');
    });

    it('obtenerTerminos retorna documento', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { titulo: 'Términos y Condiciones', version: '1.0', fecha_actualizacion: '2025-01-01', secciones: [] } }),
      });

      const result = await obtenerTerminos();
      expect(result.titulo).toBe('Términos y Condiciones');
    });

    it('obtenerPoliticaCookies retorna documento', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { titulo: 'Política de Cookies', version: '1.0', fecha_actualizacion: '2025-01-01', secciones: [] } }),
      });

      const result = await obtenerPoliticaCookies();
      expect(result.titulo).toBe('Política de Cookies');
    });
  });

  describe('obtenerTiposHabitacion', () => {
    it('retorna tipos con precios', async () => {
      const mockTipos = [
        { tipo: 'individual', cantidad_total: 10, disponibles: 5, precio_desde: '80.00', precio_hasta: '120.00' },
        { tipo: 'suite', cantidad_total: 4, disponibles: 2, precio_desde: '250.00', precio_hasta: '500.00' },
      ];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTipos }),
      });

      const result = await obtenerTiposHabitacion();
      expect(result).toHaveLength(2);
      expect(result[0]!.tipo).toBe('individual');
      expect(result[1]!.precio_desde).toBe('250.00');
    });
  });
});
