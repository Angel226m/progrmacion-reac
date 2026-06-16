// ═══════════════════════════════════════════════════════════
// HotelFlux — Mi Cuenta (Panel del Huésped) — v2
// Perfil, reservas con detalle, extras y seguridad
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  obtenerMisReservas,
  obtenerDetalleReserva,
  cancelarMiReserva,
  type ReservaClienteReal,
  type HuespedPerfil,
} from '../services/publico.api';
import ReservaDetalleDrawer from '../components/shared/ReservaDetalleDrawer';

type Tab = 'perfil' | 'reservas' | 'extras' | 'seguridad';
type FiltroReserva = 'todas' | 'activas' | 'completadas' | 'canceladas';

// ── Tipos locales ──

interface ExtraItem {
  id: string;
  nombre: string;
  precio: string;
  descripcion: string;
  categoria: string;
}

const EXTRAS_DISPONIBLES: ExtraItem[] = [
  { id: 'e1', nombre: 'Late Check-out (14:00)', precio: '25.00', descripcion: 'Extienda su salida hasta las 2pm', categoria: 'Alojamiento' },
  { id: 'e2', nombre: 'Early Check-in (10:00)', precio: '25.00', descripcion: 'Llegue temprano y relájese', categoria: 'Alojamiento' },
  { id: 'e3', nombre: 'Desayuno Buffet', precio: '18.00', descripcion: 'Desayuno completo por persona/día', categoria: 'Gastronomía' },
  { id: 'e4', nombre: 'Pack Romántico', precio: '45.00', descripcion: 'Pétalos, champagne y chocolates', categoria: 'Especial' },
  { id: 'e5', nombre: 'Masaje Relajante 60min', precio: '80.00', descripcion: 'Masaje corporal en suite o spa', categoria: 'Bienestar' },
  { id: 'e6', nombre: 'Transfer Aeropuerto', precio: '35.00', descripcion: 'Transporte privado ida o vuelta', categoria: 'Transporte' },
  { id: 'e7', nombre: 'Cuna para Bebé', precio: '0.00', descripcion: 'Cuna portátil en la habitación', categoria: 'Familia' },
  { id: 'e8', nombre: 'Parking VIP', precio: '15.00', descripcion: 'Estacionamiento cubierto por noche', categoria: 'Transporte' },
];

