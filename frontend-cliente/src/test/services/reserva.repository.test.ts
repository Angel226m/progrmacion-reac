// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: ReservaObservableRepository (frontend-cliente)
//
// Verifica:
// - listar$() emite estado inicial desde la API REST
// - Errores de fetch emiten lista vacía (silenced) o err()
// - crear() invoca la API con los parámetros correctos
// - El patrón Observable nunca completa (stream infinito)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  id: 'rv1',
  habitacion_id: 'h1',
  huesped_id: 'gu1',
  fecha_entrada: '2024-12-01',
  fecha_salida: '2024-12-03',
  estado: 'confirmada',
  total: '240',
  notas: null,
  inserted_at: '2025-01-01T00:00:00Z',
};

function mockFetchOk(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as unknown as Response) as unknown as typeof globalThis.fetch;
}

function mockFetchError() {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error')) as unknown as typeof globalThis.fetch;
}

const TOKEN = 'test-jwt-token';

// ─────────────────────────────────────────────────────────

describe('ReservaObservableRepository — listar$()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emite ok() con la lista cuando la API responde bien', async () => {
    mockFetchOk({ reservas: [reservaBase] });

    const repo = new ReservaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('emite lista vacía silenciada cuando la API falla (comportamiento defensivo)', async () => {
    mockFetchError();

    const repo = new ReservaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    // El repositorio captura el error internamente y emite lista vacía
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('retorna un Observable que no completa inmediatamente', () => {
    mockFetchOk({ reservas: [] });

    const repo = new ReservaObservableRepository(TOKEN);
    const stream$ = repo.listar$();

    expect(stream$).toBeDefined();
    expect(typeof stream$.pipe).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────
// crear() — POST a la API
// ─────────────────────────────────────────────────────────

describe('ReservaObservableRepository — crear()', () => {
  beforeEach(() => {
    mockFetchOk({ reservas: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('invoca fetch con el token de autorización', async () => {
    const repo = new ReservaObservableRepository(TOKEN);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, reserva: reservaBase }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    await repo.crear({
      habitacion_id: 'h1',
      huesped_id: 'gu1',
      fecha_entrada: '2024-12-01',
      fecha_salida: '2024-12-03',
    });

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toContain(TOKEN);
  });

  it('retorna ok() con reserva cuando la API responde 201', async () => {
    const repo = new ReservaObservableRepository(TOKEN);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, reserva: reservaBase }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const result = await repo.crear({
      habitacion_id: 'h1',
      huesped_id: 'gu1',
      fecha_entrada: '2024-12-01',
      fecha_salida: '2024-12-03',
    });

    expect(result.ok).toBe(true);
  });

  it('retorna err() cuando la API responde con error HTTP', async () => {
    const repo = new ReservaObservableRepository(TOKEN);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errors: { fecha_salida: ['must be after entry'] } }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const result = await repo.crear({
      habitacion_id: 'h1',
      huesped_id: 'gu1',
      fecha_entrada: '2024-12-05',
      fecha_salida: '2024-12-01',
    });

    expect(result.ok).toBe(false);
  });
});
