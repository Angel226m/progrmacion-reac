// ═══════════════════════════════════════════════════════════
// HotelFlux — Mi Cuenta (Panel del Huésped) — v2
// Perfil, reservas con detalle, extras y seguridad
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import {
  obtenerMisReservas,
  obtenerDetalleReserva,
  cancelarMiReserva,
  type ReservaClienteReal,
  type HuespedPerfil,
} from '../services/publico.api';
import ReservaDetalleDrawer from '../components/shared/ReservaDetalleDrawer';
import { fromPromise, fold } from '../domain/result';

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

type Tab = 'perfil' | 'reservas' | 'extras' | 'seguridad';
type FiltroReserva = 'todas' | 'activas' | 'completadas' | 'canceladas';

// ── Tipos locales ──

interface ExtraItem {
  id: string;
  precio: string;
}

// ── FILTRO PREDICADO: Record lookup reemplaza if/else chain ──
// [RECORD LOOKUP] en lugar de if/else para filtrar reservas
const FILTRO_PREDICADOS: Record<FiltroReserva, (r: ReservaClienteReal) => boolean> = {
  todas: () => true,
  activas: (r) => r.estado === 'confirmada' || r.estado === 'checked_in' || r.estado === 'pendiente',
  completadas: (r) => r.estado === 'checked_out',
  canceladas: (r) => r.estado === 'cancelada',
};

