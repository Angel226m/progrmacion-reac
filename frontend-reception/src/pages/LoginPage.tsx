// ═══════════════════════════════════════════════════════════
// HotelFlux — Login Page (Premium UI)
// Formulario de autenticación + redirección por rol
// Fallback: funciona sin API usando datos simulados
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, isOfflineMode } from '../services/api';
import { rutaPorRol } from '../App';
import { IconLive, IconShield, IconBuilding, IconTools, IconCrown, IconOffline, IconGlobe } from '../components/shared/Icons';
import type { ReactNode } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const resp = await auth.login({ email, password });
        login(resp);
        setOffline(isOfflineMode());
        const destino = rutaPorRol[resp.usuario.rol] ?? '/';
        navigate(destino, { replace: true });
      } catch (err) {
        setOffline(isOfflineMode());
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      } finally {
        setLoading(false);
      }
    },
    [email, password, login, navigate],
  );

  const quickLogin = useCallback(
    (correo: string, pass: string) => {
      setEmail(correo);
      setPassword(pass);
    },
    [],
  );

  return (
    <div className="flex min-h-screen">
      {/* ── Panel visual izquierdo ── */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800" />
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="800" fill="url(#grid)" />
          </svg>
        </div>
        {/* Círculos de luz decorativos */}
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-12">
          {/* Logo grande */}
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-2xl shadow-amber-500/20">
            <span className="text-5xl font-black text-blue-950">H</span>
          </div>
          <h1 className="mb-3 text-center text-5xl font-extrabold tracking-tight text-white">
            HotelFlux
          </h1>
          <p className="mb-6 text-center text-lg font-light text-blue-200/80">
            Sistema de Gestión Hotelera
          </p>
          <div className="flex items-center gap-3 rounded-full bg-white/5 px-5 py-2.5 backdrop-blur-sm ring-1 ring-white/10">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-blue-200">Funcional & Reactivo</span>
          </div>

          {/* Features */}
          <div className="mt-12 max-w-sm space-y-4">
            {[
              { icon: <IconShield size={20} className="text-blue-300" />, text: 'Arquitectura CQRS + Event Sourcing' },
              { icon: <IconLive size={20} className="text-blue-300" />, text: 'Datos en tiempo real — RxJS + WebSocket' },
              { icon: <IconBuilding size={20} className="text-blue-300" />, text: 'Clean Architecture + Saga Pattern' },
              { icon: <IconShield size={20} className="text-blue-300" />, text: 'Backend Elixir/Phoenix — Inmutabilidad' },
            ].map((feat: { icon: ReactNode; text: string }) => (
              <div
                key={feat.text}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm ring-1 ring-white/5"
              >
                {feat.icon}
                <span className="text-sm text-blue-100/90">{feat.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel de login derecho ── */}
      <div className="flex w-full flex-col justify-center bg-gradient-to-b from-slate-50 to-white px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo móvil */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/20">
              <span className="text-3xl font-black text-blue-950">H</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">HotelFlux</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido de vuelta</h2>
            <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Offline mode badge */}
          {offline && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 animate-fade-in">
              <IconOffline size={18} />
              <div>
                <span className="font-semibold">Modo Demo</span> — Sin conexión al servidor, usando datos simulados
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 animate-fade-in">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="usuario@hotelflux.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Acceso rápido demo */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Acceso rápido demo
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Admin', email: 'admin@hotelflux.com', pass: 'Admin123!', color: 'bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100', icon: <IconCrown size={16} /> },
                { label: 'Recepción', email: 'recepcion@hotelflux.com', pass: 'Recepcion123!', color: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100', icon: <IconBuilding size={16} /> },
                { label: 'Limpieza', email: 'limpieza1@hotelflux.com', pass: 'Limpieza123!', color: 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100', icon: <IconTools size={16} /> },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => quickLogin(u.email, u.pass)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium ring-1 transition-all active:scale-95 ${u.color}`}
                >
                  {u.icon}
                  <div className="min-w-0">
                    <div className="font-semibold">{u.label}</div>
                    <div className="truncate opacity-60">{u.email}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Link a reservar como cliente */}
          <div className="mt-6 text-center">
            <Link
              to="/reservar"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
            >
              <IconGlobe size={16} />
              ¿Eres huésped? Reserva tu habitación aquí
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Programación Funcional y Reactiva — 9° Ciclo
          </p>
        </div>
      </div>
    </div>
  );
}
