// ═══════════════════════════════════════════════════════════
// HotelFlux — Recuperar Contraseña
// Solicita enlace de restablecimiento vía email
// ═══════════════════════════════════════════════════════════

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';
import { useI18n } from '../hooks/useI18n';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await auth.olvidePassword(email);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5a255] to-[#e8d5a3] shadow-lg shadow-[#c5a255]/20">
            <svg className="h-6 w-6 text-[#0c1d3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{t('recuperar.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('recuperar.subtitle')}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">{t('recuperar.enviado_title')}</p>
              <p className="text-xs text-slate-500">{t('recuperar.enviado_desc')}</p>
              <Link
                to="/acceso"
                className="mt-4 inline-block rounded-lg bg-gradient-to-r from-[#0c1d3d] to-[#1a3a6e] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
              >
                {t('recuperar.volver_login')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <p className="text-xs text-slate-500">{t('recuperar.instrucciones')}</p>

              <div>
                <label htmlFor="email-rec" className="mb-1 block text-xs font-semibold text-slate-600">
                  {t('recuperar.email_label')}
                </label>
                <input
                  id="email-rec"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#c5a255] focus:ring-2 focus:ring-[#c5a255]/10"
                  placeholder={t('recuperar.email_placeholder')}
                />
              </div>

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
                    {t('recuperar.enviando')}
                  </span>
                ) : (
                  t('recuperar.enviar_btn')
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/acceso" className="font-medium text-[#c5a255] hover:text-[#b08d3e]">
            &larr; {t('recuperar.volver_login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
