import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import type { AuthResponse } from '../../domain/types';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('identity/auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('estado inicial sin autenticación', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('login guarda token y usuario en estado y localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

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
    expect(localStorage.getItem('hotelflux_token')).toBe('jwt-test-token-123');
    expect(localStorage.getItem('hotelflux_usuario')).toContain('Admin Test');
  });

  it('logout limpia estado y localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

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
    expect(localStorage.getItem('hotelflux_token')).toBeNull();
    expect(localStorage.getItem('hotelflux_usuario')).toBeNull();
  });

  it('restaura sesión desde localStorage al montar', () => {
    localStorage.setItem('hotelflux_token', 'persisted-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u-2',
      nombre: 'Persisted User',
      email: 'persisted@test.com',
      rol: 'limpieza',
      activo: true,
      inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe('persisted-token');
    expect(result.current.usuario?.nombre).toBe('Persisted User');
    expect(result.current.usuario?.rol).toBe('limpieza');
  });

  it('lanza error si se usa fuera de AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe usarse dentro de AuthProvider');
  });
});