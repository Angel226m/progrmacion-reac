// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Acceso (Cliente / Personal)
// Login unificado con toggle entre cliente y trabajador
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/api';
import { rutaPorRol } from '../App';
import { fromPromise, fold } from '../domain/result';
import type { AuthResponse } from '../domain/types';

type Modo = 'cliente' | 'personal';

export default function AccesoPage() {
  const [modo, setModo] = useState<Modo>('cliente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const result = await fromPromise<AuthResponse, Error>(
        auth.login({ email, password }),
        (e) => e instanceof Error ? e : new Error(String(e)),
      );

      fold<AuthResponse, Error, void>(
        (resp) => {
          login(resp);
          if (modo === 'personal' && resp.usuario.rol !== 'huesped') {
            const destino = rutaPorRol[resp.usuario.rol] ?? '/admin/dashboard';
            navigate(destino, { replace: true });
          } else {
            navigate('/mi-cuenta', { replace: true });
          }
        },
        (err) => {
          setError(err.message);
        },
      )(result);

      setLoading(false);
    },
    [modo, email, password, login, navigate],
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1d3d] to-[#1a3a6e] shadow-lg shadow-[#0c1d3d]/20">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Iniciar Sesión</h1>
        <p className="mt-2 text-sm text-slate-500">
          Acceda a su cuenta para gestionar reservas y más
        </p>
      </div>

      {/* Toggle cliente / personal */}
      <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => { setModo('cliente'); setError(null); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            modo === 'cliente'
              ? 'bg-white text-[#0c1d3d] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Soy Huésped
        </button>
        <button
          type="button"
          onClick={() => { setModo('personal'); setError(null); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            modo === 'personal'
              ? 'bg-white text-[#0c1d3d] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Soy Personal
        </button>
      </div>

      {/* Offline badge */}
      {offline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span><strong>Modo Demo</strong> — Sin conexión al servidor</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email-acc" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Correo electrónico
          </label>
          <input
            id="email-acc"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
            placeholder={modo === 'cliente' ? 'tu-correo@email.com' : 'usuario@hotelflux.com'}
          />
        </div>

        <div>
          <label htmlFor="pass-acc" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Contraseña
          </label>
          <input
            id="pass-acc"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full rounded-xl px-4 py-3.5 text-sm shadow-lg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
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
            modo === 'cliente' ? 'Ingresar como Huésped' : 'Ingresar como Personal'
          )}
        </button>
      </form>

      {/* Acceso rápido demo (solo personal) */}
      {modo === 'personal' && (
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">Acceso rápido demo</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: 'Admin', e: 'admin@hotelflux.com', p: 'Admin123!', c: 'bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100' },
              { l: 'Recepción', e: 'recepcion@hotelflux.com', p: 'Recepcion123!', c: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100' },
              { l: 'Limpieza', e: 'limpieza1@hotelflux.com', p: 'Limpieza123!', c: 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100' },
            ].map((u) => (
              <button
                key={u.e}
                type="button"
                onClick={() => { setEmail(u.e); setPassword(u.p); }}
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ring-1 transition-all active:scale-95 ${u.c}`}
              >
                {u.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Links adicionales */}
      <div className="mt-8 space-y-3 text-center text-sm">
        {modo === 'cliente' && (
          <p className="text-slate-500">
            ¿No tiene cuenta?{' '}
            <Link to="/registro" className="font-semibold text-[#c5a255] hover:text-[#b08d3e]">
              Regístrese aquí
            </Link>
          </p>
        )}
        <p className="text-slate-400">
          <Link to="/" className="hover:text-slate-600">&larr; Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
