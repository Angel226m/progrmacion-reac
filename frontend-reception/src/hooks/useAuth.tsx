// ═══════════════════════════════════════════════════════════
// HotelFlux — useAuth Hook (estado de autenticación)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { Usuario, AuthResponse } from '../domain/types';
import { invalidateRepositories } from '../services/repositories';

interface AuthState {
  readonly token: string | null;
  readonly usuario: Usuario | null;
  readonly login: (resp: AuthResponse) => void;
  readonly logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('hotelflux_token'),
  );
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem('hotelflux_usuario');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((resp: AuthResponse) => {
    localStorage.setItem('hotelflux_token', resp.token);
    localStorage.setItem('hotelflux_usuario', JSON.stringify(resp.usuario));
    setToken(resp.token);
    setUsuario(resp.usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hotelflux_token');
    localStorage.removeItem('hotelflux_usuario');
    invalidateRepositories();
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
