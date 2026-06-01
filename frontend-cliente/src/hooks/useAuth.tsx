// ═══════════════════════════════════════════════════════════
// HotelFlux — useAuth Hook (estado de autenticación + JWT refresh)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Usuario, AuthResponse } from '../domain/types';
import { invalidateRepositories } from '../services/repositories';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// Margin in ms before expiry to trigger refresh (2 minutes)
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

/** Parse JWT payload without verifying signature (browser only) */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    // Base64url → Base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns ms until token expires, or 0 if already expired */
function msUntilExpiry(token: string): number {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') return 0;
  return payload['exp'] * 1000 - Date.now();
}

interface AuthState {
  readonly token: string | null;
  readonly usuario: Usuario | null;
  readonly login: (resp: AuthResponse) => void;
  readonly logout: () => void;
  /** Manually trigger a token refresh; resolves with the new token or null */
  readonly refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('hotelflux_token');
    if (stored?.startsWith('mock-')) {
      localStorage.removeItem('hotelflux_token');
      localStorage.removeItem('hotelflux_usuario');
      return null;
    }
    return stored;
  });
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const tokenStored = localStorage.getItem('hotelflux_token');
    if (tokenStored?.startsWith('mock-')) return null;
    const stored = localStorage.getItem('hotelflux_usuario');
    return stored ? (JSON.parse(stored) as Usuario) : null;
  });

  // Ref so refresh callback always sees latest token
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('hotelflux_token');
    localStorage.removeItem('hotelflux_usuario');
    invalidateRepositories();
    setToken(null);
    setUsuario(null);
  }, []);

  const login = useCallback((resp: AuthResponse) => {
    localStorage.setItem('hotelflux_token', resp.token);
    localStorage.setItem('hotelflux_usuario', JSON.stringify(resp.usuario));
    setToken(resp.token);
    setUsuario(resp.usuario);
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const current = tokenRef.current;
    if (!current) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/renovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current}`,
        },
      });
      if (!res.ok) { logout(); return null; }
      const data = await res.json() as { token: string; usuario: Usuario };
      localStorage.setItem('hotelflux_token', data.token);
      localStorage.setItem('hotelflux_usuario', JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
      return data.token;
    } catch {
      // Network error — don't logout, just return null
      return null;
    }
  }, [logout]);

  // ── Auto-refresh timer ──
  useEffect(() => {
    if (!token) return;
    const remaining = msUntilExpiry(token);
    if (remaining <= 0) { logout(); return; }

    const delay = Math.max(remaining - REFRESH_MARGIN_MS, 0);
    const id = window.setTimeout(() => {
      refreshToken().catch(() => logout());
    }, delay);
    return () => clearTimeout(id);
  }, [token, refreshToken, logout]);

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
