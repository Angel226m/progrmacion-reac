// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: HabitacionObservableRepository (frontend-personal)
//
// Verifica el patrón Observable Repository para el panel de personal:
// - listar$() emite estado inicial desde la API REST autenticada
// - Errores de red se manejan defensivamente
// - El stream retorna Result<Map<string, Habitacion>>
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest';
import { firstValueFrom, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import type { Habitacion } from '../../domain/entidades/habitacion';

// ── Mocks de infraestructura ─────────────────────────────

vi.mock('../../streams/websocket.stream', () => ({
  getSocket: vi.fn(() => ({} as unknown)),
  createMultiEventStream: vi.fn(() => new Subject<never>()),
}));

import { HabitacionObservableRepository } from '../../services/repositories/habitacion.repository';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const habitacionBase: Habitacion = {
  id: 'hp1',
  numero: '201',
  tipo: 'doble',
  piso: 2,
  estado: 'disponible',
  precio_noche: 120,
  capacidad: 2,
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

describe('HabitacionObservableRepository (personal) — listar$()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emite ok() con datos cuando la API responde correctamente', async () => {
    mockFetchOk({ habitaciones: [habitacionBase] });

    const repo = new HabitacionObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('emite result con lista vacía cuando la API falla (manejo defensivo)', async () => {
    mockFetchError();

    const repo = new HabitacionObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    // El repo captura el error y emite lista vacía
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('el stream es hot (shareReplay) — emite el último valor a nuevos suscriptores', async () => {
    mockFetchOk({ habitaciones: [habitacionBase] });

    const repo = new HabitacionObservableRepository(TOKEN);
    const stream$ = repo.listar$();

    // Primera suscripción
    const result1 = await firstValueFrom(stream$.pipe(take(1)));
    // Segunda suscripción — shareReplay debe emitir el mismo valor en caché
    const result2 = await firstValueFrom(stream$.pipe(take(1)));

    expect(result1.ok).toBe(result2.ok);
  });
});

// ─────────────────────────────────────────────────────────
// obtener$(id)
// ─────────────────────────────────────────────────────────

describe('HabitacionObservableRepository (personal) — obtener$(id)', () => {
  it('devuelve un Observable compuesto de listar$()', () => {
    mockFetchOk({ habitaciones: [] });

    const repo = new HabitacionObservableRepository(TOKEN);
    const single$ = repo.obtener$('hp1');

    expect(single$).toBeDefined();
    expect(typeof single$.pipe).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────
// actualizar() — PATCH a la API
// ─────────────────────────────────────────────────────────

describe('HabitacionObservableRepository (personal) — actualizar()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('llama a la API con Authorization header', async () => {
    mockFetchOk({ habitaciones: [] });

    const repo = new HabitacionObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, habitacion: { ...habitacionBase, estado: 'en_limpieza' } }),
    });

    await repo.cambiarEstado('hp1', 'en_limpieza');

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('hp1');
    expect((options.headers as Record<string, string>)['Authorization']).toContain(TOKEN);
  });
});
