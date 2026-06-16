import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import type { AuthResponse } from '../../domain/types';
import type { ReactNode } from 'react';

const VALID_TOKEN = (globalThis as any).makeTestToken();

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('identity/auth', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: 'No session' }),
    } as unknown as Response)) as unknown as typeof globalThis.fetch;
  });

  it('estado inicial sin autenticación', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('login guarda token y usuario en estado', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockResponse: AuthResponse = {
      token: VALID_TOKEN,
      usuario: {
        id: 'u-1',
        nombre: 'Admin Test',
        email: 'admin@test.com',
        rol: 'admin',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      },
    };

    act(() => {
      result.current.login(mockResponse);
    });

    expect(result.current.token).toBe(VALID_TOKEN);
    expect(result.current.usuario?.nombre).toBe('Admin Test');
    expect(result.current.usuario?.rol).toBe('admin');
  });

  it('logout limpia estado', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login({
        token: VALID_TOKEN,
        usuario: {
          id: 'u-1',
          nombre: 'Test',
          email: 'test@test.com',
          rol: 'recepcionista',
          activo: true,
          inserted_at: '2025-01-01T00:00:00Z',
        },
      });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('restaura sesión desde API (auth/renovar) al montar', async () => {
    const mockSession = {
      token: VALID_TOKEN,
      usuario: {
        id: 'u-2',
        nombre: 'Persisted User',
        email: 'persisted@test.com',
        rol: 'limpieza',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      },
    };

    globalThis.fetch = vi.fn((url: string) => {
      if (url.includes('/auth/renovar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSession),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as unknown as Response);
    }) as unknown as typeof globalThis.fetch;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.token).toBe(VALID_TOKEN);
    });

    expect(result.current.usuario?.nombre).toBe('Persisted User');
    expect(result.current.usuario?.rol).toBe('limpieza');
  });

  it('lanza error si se usa fuera de AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe usarse dentro de AuthProvider');
  });
});