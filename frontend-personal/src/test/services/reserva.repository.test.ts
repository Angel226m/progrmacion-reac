// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: ReservaObservableRepository (frontend-personal)
//
// Verifica el repositorio observable de reservas del panel de personal.
// El personal staff tiene acceso amplio a todas las reservas del hotel.
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest';
import { firstValueFrom, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import type { Reserva } from '../../domain/entidades/reserva';

// ── Mocks de infraestructura ─────────────────────────────

vi.mock('../../streams/websocket.stream', () => ({
  getSocket: vi.fn(() => ({} as unknown)),
  createMultiEventStream: vi.fn(() => new Subject<never>()),
}));

import { ReservaObservableRepository } from '../../services/repositories/reserva.repository';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const reservaBase: Reserva = {
  id: 'rp1',
  habitacion_id: 'h2',
  huesped_id: 'gu2',
  fecha_entrada: '2024-11-10',
  fecha_salida: '2024-11-15',
  estado: 'confirmada',
  total: 600,
};

function mockFetchOk(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  });
}

function mockFetchError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));
}

const TOKEN = 'personal-jwt-token';

// ─────────────────────────────────────────────────────────

describe('ReservaObservableRepository (personal) — listar$()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emite ok() con lista cuando la API responde correctamente', async () => {
    mockFetchOk({ reservas: [reservaBase] });

    const repo = new ReservaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('maneja errores de red emitiendo lista vacía (defensive)', async () => {
    mockFetchError();

    const repo = new ReservaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    // El repositorio silencia el error inicial y emite lista vacía
    expect(result.ok).toBe(true);
  });

  it('el stream es un Observable (hot con shareReplay)', () => {
    mockFetchOk({ reservas: [] });

    const repo = new ReservaObservableRepository(TOKEN);
    const stream$ = repo.listar$();

    expect(stream$).toBeDefined();
    expect(typeof stream$.subscribe).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────
// crear() — POST a la API
// ─────────────────────────────────────────────────────────

describe('ReservaObservableRepository (personal) — crear()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('invoca fetch con el método POST y Authorization header', async () => {
    mockFetchOk({ reservas: [] });

    const repo = new ReservaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, reserva: reservaBase }),
    });

    await repo.crear({
      habitacion_id: 'h2',
      huesped_id: 'gu2',
      fecha_entrada: '2024-11-10',
      fecha_salida: '2024-11-15',
    });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method?.toUpperCase()).toBe('POST');
    expect((options.headers as Record<string, string>)['Authorization']).toContain(TOKEN);
  });

  it('retorna ok() con la reserva creada', async () => {
    mockFetchOk({ reservas: [] });

    const repo = new ReservaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, reserva: reservaBase }),
    });

    const result = await repo.crear({
      habitacion_id: 'h2',
      huesped_id: 'gu2',
      fecha_entrada: '2024-11-10',
      fecha_salida: '2024-11-15',
    });

    expect(result.ok).toBe(true);
  });

  it('retorna err() cuando la API responde con error', async () => {
    mockFetchOk({ reservas: [] });

    const repo = new ReservaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ errors: { habitacion_id: ['no disponible'] } }),
    });

    const result = await repo.crear({
      habitacion_id: 'h2',
      huesped_id: 'gu2',
      fecha_entrada: '2024-11-10',
      fecha_salida: '2024-11-15',
    });

    expect(result.ok).toBe(false);
  });
});
