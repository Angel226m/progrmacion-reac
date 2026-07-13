// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Acceso (Huéspedes)
//
// Principios funcionales reactivos:
// - [RAILWAY] fromPromise + fold para manejo de autenticación
// - [FOLD] colapsa ambos carriles (Ok/Err) en handlers puros
// - [FUNCIÓN PURA] fold devuelve void, efectos en callbacks
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/api';
import { fromPromise, fold } from '../domain/result';
import type { AuthResponse } from '../domain/types';
import { useI18n } from '../hooks/useI18n';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export default function AccesoPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

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
        auth.login({ email, password, remember_me: rememberMe }),
        toError,
      );

      fold<AuthResponse, Error, void>(
        (resp) => {
          login(resp);
          navigate('/mi-cuenta', { replace: true });
        },
        (err) => {
          setError(err.message);
        },
      )(result);

      setLoading(false);
    },
    [email, password, rememberMe, login, navigate],
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-lg shadow-[#c5a255]/20">
            <svg className="h-6 w-6 text-[#0c1d3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{t('acceso.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('acceso.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {/* Offline badge */}
          {offline && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{t('acceso.demo_badge')}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
                <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email-acc" className="mb-1 block text-xs font-semibold text-slate-600">
                {t('acceso.email_label')}
              </label>
              <input
                id="email-acc"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/10"
                placeholder={t('acceso.email_placeholder')}
              />
            </div>

            <div>
              <label htmlFor="pass-acc" className="mb-1 block text-xs font-semibold text-slate-600">
                {t('acceso.password_label')}
              </label>
              <input
                id="pass-acc"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/10"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#c5a255] focus:ring-[#c5a255]/20" />
              <span className="text-sm text-slate-600">{t('login.recordar')}</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full rounded-lg px-4 py-2.5 text-sm shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('acceso.entrando')}
                </span>
              ) : (
                t('acceso.ingresar_huesped')
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/recuperar-contrasena" className="text-xs font-medium text-[#c5a255] hover:text-[#b08d3e] transition-colors">
              {t('acceso.olvide_password')}
            </Link>
          </div>
        </div>

        {/* Links */}
        <div className="mt-6 space-y-2 text-center text-xs">
          <p className="text-slate-500">
            {t('acceso.no_cuenta')}{' '}
            <Link to="/registro" className="font-semibold text-[#c5a255] hover:text-[#b08d3e]">
              {t('acceso.registrarse')}
            </Link>
          </p>
          <p className="text-slate-400">
            <Link to="/" className="hover:text-slate-600">&larr; {t('acceso.volver')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