const ESTADO_CONFIG: Record<string, { badge: string; label: string; dot: string }> = {
  confirmada:  { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',  label: 'Confirmada', dot: 'bg-emerald-500' },
  checked_in:  { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',           label: 'En curso',   dot: 'bg-blue-500' },
  checked_out: { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',       label: 'Completada', dot: 'bg-slate-400' },
  cancelada:   { badge: 'bg-red-50 text-red-600 ring-1 ring-red-200',             label: 'Cancelada',  dot: 'bg-red-500' },
  pendiente:   { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',        label: 'Pendiente',  dot: 'bg-amber-500' },
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
  const cfg = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG['pendiente']!;
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
      aria-label={`Ver detalle de reserva ${r.codigo}`}
    >
      {esActual && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-200" />
          <span className="text-xs font-bold text-white">Estadía en curso</span>
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
                {cfg.label}
              </span>
              {esFutura && r.estado === 'confirmada' && (
                <span className="rounded-full bg-[#c5a255]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0c1d3d]">Próxima</span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">
              Hab. {r.habitacion} — <span className="capitalize">{r.tipo}</span>
              {r.piso ? ` · Piso ${r.piso}` : ''}
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
                {noches} noche{noches !== 1 ? 's' : ''}
              </span>
            </div>
            {r.notas && <p className="mt-1 text-xs italic text-slate-400 truncate max-w-xs">{r.notas}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
          <div className="text-right">
            <span className="text-lg font-extrabold text-slate-800">S/ {parseFloat(r.total || '0').toFixed(2)}</span>
            <p className="text-[10px] text-slate-400">Total</p>
          </div>
          <span className="hidden text-xs font-semibold text-[#c5a255] group-hover:inline-flex items-center gap-1 sm:inline-flex">
            Ver detalle
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
    if (!token) return;
    setCargandoReservas(true);
    setErrorReservas(null);
    try {
      const res = await obtenerMisReservas(token, refreshToken);
      setReservas(res.data);
      setHuesped(res.huesped);
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') { logout(); return; }
      setErrorReservas('No se pudieron cargar las reservas. Intente de nuevo.');
    } finally {
      setCargandoReservas(false);
    }
  }, [token, refreshToken, logout]);

  // Cargar al montar (silencioso para stats)
  useEffect(() => {
    if (!token) return;
    obtenerMisReservas(token, refreshToken)
      .then((res) => { setHuesped(res.huesped); setReservas(res.data); })
      .catch((err) => { if (err instanceof Error && err.message === 'SESSION_EXPIRED') logout(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (tab === 'reservas') cargarReservas();
  }, [tab, cargarReservas]);

  const handleCancelSuccess = useCallback((id: string) => {
    setReservas((prev) => prev.map((r) => r.id === id ? { ...r, estado: 'cancelada' as const } : r));
  }, []);

  // Redirect si no hay sesión — siempre DESPUÉS de todos los hooks
  // Mostrar loading mientras se restaura la sesión desde la API
  if (!usuario) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#c5a255] border-t-transparent" />
            <p className="mt-4 text-sm text-slate-400">Cargando sesión...</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/acceso" replace />;
  }

  // ── Filtros derivados ──
  const reservasFiltradas = reservas.filter((r) => {
    if (filtro === 'todas') return true;
    if (filtro === 'activas') return r.estado === 'confirmada' || r.estado === 'checked_in' || r.estado === 'pendiente';
    if (filtro === 'completadas') return r.estado === 'checked_out';
    if (filtro === 'canceladas') return r.estado === 'cancelada';
    return true;
  });

  const cuentaFiltros: Record<FiltroReserva, number> = {
    todas: reservas.length,
    activas: reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in' || r.estado === 'pendiente').length,
    completadas: reservas.filter((r) => r.estado === 'checked_out').length,
    canceladas: reservas.filter((r) => r.estado === 'cancelada').length,
  };

  const toggleExtra = (id: string) => {
    setExtrasSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalExtras = EXTRAS_DISPONIBLES
    .filter((e) => extrasSeleccionados.has(e.id))
    .reduce((s, e) => s + parseFloat(e.precio), 0);

  const handleCambiarPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (passNueva.length < 8) {
      setPassMsg({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (passNueva !== passConfirm) {
      setPassMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden' });
      return;
    }
    setCambiandoPass(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await fetch(`${API_BASE}/auth/cambiar-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error' }));
        throw new Error(body.error || 'Error al cambiar contraseña');
      }
      setPassMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente' });
      setPassActual(''); setPassNueva(''); setPassConfirm('');
    } catch (err) {
      setPassMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al cambiar contraseña' });
    } finally {
      setCambiandoPass(false);
    }
  };

  const reservasActivas = reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in');
  const reservasCompletadas = reservas.filter((r) => r.estado === 'checked_out');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'perfil',    label: 'Mi Perfil',        icon: '👤' },
    { id: 'reservas',  label: 'Mis Reservas',      icon: '📋' },
    { id: 'extras',    label: 'Servicios Extras',  icon: '✨' },
    { id: 'seguridad', label: 'Seguridad',         icon: '🔒' },
  ];

  const iniciales = usuario.nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
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
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c5a255]">Bienvenido(a)</p>
                <h1 className="text-xl font-extrabold text-white sm:text-2xl">{usuario.nombre}</h1>
                <p className="mt-0.5 text-sm text-slate-400">{usuario.email}</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-[#c5a255]">{reservas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Reservas</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-emerald-400">{reservasActivas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Activas</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-blue-300">{reservasCompletadas.length || '—'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Completadas</p>
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
            Salir
          </button>
        </div>

        {/* ═══ TAB: PERFIL ═══ */}
        {tab === 'perfil' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-5 text-base font-bold text-slate-800">Información de la Cuenta</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoField label="Nombre" value={usuario.nombre} />
                <InfoField label="Correo electrónico" value={usuario.email} />
                <InfoField label="Tipo de cuenta" value="Huésped Registrado" highlight />
                {usuario.inserted_at && (
                  <InfoField
                    label="Miembro desde"
                    value={new Date(usuario.inserted_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                )}
              </div>
            </div>

            {huesped && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-5 text-base font-bold text-slate-800">Datos del Huésped</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <InfoField label="Nombre completo" value={`${huesped.nombre} ${huesped.apellido}`} />
                  <InfoField label="Correo" value={huesped.email} />
                  {huesped.telefono && <InfoField label="Teléfono" value={huesped.telefono} />}
                  {huesped.documento && <InfoField label="Documento" value={huesped.documento} />}
                  {huesped.nacionalidad && <InfoField label="Nacionalidad" value={huesped.nacionalidad} />}
                  {huesped.inserted_at && (
                    <InfoField
                      label="Registrado desde"
                      value={new Date(huesped.inserted_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-800">Acciones Rápidas</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/reservar" className="flex items-center gap-3 rounded-xl border border-[#c5a255]/30 bg-[#c5a255]/5 p-4 transition-all hover:border-[#c5a255]/60 hover:bg-[#c5a255]/10">
                  <span className="text-2xl">🛏️</span>
                  <div>
                    <p className="text-sm font-bold text-[#0c1d3d]">Nueva Reserva</p>
                    <p className="text-xs text-slate-500">Busca disponibilidad y reserva</p>
                  </div>
                </Link>
                <button onClick={() => setTab('reservas')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">Ver Mis Reservas</p>
                    <p className="text-xs text-slate-500">{reservas.length} reserva{reservas.length !== 1 ? 's' : ''} registrada{reservas.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>
                <button onClick={() => setTab('seguridad')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">🔒</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">Cambiar Contraseña</p>
                    <p className="text-xs text-slate-500">Actualiza tu seguridad</p>
                  </div>
                </button>
                <a href="tel:+5101234567" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <span className="text-2xl">📞</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Contactar Recepción</p>
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
                <h2 className="text-lg font-bold text-slate-800">Mis Reservas</h2>
                {!cargandoReservas && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {reservas.length === 0
                      ? 'No tienes reservas aún'
                      : `${reservas.length} reserva${reservas.length !== 1 ? 's' : ''} en total`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cargarReservas}
                  disabled={cargandoReservas}
                  title="Refrescar reservas"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#c5a255]/40 hover:bg-slate-50 hover:text-[#c5a255] disabled:opacity-50"
                >
                  <svg className={`h-4 w-4 ${cargandoReservas ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <Link to="/reservar" className="btn-gold shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm">
                  + Nueva
                </Link>
              </div>
            </div>

            {/* Filtros */}
            {reservas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(['todas', 'activas', 'completadas', 'canceladas'] as FiltroReserva[]).map((f) => {
                  const labels: Record<FiltroReserva, string> = {
                    todas: 'Todas', activas: 'Activas', completadas: 'Completadas', canceladas: 'Canceladas',
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
                  Reintentar
                </button>
              </div>
            )}

            {/* Empty state */}
            {!cargandoReservas && !errorReservas && reservas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">🏨</div>
                <p className="mb-1 font-semibold text-slate-700">No tienes reservas registradas</p>
                <p className="mb-5 text-sm text-slate-400">Haz tu primera reserva y disfruta de HotelFlux</p>
                <Link to="/reservar" className="btn-gold inline-block rounded-xl px-6 py-3 text-sm font-bold shadow-md">
                  Reservar ahora
                </Link>
              </div>
            )}

            {/* Empty filtered state */}
            {!cargandoReservas && !errorReservas && reservas.length > 0 && reservasFiltradas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <p className="text-sm text-slate-400">Sin reservas en esta categoría</p>
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
              <h2 className="text-lg font-bold text-slate-800">Servicios Extras para su Estadía</h2>
              <p className="mt-1 text-sm text-slate-500">Seleccione los extras que desea agregar a su próxima reserva y comuníquese con recepción.</p>
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
                        <span className="text-sm font-semibold text-slate-800">{extra.nombre}</span>
                        <span className={`text-sm font-bold ${parseFloat(extra.precio) === 0 ? 'text-green-600' : 'text-[#c5a255]'}`}>
                          {parseFloat(extra.precio) === 0 ? 'Gratis' : `S/ ${extra.precio}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{extra.descripcion}</p>
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {extra.categoria}
                      </span>
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
                      {extrasSeleccionados.size} extra{extrasSeleccionados.size > 1 ? 's' : ''} seleccionado{extrasSeleccionados.size > 1 ? 's' : ''}
                    </p>
                    <p className="text-2xl font-bold text-[#c5a255]">S/ {totalExtras.toFixed(2)}</p>
                  </div>
                  <a href="tel:+5101234567" className="rounded-xl bg-[#c5a255] px-5 py-2.5 text-sm font-bold text-[#0c1d3d] shadow transition-all hover:bg-[#d4b76a] hover:shadow-md">
                    Solicitar por teléfono
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
              <h2 className="mb-6 text-base font-bold text-slate-800">Cambiar Contraseña</h2>

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
                <InputPass id="cur-pass" label="Contraseña Actual" value={passActual} onChange={setPassActual} autoComplete="current-password" />
                <InputPass id="new-pass" label="Nueva Contraseña" value={passNueva} onChange={setPassNueva} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                <InputPass id="conf-pass" label="Confirmar Nueva Contraseña" value={passConfirm} onChange={setPassConfirm} autoComplete="new-password" />
                <button
                  type="submit"
                  disabled={cambiandoPass}
                  className="btn-gold w-full rounded-xl px-4 py-3 text-sm font-bold shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {cambiandoPass ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Actualizando...
                    </span>
                  ) : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-[#0c1d3d]/5 p-5 ring-1 ring-[#0c1d3d]/10">
              <h3 className="mb-2 text-sm font-bold text-slate-700">Recomendaciones de Seguridad</h3>
              <ul className="space-y-1.5 text-xs text-slate-500">
                {[
                  'Use al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos',
                  'No reutilice contraseñas de otros servicios',
                  'Cambie su contraseña periódicamente',
                  'No comparta sus credenciales con nadie',
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