const ESTADO_CONFIG: Record<string, { badge: string; dot: string }> = {
  confirmada:  { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',  dot: 'bg-emerald-500' },
  checked_in:  { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',           dot: 'bg-blue-500' },
  checked_out: { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',       dot: 'bg-slate-400' },
  cancelada:   { badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',             dot: 'bg-red-500' },
  pendiente:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',        dot: 'bg-amber-500' },
};

const TIPO_ICON: Record<string, string> = {
  simple: '🛏️', individual: '🛏️', doble: '🛏️🛏️', suite: '✨', presidencial: '👑', familiar: '👨‍👩‍👧‍👦',
};

function calcularNoches(entrada: string, salida: string): number {
  return Math.max(Math.ceil((new Date(salida).getTime() - new Date(entrada).getTime()) / 86400000), 1);
}

function formatFecha(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function ReservaCard({ r, onVerDetalle }: { r: ReservaClienteReal; onVerDetalle: (id: string) => void }) {
  const { t } = useI18n();
  const cfg = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG['pendiente']!;
  const estadoLabels: Record<string, string> = {
    confirmada: t('estado.confirmada'),
    checked_in: t('estado.en_curso'),
    checked_out: t('estado.completada'),
    cancelada: t('estado.cancelada'),
    pendiente: t('estado.pendiente'),
  };
  const estadoLabel = estadoLabels[r.estado] ?? t('estado.pendiente');
  const noches = calcularNoches(r.fecha_entrada, r.fecha_salida);
  const tipoKey = r.tipo?.toLowerCase() ?? '';
  const tipoIcon = TIPO_ICON[tipoKey] ?? '🏨';
  const esFutura = new Date(r.fecha_entrada) > new Date();
  const esActual = r.estado === 'checked_in';

  return (
    <div
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.99] ${
        esActual ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100 hover:border-slate-200'
      }`}
      onClick={() => onVerDetalle(r.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onVerDetalle(r.id)}
      aria-label={`${t('micuenta.ver_detalle')} ${r.codigo}`}
    >
      {esActual && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-200" />
          <span className="text-xs font-bold text-white">{t('micuenta.estadia_en_curso')}</span>
        </div>
      )}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
            esActual ? 'bg-blue-50' : 'bg-[#0c1d3d]/5'
          }`}>
            {tipoIcon}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-700">{r.codigo}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {estadoLabel}
              </span>
              {esFutura && r.estado === 'confirmada' && (
                <span className="rounded-full bg-[#c5a255]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0c1d3d]">{t('micuenta.proxima')}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {t('micuenta.hab')} {r.habitacion} — <span className="capitalize">{r.tipo}</span>
              {r.piso ? ` · ${t('micuenta.piso')} ${r.piso}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatFecha(r.fecha_entrada)}
              </span>
              <span className="text-slate-300">→</span>
              <span>{formatFecha(r.fecha_salida)}</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {t('micuenta.noches').replace('{n}', String(noches))}
              </span>
            </div>
            {r.notas && <p className="mt-1 text-xs italic text-slate-400 truncate max-w-xs">{r.notas}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
          <div className="text-right">
            <span className="text-lg font-extrabold text-slate-800">S/ {parseFloat(r.total || '0').toFixed(2)}</span>
            <p className="text-[10px] text-slate-400">{t('micuenta.total')}</p>
          </div>
          <span className="hidden text-xs font-semibold text-[#c5a255] group-hover:inline-flex items-center gap-1 sm:inline-flex">
            {t('micuenta.ver_detalle')}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MiCuentaPage() {
  const { usuario, token, loading, logout, refreshToken } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('perfil');

  // Reservas reales
  const [reservas, setReservas] = useState<ReservaClienteReal[]>([]);
  const [huesped, setHuesped] = useState<HuespedPerfil | null>(null);
  // Drawer de detalle
  const [detalleId, setDetalleId] = useState<string | null>(null);
  // Filtro de reservas
  const [filtro, setFiltro] = useState<FiltroReserva>('todas');
  const [cargandoReservas, setCargandoReservas] = useState(false);
  const [errorReservas, setErrorReservas] = useState<string | null>(null);

  const [extrasSeleccionados, setExtrasSeleccionados] = useState<Set<string>>(new Set());
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passMsg, setPassMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [cambiandoPass, setCambiandoPass] = useState(false);

  const cargarReservas = useCallback(async () => {
    return !token
      ? undefined
      : (async () => {
          setCargandoReservas(true);
          setErrorReservas(null);
          const result = await fromPromise(
            obtenerMisReservas(token, refreshToken),
            toError,
          );
          fold(
            (resp: import('../services/publico.api').MisReservasResponse) => {
              setReservas(resp.data);
              setHuesped(resp.huesped);
            },
            (err: Error) => {
              err.message === 'SESSION_EXPIRED'
                ? (logout(), undefined)
                : setErrorReservas(t('micuenta.error_cargar_reservas'));
            },
          )(result);
          setCargandoReservas(false);
        })();
  }, [token, refreshToken, logout, t]);

  // Cargar al montar (silencioso para stats)
  useEffect(() => {
    !token || (async () => {
      const result = await fromPromise(
        obtenerMisReservas(token, refreshToken),
        toError,
      );
      fold(
        (resp: import('../services/publico.api').MisReservasResponse) => {
          setHuesped(resp.huesped);
          setReservas(resp.data);
        },
        (err: Error) => {
          err.message === 'SESSION_EXPIRED' && logout();
        },
      )(result);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    tab === 'reservas' && cargarReservas();
  }, [tab, cargarReservas]);

  const handleCancelSuccess = useCallback((id: string) => {
    setReservas((prev) => prev.map((r) => r.id === id ? { ...r, estado: 'cancelada' as const } : r));
  }, []);

  // Redirect si no hay sesión — siempre DESPUÉS de todos los hooks
  // Mostrar loading mientras se restaura la sesión desde la API
  const noSessionGuard: React.ReactNode = !usuario
    ? (loading
        ? (
          <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#c5a255] border-t-transparent" />
              <p className="mt-4 text-sm text-slate-400">{t('micuenta.cargando_sesion')}</p>
            </div>
          </div>
        )
        : <Navigate to="/acceso" replace />)
    : null;

  // ── Filtros derivados ──
  // [RECORD LOOKUP] FILTRO_PREDICADOS[filtro] reemplaza cadena de if/else
  const reservasFiltradas = reservas.filter(FILTRO_PREDICADOS[filtro]);

  const cuentaFiltros: Record<FiltroReserva, number> = {
    todas: reservas.length,
    activas: reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in' || r.estado === 'pendiente').length,
    completadas: reservas.filter((r) => r.estado === 'checked_out').length,
    canceladas: reservas.filter((r) => r.estado === 'cancelada').length,
  };

  const toggleExtra = (id: string) => {
    setExtrasSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const EXTRAS_DISPONIBLES: ExtraItem[] = [
    { id: 'late_checkout', precio: '25.00' },
    { id: 'early_checkin', precio: '25.00' },
    { id: 'desayuno', precio: '18.00' },
    { id: 'romantico', precio: '45.00' },
    { id: 'masaje', precio: '80.00' },
    { id: 'transfer', precio: '35.00' },
    { id: 'cuna', precio: '0.00' },
    { id: 'parking', precio: '15.00' },
  ];

  const totalExtras = EXTRAS_DISPONIBLES
    .filter((e) => extrasSeleccionados.has(e.id))
    .reduce((s, e) => s + parseFloat(e.precio), 0);

  const handleCambiarPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    // [TERNARIO] validación sin if/else: compute error o null
    const validationMsg = passNueva.length < 8
      ? { tipo: 'error' as const, texto: t('micuenta.pass_min_length') }
      : passNueva !== passConfirm
        ? { tipo: 'error' as const, texto: t('micuenta.pass_no_coinciden') }
        : null;

    validationMsg
      ? setPassMsg(validationMsg)
      : (async () => {
          setCambiandoPass(true);
          const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
          const res = await fetch(`${API_BASE}/auth/cambiar-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva }),
          });
          const result = await fromPromise(
            res.ok
              ? Promise.resolve(true)
              : res.json().then(
                  (body: { error?: string }) => { throw new Error(body.error || 'Error al cambiar contraseña'); },
                  () => { throw new Error('Error'); },
                ),
            toError,
          );
          fold(
            () => {
              setPassMsg({ tipo: 'ok', texto: t('micuenta.pass_actualizada_ok') });
              setPassActual(''); setPassNueva(''); setPassConfirm('');
            },
            (err: Error) => { setPassMsg({ tipo: 'error', texto: err.message }); },
          )(result);
          setCambiandoPass(false);
        })();
  };

  const reservasActivas = reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in');
  const reservasCompletadas = reservas.filter((r) => r.estado === 'checked_out');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'perfil',    label: t('micuenta.cuenta_title'),        icon: '👤' },
    { id: 'reservas',  label: t('micuenta.mis_reservas_title'),  icon: '📋' },
    { id: 'extras',    label: t('micuenta.extras_title'),        icon: '✨' },
    { id: 'seguridad', label: t('micuenta.cambiar_pass_title'),  icon: '🔒' },
  ];

  const iniciales = (usuario?.nombre ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return noSessionGuard ?? (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ═══ HERO / BIENVENIDA ═══ */}
      <div className="bg-gradient-to-br from-[#0c1d3d] to-[#1a3a6e] pb-20 pt-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c5a255] to-[#e8c96b] text-xl font-extrabold text-[#0c1d3d] shadow-lg shadow-[#c5a255]/30">
                  {iniciales}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-2 ring-[#0c1d3d]">
                  ✓
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c5a255]">{t('micuenta.bienvenido')}</p>
                <h1 className="text-xl font-extrabold text-white sm:text-2xl">{usuario!.nombre}</h1>
                <p className="mt-0.5 text-sm text-slate-400">{usuario!.email}</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-[#c5a255]">{reservas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t('micuenta.reservas')}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-emerald-400">{reservasActivas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t('micuenta.activas')}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-blue-300">{reservasCompletadas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t('micuenta.completadas')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENIDO ═══ */}
      <div className="mx-auto max-w-5xl -mt-10 px-4 pb-16 sm:px-6">
        {/* Tabs card */}
        <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
          <div className="flex flex-1 gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 ${
                  tab === t.id
                    ? 'bg-[#0c1d3d] text-[#c5a255] shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:px-4"
          >
            {t('micuenta.salir')}
          </button>
        </div>

        {/* ═══ TAB: PERFIL ═══ */}
        {tab === 'perfil' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-5 text-base font-bold text-slate-800">{t('micuenta.cuenta_title')}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoField label={t('micuenta.nombre')} value={usuario!.nombre} />
                <InfoField label={t('micuenta.email')} value={usuario!.email} />
                <InfoField label={t('micuenta.tipo_cuenta')} value={t('micuenta.huesped_reg')} highlight />
                {usuario!.inserted_at && (
                  <InfoField
                    label={t('micuenta.miembro_desde')}
                    value={new Date(usuario!.inserted_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                )}
              </div>
            </div>

            {huesped && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-5 text-base font-bold text-slate-800">{t('micuenta.huesped_title')}</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <InfoField label={t('micuenta.nombre_completo')} value={`${huesped.nombre} ${huesped.apellido}`} />
                  <InfoField label={t('micuenta.correo')} value={huesped.email} />
                  {huesped.telefono && <InfoField label={t('micuenta.telefono')} value={huesped.telefono} />}
                  {huesped.documento && <InfoField label={t('micuenta.documento')} value={huesped.documento} />}
                  {huesped.nacionalidad && <InfoField label={t('micuenta.nacionalidad')} value={huesped.nacionalidad} />}
                  {huesped.inserted_at && (
                    <InfoField
                      label={t('micuenta.registrado_desde')}
                      value={new Date(huesped.inserted_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-800">{t('micuenta.acciones_title')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/reservar" className="flex items-center gap-3 rounded-xl border border-[#c5a255]/30 bg-[#c5a255]/5 p-4 transition-all hover:border-[#c5a255]/60 hover:bg-[#c5a255]/10">
                  <span className="text-2xl">🛏️</span>
                  <div>
                    <p className="text-sm font-bold text-[#0c1d3d]">{t('micuenta.nueva_reserva')}</p>
                    <p className="text-xs text-slate-500">{t('micuenta.nueva_reserva_desc')}</p>
                  </div>
                </Link>
                <button onClick={() => setTab('reservas')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{t('micuenta.ver_reservas')}</p>
                    <p className="text-xs text-slate-500">{t('micuenta.ver_reservas_desc').replace('{n}', String(reservas.length))}</p>
                  </div>
                </button>
                <button onClick={() => setTab('seguridad')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">🔒</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{t('micuenta.cambiar_password')}</p>
                    <p className="text-xs text-slate-500">{t('micuenta.cambiar_password_desc')}</p>
                  </div>
                </button>
                <a href="tel:+5101234567" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">📞</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t('micuenta.contactar')}</p>
                    <p className="text-xs text-slate-500">+51 01 234 5678</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: RESERVAS ═══ */}
        {tab === 'reservas' && (
          <div className="space-y-5">
            {/* Cabecera */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{t('micuenta.mis_reservas_title')}</h2>
                {!cargandoReservas && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {reservas.length === 0
                      ? t('micuenta.empty_title')
                      : t('micuenta.empty_count').replace('{n}', String(reservas.length))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cargarReservas}
                  disabled={cargandoReservas}
                  title={t('micuenta.refrescar')}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#c5a255]/40 hover:bg-slate-50 hover:text-[#c5a255] disabled:opacity-50"
                >
                  <svg className={`h-4 w-4 ${cargandoReservas ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <Link to="/reservar" className="btn-gold shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm">
                  {t('micuenta.nueva_reserva_btn')}
                </Link>
              </div>
            </div>

            {/* Filtros */}
            {reservas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(['todas', 'activas', 'completadas', 'canceladas'] as FiltroReserva[]).map((f) => {
                  const labels: Record<FiltroReserva, string> = {
                    todas: t('micuenta.filtro_todas'),
                    activas: t('micuenta.filtro_activas'),
                    completadas: t('micuenta.filtro_completadas'),
                    canceladas: t('micuenta.filtro_canceladas'),
                  };
                  const colors: Record<FiltroReserva, string> = {
                    todas:      filtro === f ? 'bg-[#0c1d3d] text-white'      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    activas:    filtro === f ? 'bg-emerald-600 text-white'     : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                    completadas: filtro === f ? 'bg-slate-700 text-white'     : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    canceladas: filtro === f ? 'bg-red-600 text-white'         : 'bg-red-50 text-red-600 hover:bg-red-100',
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => setFiltro(f)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${colors[f]}`}
                    >
                      {labels[f]} ({cuentaFiltros[f]})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Skeleton */}
            {cargandoReservas && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            )}

            {/* Error */}
            {!cargandoReservas && errorReservas && (
              <div className="flex items-center justify-between rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
                <p className="text-sm font-semibold text-red-700">{errorReservas}</p>
                <button onClick={cargarReservas} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                  {t('micuenta.reintentar')}
                </button>
              </div>
            )}

            {/* Empty state */}
            {!cargandoReservas && !errorReservas && reservas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">🏨</div>
                <p className="mb-1 font-semibold text-slate-700">{t('micuenta.no_reservas_title')}</p>
                <p className="mb-5 text-sm text-slate-400">{t('micuenta.no_reservas_desc')}</p>
                <Link to="/reservar" className="btn-gold inline-block rounded-xl px-6 py-3 text-sm font-bold shadow-md">
                  {t('micuenta.reservar_btn')}
                </Link>
              </div>
            )}

            {/* Empty filtered state */}
            {!cargandoReservas && !errorReservas && reservas.length > 0 && reservasFiltradas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <p className="text-sm text-slate-400">{t('micuenta.sin_reservas_filtro')}</p>
              </div>
            )}

            {/* Lista */}
            {!cargandoReservas && !errorReservas && reservasFiltradas.length > 0 && (
              <div className="space-y-3">
                {reservasFiltradas.map((r) => (
                  <ReservaCard key={r.id} r={r} onVerDetalle={setDetalleId} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: EXTRAS ═══ */}
        {tab === 'extras' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('micuenta.extras_title')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('micuenta.extras_desc')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {EXTRAS_DISPONIBLES.map((extra) => {
                const selected = extrasSeleccionados.has(extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => toggleExtra(extra.id)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-[#c5a255]/40 bg-[#c5a255]/5 ring-2 ring-[#c5a255]/20'
                        : 'border-slate-100 bg-white hover:border-[#c5a255]/20 hover:shadow-sm'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      selected ? 'border-[#c5a255] bg-[#c5a255]' : 'border-slate-300'
                    }`}>
                      {selected && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{t(`micuenta.extra_${extra.id}`)}</span>
                        <span className={`text-sm font-bold ${parseFloat(extra.precio) === 0 ? 'text-green-600' : 'text-[#c5a255]'}`}>
                          {parseFloat(extra.precio) === 0 ? t('micuenta.gratis') : `S/ ${extra.precio}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{t(`micuenta.extra_${extra.id}_desc`)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {extrasSeleccionados.size > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3a6e] p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      {t('micuenta.extras_count').replace('{n}', String(extrasSeleccionados.size))}
                    </p>
                    <p className="text-2xl font-bold text-[#c5a255]">S/ {totalExtras.toFixed(2)}</p>
                  </div>
                  <a href="tel:+5101234567" className="rounded-xl bg-[#c5a255] px-5 py-2.5 text-sm font-bold text-[#0c1d3d] shadow transition-all hover:bg-[#d4b76a] hover:shadow-md">
                    {t('micuenta.solicitar_tel')}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: SEGURIDAD ═══ */}
        {tab === 'seguridad' && (
          <div className="max-w-lg space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 text-base font-bold text-slate-800">{t('micuenta.cambiar_pass_title')}</h2>

              {passMsg && (
                <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${
                  passMsg.tipo === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-red-50 text-red-600 ring-red-200'
                }`}>
                  {passMsg.texto}
                </div>
              )}

              <form onSubmit={handleCambiarPassword} className="space-y-4">
                <InputPass id="cur-pass" label={t('micuenta.pass_actual')} value={passActual} onChange={setPassActual} autoComplete="current-password" />
                <InputPass id="new-pass" label={t('micuenta.pass_nueva')} value={passNueva} onChange={setPassNueva} placeholder={t('micuenta.pass_min_placeholder')} autoComplete="new-password" />
                <InputPass id="conf-pass" label={t('micuenta.pass_confirmar')} value={passConfirm} onChange={setPassConfirm} autoComplete="new-password" />
                <button
                  type="submit"
                  disabled={cambiandoPass}
                  className="btn-gold w-full rounded-xl px-4 py-3 text-sm font-bold shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {cambiandoPass ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {t('micuenta.actualizando')}
                    </span>
                  ) : t('micuenta.actualizar_pass')}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-[#0c1d3d]/5 p-5 ring-1 ring-[#0c1d3d]/10">
              <h3 className="mb-2 text-sm font-bold text-slate-700">{t('micuenta.recomendaciones')}</h3>
              <ul className="space-y-1.5 text-xs text-slate-500">
                {[
                  t('micuenta.reco1'),
                  t('micuenta.reco2'),
                  t('micuenta.reco3'),
                  t('micuenta.reco4'),
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#c5a255]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ═══ DRAWER DE DETALLE ═══ */}
      <ReservaDetalleDrawer
        reservaId={detalleId}
        token={token!}
        onClose={() => setDetalleId(null)}
        onCancelSuccess={(id) => {
          handleCancelSuccess(id);
          setDetalleId(null);
        }}
        onRefresh={refreshToken}
        fetchDetalle={obtenerDetalleReserva}
        cancelarReserva={cancelarMiReserva}
      />
    </div>
  );
}

// ── Subcomponentes ──

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      <p className={`text-sm font-medium ${highlight ? 'text-[#c5a255]' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function InputPass({ id, label, value, onChange, placeholder, autoComplete }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        id={id}
        type="password"
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
      />
    </div>
  );
}
