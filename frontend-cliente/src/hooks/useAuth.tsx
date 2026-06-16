// ═══════════════════════════════════════════════════════════
// HotelFlux — useAuth Hook (estado de autenticación + JWT refresh)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Usuario, AuthResponse } from '../domain/types';
import { invalidateRepositories } from '../services/repositories';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Margin in ms before expiry to trigger refresh (2 minutes)
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

/** Parse JWT payload without verifying signature (browser only) */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
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
  readonly loading: boolean;
  readonly login: (resp: AuthResponse) => void;
  readonly logout: () => void;
  readonly refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

// Flag global para evitar múltiples restauraciones de sesión en paralelo
let restoring = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const restoredRef = useRef(false);

  // Ref so refresh callback always sees latest token
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Restaurar sesión desde la cookie httpOnly al cargar la página.
  useEffect(() => {
    if (restoredRef.current || restoring) return;
    restoring = true;
    restoredRef.current = true;

    fetch(`${API_BASE}/auth/renovar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No session');
        return res.json() as Promise<{ token: string; usuario: Usuario }>;
      })
      .then((data) => {
        setToken(data.token);
        setUsuario(data.usuario);
      })
      .catch(() => {})
      .finally(() => { restoring = false; setLoading(false); });
  }, []);

  const logout = useCallback(() => {
    // Llamar al backend para revocar token
    if (tokenRef.current) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
      }).catch(() => {});
    }
    invalidateRepositories();
    setToken(null);
    setUsuario(null);
  }, []);

  const login = useCallback((resp: AuthResponse) => {
    setToken(resp.token);
    setUsuario(resp.usuario);
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const current = tokenRef.current;
    if (!current) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/renovar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current}`,
        },
      });
      if (!res.ok) { logout(); return null; }
      const data = await res.json() as { token: string; usuario: Usuario };
      setToken(data.token);
      setUsuario(data.usuario);
      return data.token;
    } catch {
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
    <AuthContext.Provider value={{ token, usuario, loading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
