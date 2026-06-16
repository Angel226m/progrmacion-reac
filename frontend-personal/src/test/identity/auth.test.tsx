import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import type { AuthResponse } from '../../domain/types';
import type { ReactNode } from 'react';

function createFetchMock(overrides: Record<string, Response> = {}) {
  return vi.fn((url: string | URL | Request) => {
    const key = url.toString();
    if (overrides[key]) return Promise.resolve(overrides[key]!);
    if (key.includes('/auth/renovar')) return Promise.resolve({ ok: false } as Response);
    if (key.includes('/auth/logout')) return Promise.resolve({ ok: true } as Response);
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('identity/auth', () => {
  beforeEach(() => {
    globalThis.fetch = createFetchMock();
  });

  it('estado inicial sin autenticación', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('login guarda token y usuario en estado', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const mockResponse: AuthResponse = {
      token: 'jwt-test-token-123',
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

    expect(result.current.token).toBe('jwt-test-token-123');
    expect(result.current.usuario?.nombre).toBe('Admin Test');
    expect(result.current.usuario?.rol).toBe('admin');
  });

  it('logout limpia estado', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.login({
        token: 'test-token',
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

  it('restaura sesión desde API al montar', async () => {
    globalThis.fetch = createFetchMock({
      '/api/v1/auth/renovar': {
        ok: true,
        json: () => Promise.resolve({
          token: 'persisted-token',
          usuario: {
            id: 'u-2',
            nombre: 'Persisted User',
            email: 'persisted@test.com',
            rol: 'limpieza',
            activo: true,
            inserted_at: '2025-01-01T00:00:00Z',
          },
        }),
      } as Response,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.token).toBe('persisted-token');
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