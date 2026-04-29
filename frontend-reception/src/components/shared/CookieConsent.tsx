// ═══════════════════════════════════════════════════════════
// HotelFlux — Banner de Consentimiento de Cookies
// Cumplimiento: Ley N° 29733 (Perú) + OWASP A01/A05
// Categorías: Esenciales (obligatorias), Funcionales, Analíticas
// Almacena preferencia en localStorage (cookie_consent)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface ConsentPrefs {
  essential: true; // siempre true
  functional: boolean;
  analytics: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

function getStoredConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPrefs;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeConsent(prefs: ConsentPrefs): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Delay para no bloquear el first paint
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = useCallback(() => {
    storeConsent({
      essential: true,
      functional: true,
      analytics: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
  }, []);

  const acceptSelected = useCallback(() => {
    storeConsent({
      essential: true,
      functional,
      analytics,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
  }, [functional, analytics]);

  const rejectOptional = useCallback(() => {
    storeConsent({
      essential: true,
      functional: false,
      analytics: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] animate-fade-in-up p-4 sm:p-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-900/10">
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#0c1d3d] to-[#142d5c] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍪</span>
            <div>
              <h3 className="text-sm font-bold text-white">Configuración de Cookies</h3>
              <p className="text-xs text-slate-400">Ley N° 29733 — Protección de Datos Personales</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Utilizamos cookies para garantizar el funcionamiento del sitio y mejorar su experiencia. 
            Las cookies esenciales son necesarias y no pueden desactivarse. 
            Puede configurar las opcionales a continuación.{' '}
            <Link to="/legal/cookies" className="font-medium text-[#c5a255] underline decoration-[#c5a255]/30 hover:text-[#0c1d3d]">
              Más información
            </Link>
          </p>

          {/* Settings panel */}
          {showSettings && (
            <div className="mb-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              {/* Essential - always on */}
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm">🔒</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">Esenciales</span>
                    <p className="text-xs text-slate-400">Autenticación, CSRF, sesión</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
                  Siempre activas
                </span>
              </label>

              <div className="h-px bg-slate-200" />

              {/* Functional */}
              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm">⚙️</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">Funcionales</span>
                    <p className="text-xs text-slate-400">Idioma, tema, preferencias</p>
                  </div>
                </div>
                <button
                  onClick={() => setFunctional(!functional)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${functional ? 'bg-[#c5a255]' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${functional ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </label>

              <div className="h-px bg-slate-200" />

              {/* Analytics */}
              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-sm">📊</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">Analíticas</span>
                    <p className="text-xs text-slate-400">Datos anonimizados de uso</p>
                  </div>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${analytics ? 'bg-[#c5a255]' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${analytics ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm font-medium text-slate-500 underline decoration-slate-300 hover:text-slate-700"
            >
              {showSettings ? 'Ocultar configuración' : 'Configurar cookies'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={rejectOptional}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
              >
                Solo esenciales
              </button>
              {showSettings ? (
                <button
                  onClick={acceptSelected}
                  className="btn-gold rounded-lg px-5 py-2 text-sm shadow-md"
                >
                  Guardar preferencias
                </button>
              ) : (
                <button
                  onClick={acceptAll}
                  className="btn-gold rounded-lg px-5 py-2 text-sm shadow-md"
                >
                  Aceptar todas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
