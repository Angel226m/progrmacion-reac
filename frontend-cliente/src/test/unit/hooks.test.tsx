// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Hooks (Unit)
// useAuth, useObservable (sin API real)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { useObservable, useObservableWithStatus } from '../../hooks/useObservable';
import type { AuthResponse } from '../../domain/types';

const VALID_TOKEN = (globalThis as any).makeTestToken();

// ── useAuth ──

describe('Unit / useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // AuthProvider calls fetch on mount — provide a fast-failing mock
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'no session' }),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('estado inicial sin sesión', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('login guarda token y usuario', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const resp: AuthResponse = {
      token: VALID_TOKEN,
      usuario: { id: 'u1', email: 'test@test.com', nombre: 'Test', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
    };

    act(() => result.current.login(resp));
    expect(result.current.token).toBe(VALID_TOKEN);
    expect(result.current.usuario?.nombre).toBe('Test');
  });

  it('logout limpia estado', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const resp: AuthResponse = {
      token: VALID_TOKEN,
      usuario: { id: 'u1', email: 'test@test.com', nombre: 'Test', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
    };

    act(() => result.current.login(resp));
    act(() => result.current.logout());
    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('restaura sesión desde API (auth/renovar)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: VALID_TOKEN,
        usuario: { id: 'u2', email: 'saved@test.com', nombre: 'Saved', rol: 'recepcionista', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.token).toBe(VALID_TOKEN);
    });
    expect(result.current.usuario?.email).toBe('saved@test.com');
  });

  it('lanza error si se usa fuera de AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe usarse dentro de AuthProvider');
  });
});

// ── useObservable ──

describe('Unit / useObservable', () => {
  it('devuelve valor por defecto cuando no hay observable', () => {
    const { result } = renderHook(() => useObservable(null, 'default'));
    expect(result.current).toBe('default');
  });

  it('recibe valor de BehaviorSubject', () => {
    const subj = new BehaviorSubject<number>(42);
    const { result } = renderHook(() => useObservable(subj, 0));
    expect(result.current).toBe(42);
  });

  it('se actualiza al emitir nuevos valores', () => {
    const subj = new Subject<string>();
    const { result } = renderHook(() => useObservable(subj, ''));
    act(() => subj.next('hello'));
    expect(result.current).toBe('hello');
  });
});

describe('Unit / useObservableWithStatus', () => {
  it('devuelve loading: true inicialmente con Subject', () => {
    const subj = new Subject<number>();
    const { result } = renderHook(() => useObservableWithStatus(subj, 0));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(0);
  });

  it('actualiza data cuando emite', () => {
    const subj = new BehaviorSubject<string>('data!');
    const { result } = renderHook(() => useObservableWithStatus(subj, ''));
    expect(result.current.data).toBe('data!');
    expect(result.current.loading).toBe(false);
  });
});
