// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: publico.api.ts
// Verifica llamadas fetch, manejo de errores y tipos de retorno
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockFetchOk(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status = 500, error = 'Error del servidor') {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

describe('publico.api — obtenerInfoHotel', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('llama a /publico/info y retorna data', async () => {
    const { obtenerInfoHotel } = await import('../../services/publico.api');
    mockFetchOk({ data: { nombre: 'HotelFlux', descripcion: 'Luxury', pisos: [], tipos_habitacion: [], servicios: [], contacto: {} } });

    const result = await obtenerInfoHotel();
    expect(result.nombre).toBe('HotelFlux');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/publico/info');
  });

  it('lanza error si la respuesta no es ok', async () => {
    const { obtenerInfoHotel } = await import('../../services/publico.api');
    mockFetchError(503, 'Servicio no disponible');

    await expect(obtenerInfoHotel()).rejects.toThrow('Servicio no disponible');
  });
});

describe('publico.api — buscarDisponibilidad', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('construye query string con fechas correctas', async () => {
    const { buscarDisponibilidad } = await import('../../services/publico.api');
    mockFetchOk({
      data: {
        habitaciones: [],
        total: 0,
        fecha_entrada: '2025-08-01',
        fecha_salida: '2025-08-03',
        noches: 2,
      },
    });

    await buscarDisponibilidad({ fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03' });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/publico/disponibilidad');
    expect(url).toContain('fecha_entrada=2025-08-01');
    expect(url).toContain('fecha_salida=2025-08-03');
  });

  it('incluye tipo y capacidad en query string si se proveen', async () => {
    const { buscarDisponibilidad } = await import('../../services/publico.api');
    mockFetchOk({ data: { habitaciones: [], total: 0, fecha_entrada: '', fecha_salida: '', noches: 0 } });

    await buscarDisponibilidad({ fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', tipo: 'suite', capacidad: 2 });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('tipo=suite');
    expect(url).toContain('capacidad=2');
  });

  it('retorna habitaciones con estructura correcta', async () => {
    const { buscarDisponibilidad } = await import('../../services/publico.api');
    const hab = { id: 'h1', numero: 101, tipo: 'suite', piso: 1, precio_noche: '250.00', clasificacion: null, caracteristicas: null, amenidades: ['wifi'] };
    mockFetchOk({ data: { habitaciones: [hab], total: 1, fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', noches: 2 } });

    const result = await buscarDisponibilidad({ fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03' });
    expect(result.habitaciones).toHaveLength(1);
    expect(result.habitaciones[0]!.tipo).toBe('suite');
    expect(result.noches).toBe(2);
  });

  it('lanza error HTTP con mensaje del servidor', async () => {
    const { buscarDisponibilidad } = await import('../../services/publico.api');
    mockFetchError(422, 'Fechas inválidas');

    await expect(
      buscarDisponibilidad({ fecha_entrada: '2025-01-01', fecha_salida: '2025-01-01' }),
    ).rejects.toThrow('Fechas inválidas');
  });
});

describe('publico.api — crearReservaPublica', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  const datosPrueba = {
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@test.com',
    telefono: '999999999',
    documento: '12345678',
    habitacion_id: 'h1',
    fecha_entrada: '2025-08-01',
    fecha_salida: '2025-08-03',
  };

  it('hace POST a /publico/reservar', async () => {
    const { crearReservaPublica } = await import('../../services/publico.api');
    mockFetchOk({ ok: true, reserva: { id: 'r1', estado: 'pendiente', habitacion_numero: 101, habitacion_tipo: 'suite', fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', total: '500.00', codigo_confirmacion: 'HF-001' } });

    await crearReservaPublica(datosPrueba);

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]! as [string, RequestInit];
    expect(url).toContain('/publico/reservar');
    expect(opts.method).toBe('POST');
  });

  it('retorna reserva con código de confirmación', async () => {
    const { crearReservaPublica } = await import('../../services/publico.api');
    mockFetchOk({ ok: true, reserva: { id: 'r1', estado: 'pendiente', habitacion_numero: 101, habitacion_tipo: 'suite', fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', total: '500.00', codigo_confirmacion: 'HF-ABCD' } });

    const result = await crearReservaPublica(datosPrueba);
    expect(result.codigo_confirmacion).toBe('HF-ABCD');
    expect(result.id).toBe('r1');
  });

  it('serializa el cuerpo como JSON', async () => {
    const { crearReservaPublica } = await import('../../services/publico.api');
    mockFetchOk({ ok: true, reserva: { id: 'r2', estado: 'pendiente', habitacion_numero: 102, habitacion_tipo: 'doble', fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', total: '200.00', codigo_confirmacion: 'HF-002' } });

    await crearReservaPublica(datosPrueba);
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.nombre).toBe('Juan');
    expect(body.habitacion_id).toBe('h1');
  });

  it('lanza error si la reserva falla', async () => {
    const { crearReservaPublica } = await import('../../services/publico.api');
    mockFetchError(409, 'Habitación ya reservada');

    await expect(crearReservaPublica(datosPrueba)).rejects.toThrow('Habitación ya reservada');
  });
});

describe('publico.api — obtenerServicios', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('llama a /publico/servicios y retorna categorías', async () => {
    const { obtenerServicios } = await import('../../services/publico.api');
    const mockServicios = [
      { categoria: 'spa', productos: [{ id: 's1', nombre: 'Masaje', descripcion: null, precio: '80.00' }] },
    ];
    mockFetchOk({ data: mockServicios });

    const result = await obtenerServicios();
    expect(result).toHaveLength(1);
    expect(result[0]!.categoria).toBe('spa');

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/publico/servicios');
  });

  it('retorna array vacío si no hay servicios', async () => {
    const { obtenerServicios } = await import('../../services/publico.api');
    mockFetchOk({ data: [] });

    const result = await obtenerServicios();
    expect(result).toEqual([]);
  });
});

describe('publico.api — obtenerMisReservas (cliente autenticado)', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('pasa el token en el header Authorization', async () => {
    const { obtenerMisReservas } = await import('../../services/publico.api');
    mockFetchOk({ data: [], huesped: null });

    await obtenerMisReservas('mi-jwt-token');

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]! as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer mi-jwt-token');
  });

  it('llama al endpoint /cliente/reservas', async () => {
    const { obtenerMisReservas } = await import('../../services/publico.api');
    mockFetchOk({ data: [], huesped: null });

    await obtenerMisReservas('token');

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/cliente/reservas');
  });

  it('retorna lista de reservas del cliente en data', async () => {
    const { obtenerMisReservas } = await import('../../services/publico.api');
    const mockReservas = [
      { id: 'r1', codigo: 'HF-001', habitacion: 'Suite 301', tipo: 'suite', piso: 3, estado: 'confirmada', fecha_entrada: '2025-08-01', fecha_salida: '2025-08-03', total: '500.00', notas: null, inserted_at: '2025-07-01T00:00:00Z' },
    ];
    mockFetchOk({ data: mockReservas, huesped: null });

    const result = await obtenerMisReservas('token');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.codigo).toBe('HF-001');
  });

  it('lanza SESSION_EXPIRED si el token es inválido (401)', async () => {
    const { obtenerMisReservas } = await import('../../services/publico.api');
    mockFetchError(401, 'No autorizado');

    await expect(obtenerMisReservas('token-invalido')).rejects.toThrow('SESSION_EXPIRED');
  });
});
