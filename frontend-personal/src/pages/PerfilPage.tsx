// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Perfil de Usuario
// Visualizar, editar datos y cambiar contraseña
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

interface FormPerfil {
  nombre: string;
  email: string;
}

interface FormPassword {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirm: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function authFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({ error: 'Error de conexión' }));
  if (!res.ok) throw new Error(body.error || body.errors?.toString() || `Error ${res.status}`);
  return body;
}

export default function PerfilPage() {
  const { usuario, token } = useAuth();
  const [tab, setTab] = useState<'datos' | 'password'>('datos');

  // Form state — datos personales
  const [perfil, setPerfil] = useState<FormPerfil>({
    nombre: usuario?.nombre ?? '',
    email: usuario?.email ?? '',
  });
  const [perfilMsg, setPerfilMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);

  // Form state — contraseña
  const [password, setPassword] = useState<FormPassword>({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirm: '',
  });
  const [passMsg, setPassMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const handleGuardarPerfil = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setPerfilMsg(null);
    setPerfilLoading(true);

    try {
      const res = await authFetch('/auth/perfil', token, {
        method: 'PUT',
        body: JSON.stringify({ nombre: perfil.nombre, email: perfil.email }),
      });
      setPerfilMsg({ tipo: 'ok', texto: 'Perfil actualizado correctamente' });
      if (res.usuario) {
        setPerfil({ nombre: res.usuario.nombre, email: res.usuario.email });
      }
    } catch (err) {
      setPerfilMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al actualizar' });
    } finally {
      setPerfilLoading(false);
    }
  }, [perfil, token]);

  const handleCambiarPassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setPassMsg(null);

    if (password.passwordNueva !== password.passwordConfirm) {
      setPassMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden' });
      return;
    }

    if (password.passwordNueva.length < 8) {
      setPassMsg({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    if (!/[A-Z]/.test(password.passwordNueva)) {
      setPassMsg({ tipo: 'error', texto: 'La contraseña debe contener al menos una mayúscula' });
      return;
    }

    if (!/[0-9]/.test(password.passwordNueva)) {
      setPassMsg({ tipo: 'error', texto: 'La contraseña debe contener al menos un número' });
      return;
    }

    setPassLoading(true);

    try {
      await authFetch('/auth/cambiar-password', token, {
        method: 'PUT',
        body: JSON.stringify({
          password_actual: password.passwordActual,
          password_nueva: password.passwordNueva,
        }),
      });
      setPassMsg({ tipo: 'ok', texto: 'Contraseña actualizada. Inicie sesión nuevamente.' });
      setPassword({ passwordActual: '', passwordNueva: '', passwordConfirm: '' });
    } catch (err) {
      setPassMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al cambiar contraseña' });
    } finally {
      setPassLoading(false);
    }
  }, [password, token]);

  if (!usuario) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Debe iniciar sesión para ver su perfil.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      {/* Info card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{usuario.nombre}</h2>
            <p className="text-sm text-gray-500">{usuario.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              usuario.rol === 'admin' ? 'bg-red-100 text-red-700' :
              usuario.rol === 'recepcionista' ? 'bg-blue-100 text-blue-700' :
              usuario.rol === 'limpieza' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {usuario.rol}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('datos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'datos'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Datos Personales
        </button>
        <button
          onClick={() => setTab('password')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'password'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Cambiar Contraseña
        </button>
      </div>

      {/* Tab: Datos Personales */}
      {tab === 'datos' && (
        <form onSubmit={handleGuardarPerfil} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={perfil.nombre}
              onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={perfil.email}
              onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="text-sm text-gray-500">
            <strong>Rol:</strong> {usuario.rol} — <strong>Estado:</strong> {usuario.activo ? 'Activo' : 'Inactivo'}
          </div>

          {perfilMsg && (
            <div className={`p-3 rounded-lg text-sm ${perfilMsg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {perfilMsg.texto}
            </div>
          )}

          <button
            type="submit"
            disabled={perfilLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {perfilLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      )}

      {/* Tab: Cambiar Contraseña */}
      {tab === 'password' && (
        <form onSubmit={handleCambiarPassword} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={password.passwordActual}
              onChange={e => setPassword(p => ({ ...p, passwordActual: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password.passwordNueva}
              onChange={e => setPassword(p => ({ ...p, passwordNueva: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, una mayúscula y un número</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={password.passwordConfirm}
              onChange={e => setPassword(p => ({ ...p, passwordConfirm: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {passMsg && (
            <div className={`p-3 rounded-lg text-sm ${passMsg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {passMsg.texto}
            </div>
          )}

          <button
            type="submit"
            disabled={passLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
          >
            {passLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
