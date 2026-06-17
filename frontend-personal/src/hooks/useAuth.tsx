// ═══════════════════════════════════════════════════════════
// HotelFlux — useAuth Hook (estado de autenticación)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
import type { Usuario, AuthResponse } from '../domain/types';
import { invalidateRepositories } from '../services/repositories';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface AuthState {
  readonly token: string | null;
  readonly usuario: Usuario | null;
  readonly loading: boolean;
  readonly login: (resp: AuthResponse) => void;
  readonly logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Flag global para evitar múltiples intentos de restauración simultáneos
let restoring = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const restoredRef = useRef(false);

  // Restaurar sesión desde la cookie httpOnly al cargar la página.
  // Solo se ejecuta una vez, antes de que el usuario interactúe.
  useEffect(() => {
    if (restoredRef.current || restoring) return;
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

  const login = useCallback((resp: AuthResponse) => {
    setToken(resp.token);
    setUsuario(resp.usuario);
  }, []);

  const logout = useCallback(() => {
    if (token) {
      const doLogout = async () => {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      };
      doLogout().catch(() => {});
    }
    invalidateRepositories();
    setToken(null);
    setUsuario(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
