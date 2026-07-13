// ═══════════════════════════════════════════════════════════
// HotelFlux — Restablecer Contraseña
// Formulario con validación NIST 800-63B y token de seguridad
// ═══════════════════════════════════════════════════════════

import { useState, type FormEvent } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { useI18n } from '../hooks/useI18n';

function IconEye({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconEyeOff({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.22c1.292 4.338 5.31 7.5 10.066 7.5 1.79 0 3.483-.45 4.964-1.233M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'restablecer.regla_longitud' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'restablecer.regla_mayuscula' },
  { test: (p: string) => /[a-z]/.test(p), label: 'restablecer.regla_minuscula' },
  { test: (p: string) => /[0-9]/.test(p), label: 'restablecer.regla_numero' },
  { test: (p: string) => /[!@#$%^&*]/.test(p), label: 'restablecer.regla_especial' },
];

export default function RestablecerContrasenaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitoso, setExitoso] = useState(false);
  const [loading, setLoading] = useState(false);

  const reglas = PASSWORD_RULES.map((r) => ({
    ...r,
    cumple: r.test(password),
  }));

  const valida = reglas.every((r) => r.cumple) && password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valida) return;
    setError(null);
    setLoading(true);

    try {
      await auth.restablecerPassword({ token, email: emailParam, password });
      setExitoso(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">{t('restablecer.token_invalido')}</p>
          <Link to="/recuperar-contrasena" className="text-sm font-medium text-[#c5a255] hover:text-[#b08d3e]">
            {t('restablecer.solicitar_nuevo')}
          </Link>
        </div>
      </div>
    );
  }

  if (exitoso) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">{t('restablecer.exitoso_title')}</p>
          <p className="text-xs text-slate-500">{t('restablecer.exitoso_desc')}</p>
          <button
            onClick={() => navigate('/acceso')}
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-[#0c1d3d] to-[#1a3a6e] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
          >
            {t('restablecer.ir_login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-lg shadow-[#c5a255]/20">
            <svg className="h-6 w-6 text-[#0c1d3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{t('restablecer.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('restablecer.subtitle')}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
                <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <p className="text-xs text-slate-500">{t('restablecer.instrucciones')}</p>

            <div>
              <label htmlFor="reset-pass" className="mb-1 block text-xs font-semibold text-slate-600">
                {t('restablecer.password_label')}
              </label>
              <div className="relative">
                <input
                  id="reset-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/10"
                  placeholder={t('restablecer.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {password.length > 0 && (
              <ul className="space-y-1">
                {reglas.map((r) => (
                  <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.cumple ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      {r.cumple ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      )}
                    </svg>
                    <span>{t(r.label)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <label htmlFor="confirm-pass" className="mb-1 block text-xs font-semibold text-slate-600">
                {t('restablecer.confirmar_label')}
              </label>
              <input
                id="confirm-pass"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/10"
                placeholder={t('restablecer.confirmar_placeholder')}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{t('restablecer.no_coinciden')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !valida}
              className="btn-gold w-full rounded-lg px-4 py-2.5 text-sm shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('restablecer.restableciendo')}
                </span>
              ) : (
                t('restablecer.restablecer_btn')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
