import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
import type { Usuario, AuthResponse } from '../domain/types';
import { invalidateRepositories } from '../services/repositories';
import { fromPromise } from '../domain/result';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface AuthState {
  readonly token: string | null;
  readonly usuario: Usuario | null;
  readonly loading: boolean;
  readonly login: (resp: AuthResponse) => void;
  readonly logout: () => void;
  readonly refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

let restoring = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const restoredRef = useRef(false);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    const skip = restoredRef.current || restoring;
    if (skip) return;
    restoring = true;
    restoredRef.current = true;

    const handleRestore = async () => {
      const res = await fetch(`${API_BASE}/auth/renovar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json() as { token: string; usuario: Usuario };
        setToken(data.token);
        setUsuario(data.usuario);
      }
    };

    handleRestore().finally(() => { restoring = false; setLoading(false); });
  }, []);

  const doLogout = useCallback(async (tok: string) => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    });
  }, []);

  const logout = useCallback(() => {
    const tok = tokenRef.current;
    if (tok) fromPromise(doLogout(tok), () => null);
    invalidateRepositories();
    setToken(null);
    setUsuario(null);
  }, [doLogout]);

  const login = useCallback((resp: AuthResponse) => {
    setToken(resp.token);
    setUsuario(resp.usuario);
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const current = tokenRef.current;
    if (!current) return null;

    const result = await fromPromise(
      fetch(`${API_BASE}/auth/renovar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current}` },
      }).then((res) =>
        res.ok
          ? (res.json() as Promise<{ token: string; usuario: Usuario }>).then((data) => {
              setToken(data.token);
              setUsuario(data.usuario);
              return data.token;
            })
          : Promise.reject(null),
      ),
      () => null as string | null,
    );

    return result.ok ? result.value : null;
  }, []);

  useEffect(() => {
    const tok = token;
    if (!tok) return;

    const remaining = msUntilExpiry(tok);
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
  return ctx ?? (() => { throw new Error('useAuth debe usarse dentro de AuthProvider'); })();
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    return !payload
      ? null
      : JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function msUntilExpiry(token: string): number {
  const payload = parseJwtPayload(token);
  return !payload || typeof payload['exp'] !== 'number'
    ? 0
    : payload['exp'] * 1000 - Date.now();
}
