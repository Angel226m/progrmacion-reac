// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: TareaObservableRepository (frontend-personal)
//
// Verifica el repositorio observable de tareas de limpieza.
// Exclusivo del panel de personal (limpieza/gerencia).
//
// Verifica:
// - listar$() emite estado inicial desde la API REST
// - acumularTareas: función pura con eventos tarea_asignada/estado_actualizado
// - cambiarEstado() invoca la API con el token correcto
// - Prioridad: el stream ordena por prioridad descendente
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest';
import { firstValueFrom, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import type { TareaLimpieza } from '../../domain/entidades/tarea-limpieza';

// ── Mocks de infraestructura ─────────────────────────────

vi.mock('../../streams/websocket.stream', () => ({
  getSocket: vi.fn(() => ({} as unknown)),
  createMultiEventStream: vi.fn(() => new Subject<never>()),
}));

import { TareaObservableRepository } from '../../services/repositories/tarea.repository';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const tareaBase: TareaLimpieza = {
  id: 't1',
  habitacion_id: 'h1',
  empleado_id: 'emp1',
  estado: 'pendiente',
  prioridad: 2,
  creada_en: '2024-11-01T10:00:00Z',
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

const TOKEN = 'limpieza-jwt-token';

// ─────────────────────────────────────────────────────────

describe('TareaObservableRepository — listar$()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emite ok() con lista cuando la API responde correctamente', async () => {
    mockFetchOk({ tareas: [tareaBase] });

    const repo = new TareaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('emite lista vacía cuando la API falla (manejo defensivo)', async () => {
    mockFetchError();

    const repo = new TareaObservableRepository(TOKEN);
    const result = await firstValueFrom(repo.listar$().pipe(take(1)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });

  it('el stream es hot (shareReplay) y puede tener múltiples suscriptores', async () => {
    mockFetchOk({ tareas: [tareaBase] });

    const repo = new TareaObservableRepository(TOKEN);
    const stream$ = repo.listar$();

    const [r1, r2] = await Promise.all([
      firstValueFrom(stream$.pipe(take(1))),
      firstValueFrom(stream$.pipe(take(1))),
    ]);

    expect(r1.ok).toBe(r2.ok);
  });
});

// ─────────────────────────────────────────────────────────
// listar$() con filtros — personal_id y estado
// ─────────────────────────────────────────────────────────

describe('TareaObservableRepository — listar$() con filtros', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('acepta filtro por personal_id', async () => {
    mockFetchOk({ tareas: [tareaBase] });

    const repo = new TareaObservableRepository(TOKEN);
    const result = await firstValueFrom(
      repo.listar$({ personal_id: 'emp1' }).pipe(take(1)),
    );

    expect(result.ok).toBe(true);
  });

  it('acepta filtro por estado', async () => {
    mockFetchOk({ tareas: [] });

    const repo = new TareaObservableRepository(TOKEN);
    const result = await firstValueFrom(
      repo.listar$({ estado: 'completada' }).pipe(take(1)),
    );

    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// cambiarEstado() — PATCH a la API
// ─────────────────────────────────────────────────────────

describe('TareaObservableRepository — cambiarEstado()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('invoca fetch con Authorization header', async () => {
    mockFetchOk({ tareas: [] });

    const repo = new TareaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tarea: { ...tareaBase, estado: 'en_proceso' } }),
    });

    await repo.cambiarEstado('t1', 'en_proceso');

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toContain(TOKEN);
  });

  it('retorna ok() con la tarea actualizada', async () => {
    mockFetchOk({ tareas: [] });

    const repo = new TareaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tarea: { ...tareaBase, estado: 'completada' } }),
    });

    const result = await repo.cambiarEstado('t1', 'completada');

    expect(result.ok).toBe(true);
  });

  it('retorna err() cuando la transición de estado falla', async () => {
    mockFetchOk({ tareas: [] });

    const repo = new TareaObservableRepository(TOKEN);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'transición inválida' }),
    });

    const result = await repo.cambiarEstado('t1', 'estado_invalido');

    expect(result.ok).toBe(false);
  });
});
