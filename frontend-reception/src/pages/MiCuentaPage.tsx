// ═══════════════════════════════════════════════════════════
// HotelFlux — Mi Cuenta (Perfil del Huésped)
// Gestión de perfil, reservas, preferencias y extras
// ═══════════════════════════════════════════════════════════

import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Tab = 'perfil' | 'reservas' | 'extras' | 'seguridad';

// ── Tipos locales ──

interface ReservaCliente {
  id: string;
  codigo: string;
  habitacion: string;
  tipo: string;
  fecha_entrada: string;
  fecha_salida: string;
  estado: 'confirmada' | 'pendiente' | 'completada' | 'cancelada';
  total: string;
}

interface ExtraItem {
  id: string;
  nombre: string;
  precio: string;
  descripcion: string;
  categoria: string;
}

// ── Datos demo ──

const RESERVAS_DEMO: ReservaCliente[] = [
  { id: 'r1', codigo: 'HF-2025-001', habitacion: '101', tipo: 'Suite', fecha_entrada: '2025-07-15', fecha_salida: '2025-07-18', estado: 'confirmada', total: '750.00' },
  { id: 'r2', codigo: 'HF-2025-002', habitacion: '205', tipo: 'Doble', fecha_entrada: '2025-08-10', fecha_salida: '2025-08-12', estado: 'pendiente', total: '340.00' },
  { id: 'r3', codigo: 'HF-2024-089', habitacion: '302', tipo: 'Simple', fecha_entrada: '2024-12-20', fecha_salida: '2024-12-22', estado: 'completada', total: '160.00' },
];

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

const ESTADO_BADGE: Record<string, string> = {
  confirmada: 'bg-green-100 text-green-700',
  pendiente: 'bg-amber-100 text-amber-700',
  completada: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-red-100 text-red-700',
};

export default function MiCuentaPage() {
  const { usuario, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('perfil');
  const [extrasSeleccionados, setExtrasSeleccionados] = useState<Set<string>>(new Set());
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passMsg, setPassMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Redirect si no hay sesión
  if (!usuario) return <Navigate to="/acceso" replace />;

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

  const handleCambiarPassword = (e: FormEvent) => {
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
    // Simulación
    setPassMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente' });
    setPassActual('');
    setPassNueva('');
    setPassConfirm('');
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
    { id: 'reservas', label: 'Mis Reservas', icon: '📋' },
    { id: 'extras', label: 'Servicios Extras', icon: '✨' },
    { id: 'seguridad', label: 'Seguridad', icon: '🔒' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Mi Cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bienvenido(a), <strong>{usuario.nombre}</strong>
          </p>
        </div>
        <button
          onClick={logout}
          className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-white text-[#0c1d3d] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB: PERFIL ═══ */}
      {tab === 'perfil' && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Información Personal</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</label>
              <p className="text-base font-medium text-slate-800">{usuario.nombre}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
              <p className="text-base font-medium text-slate-800">{usuario.email}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</label>
              <p className="text-base font-medium capitalize text-slate-800">{usuario.rol}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Miembro desde</label>
              <p className="text-base font-medium text-slate-800">
                {new Date(usuario.inserted_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-[#c5a255]/5 border border-[#c5a255]/20 p-4">
            <p className="text-sm text-[#0c1d3d]">
              <strong>Nota:</strong> Para modificar sus datos personales, contacte a recepción al{' '}
              <a href="tel:+5101234567" className="font-semibold underline">+51 01 234 5678</a> o envíe un correo a{' '}
              <a href="mailto:recepcion@hotelflux.com" className="font-semibold underline">recepcion@hotelflux.com</a>.
            </p>
          </div>
        </div>
      )}

      {/* ═══ TAB: RESERVAS ═══ */}
      {tab === 'reservas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Mis Reservas</h2>
            <Link
              to="/reservar"
              className="btn-gold rounded-xl px-4 py-2 text-sm shadow-sm"
            >
              + Nueva Reserva
            </Link>
          </div>

          {RESERVAS_DEMO.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <p className="text-slate-400">No tiene reservas aún</p>
              <Link to="/reservar" className="mt-2 inline-block text-sm font-semibold text-[#c5a255] hover:underline">
                Hacer mi primera reserva
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {RESERVAS_DEMO.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-slate-700">{r.codigo}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ESTADO_BADGE[r.estado] ?? ''}`}>
                        {r.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Hab. {r.habitacion} — {r.tipo} · {r.fecha_entrada} al {r.fecha_salida}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-800">S/ {r.total}</span>
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Ver detalle
                    </button>
                  </div>
                </div>
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
            <p className="mt-1 text-sm text-slate-500">
              Seleccione los extras que desea agregar a su próxima reserva.
            </p>
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

          {/* Resumen */}
          {extrasSeleccionados.size > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3a6e] p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {extrasSeleccionados.size} extra{extrasSeleccionados.size > 1 ? 's' : ''} seleccionado{extrasSeleccionados.size > 1 ? 's' : ''}
                  </p>
                  <p className="text-2xl font-bold text-[#c5a255]">S/ {totalExtras.toFixed(2)}</p>
                </div>
                <button className="rounded-xl bg-[#c5a255] px-5 py-2.5 text-sm font-bold text-[#0c1d3d] shadow transition-all hover:bg-[#d4b76a] hover:shadow-md active:scale-95">
                  Agregar a Reserva
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: SEGURIDAD ═══ */}
      {tab === 'seguridad' && (
        <div className="max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Cambiar Contraseña</h2>

          {passMsg && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${
              passMsg.tipo === 'ok'
                ? 'bg-green-50 text-green-700 ring-green-200'
                : 'bg-red-50 text-red-600 ring-red-200'
            }`}>
              {passMsg.texto}
            </div>
          )}

          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label htmlFor="cur-pass" className="mb-1 block text-sm font-semibold text-slate-700">
                Contraseña Actual
              </label>
              <input
                id="cur-pass"
                type="password"
                required
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
              />
            </div>
            <div>
              <label htmlFor="new-pass" className="mb-1 block text-sm font-semibold text-slate-700">
                Nueva Contraseña
              </label>
              <input
                id="new-pass"
                type="password"
                required
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label htmlFor="conf-pass" className="mb-1 block text-sm font-semibold text-slate-700">
                Confirmar Nueva Contraseña
              </label>
              <input
                id="conf-pass"
                type="password"
                required
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
              />
            </div>
            <button
              type="submit"
              className="btn-gold w-full rounded-xl px-4 py-3 text-sm shadow-lg active:scale-[0.98]"
            >
              Actualizar Contraseña
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Recomendaciones de Seguridad</h3>
            <ul className="space-y-1 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                Use al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                No reutilice contraseñas de otros servicios
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-400" />
                Cambie su contraseña periódicamente (cada 90 días)
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
