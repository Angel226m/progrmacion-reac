// ═══════════════════════════════════════════════════════════
// HotelFlux — Login Page (Premium Luxury UI)
// Diseño inspirado en: Four Seasons / Aman / Mandarin Oriental
// OWASP A01+A07: JWT + RBAC + NIST 800-63B password policy
// OWASP A04: Rate limit visual + lockout tras 5 intentos
// Features: password visibility, brute-force protection UI,
//           remember me, animated transitions, responsive
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/api';
import { rutaPorRol } from '../config/routes';
import { securityLog } from '../services/security';
import { fromPromise, fold } from '../domain/result';
import type { AuthResponse } from '../domain/types';
import { IconLive, IconShield, IconCrown, IconOffline, IconGlobe, IconBuilding } from '../components/shared/Icons';
import type { ReactNode } from 'react';
import { useI18n } from '../hooks/useI18n';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

const MAX_INTENTOS = 5;
const BLOQUEO_SEGUNDOS = 30;

function IconEye({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconEyeOff({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.22c1.292 4.338 5.31 7.5 10.066 7.5 1.79 0 3.483-.45 4.964-1.233M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function IconLock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [tiempoBloqueo, setTiempoBloqueo] = useState(0);
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

  useEffect(() => {
    if (!bloqueado || tiempoBloqueo <= 0) return;

    const timer = setInterval(() => {
      setTiempoBloqueo((prev) => prev <= 1 ? (setBloqueado(false), setIntentos(0), 0) : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [bloqueado, tiempoBloqueo]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (bloqueado) return;

      setError(null);
      setLoading(true);

      const result = await fromPromise<AuthResponse, Error>(
        auth.login({ email, password, remember_me: rememberMe }),
        toError,
      );

      fold<AuthResponse, Error, void>(
        (resp) => {
          login(resp);
          setIntentos(0);
          securityLog('LOGIN_SUCCESS', { email, rol: resp.usuario.rol });
          const destino = rutaPorRol[resp.usuario.rol] ?? '/';
          navigate(destino, { replace: true });
        },
        (err) => {
          const nuevosIntentos = intentos + 1;
          setIntentos(nuevosIntentos);
          securityLog('LOGIN_FAILURE', { email, intento: nuevosIntentos });

          const lockoutActions: Readonly<Record<'lock' | 'retry', () => void>> = {
            lock: () => {
              setBloqueado(true);
              setTiempoBloqueo(BLOQUEO_SEGUNDOS);
              setError(`Demasiados intentos. Espere ${BLOQUEO_SEGUNDOS} segundos.`);
              securityLog('ACCOUNT_LOCKOUT', { email, intentos: nuevosIntentos });
            },
            retry: () => { setError(err.message); },
          };
          const action = nuevosIntentos >= MAX_INTENTOS ? 'lock' : 'retry';
          lockoutActions[action]();
        },
      )(result);

      setLoading(false);
    },
    [email, password, rememberMe, login, navigate, intentos, bloqueado],
  );

  const quickLogin = useCallback((correo: string, pass: string) => {
    setEmail(correo);
    setPassword(pass);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* ── Panel visual izquierdo — Hotel Luxury Branding ── */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1d3d] via-[#142d5c] to-[#1a3a6e]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="800" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#c5a255]/8 blur-[120px]" />
        <div className="absolute -right-24 -top-24 h-[400px] w-[400px] rounded-full bg-[#c5a255]/5 blur-[100px]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-12">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-2xl shadow-[#c5a255]/20 animate-fade-in-up">
            <span className="text-5xl font-black text-[#0c1d3d]">H</span>
          </div>
          <h1 className="mb-2 text-center text-5xl font-extrabold tracking-tight text-white animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {t('login.brand')}
          </h1>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#c5a255] animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {t('login.tagline')}
          </p>
          <p className="mb-8 text-center text-base font-light text-slate-400 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {t('login.desc')}
          </p>

          <div className="flex items-center gap-3 rounded-full bg-white/5 px-5 py-2.5 backdrop-blur-sm ring-1 ring-white/10 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-slate-300">{t('login.badge')}</span>
          </div>

          <div className="mt-12 max-w-sm space-y-3">
            {[
              { icon: <IconShield size={18} className="text-[#c5a255]" />, text: t('login.feature1') },
              { icon: <IconLive size={18} className="text-[#c5a255]" />, text: t('login.feature2') },
              { icon: <IconBuilding size={18} className="text-[#c5a255]" />, text: t('login.feature3') },
              { icon: <IconShield size={18} className="text-[#c5a255]" />, text: t('login.feature4') },
            ].map((feat: { icon: ReactNode; text: string }, i: number) => (
              <div
                key={feat.text}
                className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 backdrop-blur-sm ring-1 ring-white/[0.06] animate-fade-in-up"
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                {feat.icon}
                <span className="text-sm text-slate-300">{feat.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-6 text-[11px] text-slate-500 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-1.5"><IconLock size={12} /><span>{t('login.footer1')}</span></div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5"><IconShield size={12} className="text-emerald-500/60" /><span>{t('login.footer2')}</span></div>
            <div className="h-3 w-px bg-white/10" />
            <span>{t('login.footer3')}</span>
          </div>
        </div>
      </div>

      {/* ── Panel de login derecho ── */}
      <div className="flex w-full flex-col justify-center bg-gradient-to-b from-[#faf8f5] to-white px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-lg shadow-[#c5a255]/20">
              <span className="text-3xl font-black text-[#0c1d3d]">H</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">{t('login.brand')}</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5a255]">{t('login.tagline')}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">{t('login.welcome')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('login.welcome_desc')}</p>
          </div>

          {offline && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200 animate-fade-in">
              <IconOffline size={18} />
              <div>{t('login.demo_banner')}</div>
            </div>
          )}

          {bloqueado && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-4 ring-1 ring-red-200 animate-fade-in">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <IconLock size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">{t('login.bloqueado_title')}</p>
                <p className="text-xs text-red-600">{t('login.bloqueado_desc')}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-red-200">
                  <div className="h-full rounded-full bg-red-500 transition-all duration-1000" style={{ width: `${(tiempoBloqueo / BLOQUEO_SEGUNDOS) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && !bloqueado && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 animate-fade-in">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">{t('login.email_label')}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                </span>
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={bloqueado}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('login.email_placeholder')} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">{t('login.password_label')}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </span>
                <input id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={bloqueado}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('login.password_placeholder')} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} tabIndex={-1}>
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#c5a255] focus:ring-[#c5a255]/20" />
                <span className="text-sm text-slate-600">{t('login.recordar')}</span>
              </label>
              {intentos > 0 && !bloqueado && (
                <span className="text-xs text-amber-600 font-medium">{t('login.intentos')}</span>
              )}
            </div>

            <button type="submit" disabled={loading || bloqueado}
              className="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3a6e] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0c1d3d]/25 transition-all hover:shadow-xl hover:shadow-[#0c1d3d]/30 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t('login.verificando')}
                </span>
              ) : bloqueado ? (
                <span className="flex items-center justify-center gap-2"><IconLock size={16} /> {t('login.bloqueado_btn')}</span>
              ) : t('login.submit')}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center">              <span className="bg-[#faf8f5] px-3 text-xs font-medium uppercase tracking-wider text-slate-400">{t('login.demo_divider')}</span></div>
            </div>
            <div className="mt-4 flex justify-center">
              {[
                { label: t('login.demo_huesped'), email: 'huesped@hotelflux.com', pass: 'Huesped123!', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100', icon: <IconCrown size={16} /> },
              ].map((u) => (
                <button key={u.email} type="button" onClick={() => quickLogin(u.email, u.pass)} disabled={bloqueado}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium ring-1 transition-all active:scale-95 disabled:opacity-50 ${u.color}`}>
                  {u.icon}
                  <div className="min-w-0"><div className="font-semibold">{u.label}</div><div className="truncate opacity-60">{u.email}</div></div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/reservar" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c5a255] transition-colors hover:text-[#0c1d3d]">
              <IconGlobe size={16} /> {t('login.guest_link')}
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><IconShield size={12} /><span>{t('login.footer_owasp')}</span></div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><IconLock size={12} /><span>{t('login.footer_iso')}</span></div>
            <div className="h-3 w-px bg-slate-200" />
            <span className="text-[11px] text-slate-400">{t('login.footer_nist')}</span>
          </div>
          <p className="mt-4 text-center text-[10px] text-slate-400">{t('login.footer_funcional')}</p>
        </div>
      </div>
    </div>
  );
}
