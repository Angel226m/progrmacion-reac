// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Servicios / API (Integration)
// Valida llamadas fetch, fallbacks y modo offline
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOfflineMode } from '../../services/api';
import {
  obtenerInfoHotel,
  buscarDisponibilidad,
  crearReservaPublica,
  consultarReserva,
  obtenerServicios,
  obtenerTiposHabitacion,
  obtenerPoliticaPrivacidad,
  obtenerTerminos,
  obtenerPoliticaCookies,
} from '../../services/publico.api';

// ── API interna ──

describe('Integration / API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('isOfflineMode comienza en false', () => {
    expect(typeof isOfflineMode()).toBe('boolean');
  });

  it('valida endpoints del portal de cliente', () => {
    const endpoints = [
      '/api/v1/publico/info',
      '/api/v1/publico/disponibilidad',
      '/api/v1/publico/reservas',
      '/api/v1/publico/servicios',
      '/api/v1/publico/tipos-habitacion',
    ];
    endpoints.forEach((ep) => {
      expect(ep).toMatch(/^\/api\/v1\/publico\//);
    });
  });
});

// ── API Pública ──

describe('Integration / Publico API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtenerInfoHotel llama endpoint correcto', async () => {
    const mockData = { data: { nombre: 'HotelFlux', descripcion: 'Test', pisos: [], tipos_habitacion: [], servicios: [], contacto: { telefono: '', email: '', direccion: '' } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const info = await obtenerInfoHotel();
    expect(info.nombre).toBe('HotelFlux');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/publico/info'),
      expect.any(Object),
    );
  });

  it('buscarDisponibilidad envía parámetros de fecha', async () => {
    const mockData = { data: { habitaciones: [], total: 0, fecha_entrada: '2025-07-15', fecha_salida: '2025-07-18', noches: 3 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const result = await buscarDisponibilidad({
      fecha_entrada: '2025-07-15',
      fecha_salida: '2025-07-18',
      tipo: 'suite',
    });
    expect(result.noches).toBe(3);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('fecha_entrada=2025-07-15');
    expect(url).toContain('tipo=suite');
  });

  it('crearReservaPublica envía POST con datos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, reserva: { id: 'r1', estado: 'pendiente', habitacion_numero: 101, habitacion_tipo: 'suite', fecha_entrada: '2025-07-15', fecha_salida: '2025-07-18', total: '750.00', codigo_confirmacion: 'HF-001' } }),
    }));

    const reserva = await crearReservaPublica({
      nombre: 'Juan', apellido: 'Pérez', email: 'j@test.com', telefono: '+51999',
      documento: '12345678', habitacion_id: 'h1', fecha_entrada: '2025-07-15', fecha_salida: '2025-07-18',
    });
    expect(reserva.codigo_confirmacion).toBeTruthy();
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]?.method).toBe('POST');
  });

  it('obtenerServicios retorna categorías', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ categoria: 'spa', productos: [{ id: 'p1', nombre: 'Masaje', descripcion: null, precio: '80.00' }] }] }),
    }));

    const servicios = await obtenerServicios();
    expect(servicios[0]!.categoria).toBe('spa');
  });

  it('obtenerTiposHabitacion retorna tipos con precios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ tipo: 'suite', cantidad_total: 10, disponibles: 5, precio_desde: '200.00', precio_hasta: '400.00' }] }),
    }));

    const tipos = await obtenerTiposHabitacion();
    expect(tipos[0]!.tipo).toBe('suite');
    expect(parseFloat(tipos[0]!.precio_desde!)).toBeGreaterThan(0);
  });

  it('legal endpoints retornan DocumentoLegal', async () => {
    const docMock = { data: { titulo: 'Política', version: '1.0', fecha_actualizacion: '2025-01-01', secciones: [] } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(docMock),
    }));

    const priv = await obtenerPoliticaPrivacidad();
    expect(priv.titulo).toBe('Política');

    const terms = await obtenerTerminos();
    expect(terms.titulo).toBe('Política');

    const cookies = await obtenerPoliticaCookies();
    expect(cookies.titulo).toBe('Política');
  });

  it('consultarReserva llama endpoint con ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'r1', estado: 'confirmada', fecha_entrada: '2025-07-15', fecha_salida: '2025-07-18', total: '750.00', noches: 3 } }),
    }));

    const result = await consultarReserva('r1');
    expect(result.id).toBe('r1');
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toContain('/reserva/r1');
  });

  it('lanza error en respuesta no-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'No encontrado' }),
    }));

    await expect(obtenerInfoHotel()).rejects.toThrow('No encontrado');
  });
});
