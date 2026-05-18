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

// ── useAuth ──

describe('Unit / useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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
      token: 'jwt-test-123',
      usuario: { id: 'u1', email: 'test@test.com', nombre: 'Test', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
    };

    act(() => result.current.login(resp));
    expect(result.current.token).toBe('jwt-test-123');
    expect(result.current.usuario?.nombre).toBe('Test');
    expect(localStorage.getItem('hotelflux_token')).toBe('jwt-test-123');
  });

  it('logout limpia estado y localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const resp: AuthResponse = {
      token: 'jwt-test-123',
      usuario: { id: 'u1', email: 'test@test.com', nombre: 'Test', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
    };

    act(() => result.current.login(resp));
    act(() => result.current.logout());
    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
    expect(localStorage.getItem('hotelflux_token')).toBeNull();
  });

  it('restaura sesión desde localStorage', () => {
    localStorage.setItem('hotelflux_token', 'saved-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u2', email: 'saved@test.com', nombre: 'Saved', rol: 'recepcionista', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.token).toBe('saved-token');
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
