// ═══════════════════════════════════════════════════════════
// HotelFlux — Página Pública de Reservación (Premium UI)
// Sin autenticación — flujo en 4 pasos mejorado
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, type FormEvent } from 'react';
import { buscarDisponibilidad, crearReservaPublica, type HabitacionPublica } from '../services/publico.api';
import type { TipoHabitacion } from '../domain/types';

// ── Tipos ──

interface DatosCliente {
  nombre: string; apellido: string; email: string;
  telefono: string; documento: string; nacionalidad: string;
}

interface BusquedaParams {
  fechaEntrada: string; fechaSalida: string; huespedes: number; tipo: TipoHabitacion | '';
}

type PasoReserva = 'busqueda' | 'seleccion' | 'datos' | 'confirmacion';

const TIPO_LABEL: Record<TipoHabitacion, string> = {
  simple: 'Simple', doble: 'Doble', suite: 'Suite', presidencial: 'Presidencial',
};

const TIPO_EMOJI: Record<TipoHabitacion, string> = {
  simple: '🛏️', doble: '🛏️', suite: '✨', presidencial: '👑',
};

const TIPO_COLOR: Record<TipoHabitacion, string> = {
  simple: 'from-slate-700 to-slate-900',
  doble: 'from-blue-800 to-blue-950',
  suite: 'from-amber-700 to-amber-900',
  presidencial: 'from-purple-800 to-purple-950',
};

// ── Helpers ──

function calcularNoches(entrada: string, salida: string): number {
  return Math.max(Math.ceil((new Date(salida).getTime() - new Date(entrada).getTime()) / 86400000), 1);
}

function hoyString(): string { return new Date().toISOString().split('T')[0]!; }
function mananaString(): string { return new Date(Date.now() + 86400000).toISOString().split('T')[0]!; }

// ── Icono check ──

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// ── Stepper ──

function Stepper({ paso }: { paso: PasoReserva }) {
  const pasos: { key: PasoReserva; label: string; emoji: string }[] = [
    { key: 'busqueda', label: 'Búsqueda', emoji: '🔍' },
    { key: 'seleccion', label: 'Habitación', emoji: '🛏️' },
    { key: 'datos', label: 'Tus datos', emoji: '👤' },
    { key: 'confirmacion', label: 'Confirmado', emoji: '✅' },
  ];
  const current = pasos.findIndex((p) => p.key === paso);
  return (
    <div className="flex items-center justify-center gap-1 py-6 sm:gap-2">
      {pasos.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex flex-col items-center transition-all`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                done ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : active ? 'bg-[#0c1d3d] text-[#c5a255] shadow-md shadow-[#0c1d3d]/30 ring-2 ring-[#c5a255]/30'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <IconCheck className="text-white" /> : <span className="text-xs">{s.emoji}</span>}
              </div>
              <span className={`mt-1 hidden text-[10px] font-semibold sm:block ${active ? 'text-[#0c1d3d]' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < 3 && (
              <div className={`mx-1.5 mb-4 h-0.5 w-8 rounded-full transition-all sm:w-14 sm:mx-2 ${i < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──

export default function ReservaClientePage() {
  const [paso, setPaso] = useState<PasoReserva>('busqueda');
  const [busqueda, setBusqueda] = useState<BusquedaParams>({
    fechaEntrada: hoyString(), fechaSalida: mananaString(), huespedes: 2, tipo: '',
  });
  const [habSeleccionada, setHabSeleccionada] = useState<HabitacionPublica | null>(null);
  const [disponibles, setDisponibles] = useState<HabitacionPublica[]>([]);
  const [cliente, setCliente] = useState<DatosCliente>({
    nombre: '', apellido: '', email: '', telefono: '', documento: '', nacionalidad: '',
  });
  const [reservaId, setReservaId] = useState('');
  const [codigoConfirmacion, setCodigoConfirmacion] = useState('');
  const [totalReserva, setTotalReserva] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const noches = useMemo(
    () => calcularNoches(busqueda.fechaEntrada, busqueda.fechaSalida),
    [busqueda.fechaEntrada, busqueda.fechaSalida],
  );

  const handleBuscar = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const resultado = await buscarDisponibilidad({
        fecha_entrada: busqueda.fechaEntrada,
        fecha_salida: busqueda.fechaSalida,
        tipo: busqueda.tipo || undefined,
        capacidad: busqueda.huespedes,
      });
      setDisponibles(resultado.habitaciones);
      setPaso('seleccion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar disponibilidad');
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  const handleSeleccionar = useCallback((hab: HabitacionPublica) => {
    setHabSeleccionada(hab);
    setPaso('datos');
  }, []);

  const handleReservar = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!habSeleccionada) return;
    setError('');
    setCargando(true);
    try {
      const reserva = await crearReservaPublica({
        nombre: cliente.nombre, apellido: cliente.apellido, email: cliente.email,
        telefono: cliente.telefono, documento: cliente.documento, nacionalidad: cliente.nacionalidad,
        habitacion_id: habSeleccionada.id,
        fecha_entrada: busqueda.fechaEntrada, fecha_salida: busqueda.fechaSalida,
      });
      setReservaId(reserva.id);
      setCodigoConfirmacion(reserva.codigo_confirmacion);
      setTotalReserva(reserva.total);
      setPaso('confirmacion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      setCargando(false);
    }
  }, [habSeleccionada, cliente, busqueda]);

  const handleNuevaReserva = useCallback(() => {
    setPaso('busqueda');
    setHabSeleccionada(null);
    setDisponibles([]);
    setCliente({ nombre: '', apellido: '', email: '', telefono: '', documento: '', nacionalidad: '' });
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white">
      {/* ── Hero (solo paso busqueda) ── */}
      {paso === 'busqueda' && (
        <section className="relative overflow-hidden bg-[#0c1d3d] py-16 sm:py-20">
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="h-full w-full" viewBox="0 0 800 400">
              <defs><pattern id="rg" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="white" strokeWidth="0.4"/></pattern></defs>
              <rect width="800" height="400" fill="url(#rg)"/>
            </svg>
          </div>
          <div className="absolute -bottom-1 left-0 right-0 h-14 bg-gradient-to-t from-[#faf8f5] to-transparent" />
          <div className="absolute -left-20 -top-10 h-64 w-64 rounded-full bg-[#c5a255]/10 blur-[80px]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">Reservaciones</p>
            <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
              Tu estancia perfecta<br /><span className="text-[#c5a255]">te espera</span>
            </h1>
            <p className="text-slate-400">Reserva en minutos. Confirmación inmediata. Cancelación flexible.</p>
          </div>
        </section>
      )}

      {/* ── Stepper ── */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Stepper paso={paso} />

        {/* ── Paso 1: Búsqueda ── */}
        {paso === 'busqueda' && (
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleBuscar}
              className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
              <h2 className="mb-6 text-xl font-extrabold text-slate-800">Busca tu habitación ideal</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha de entrada</label>
                  <input type="date" required min={hoyString()} value={busqueda.fechaEntrada}
                    onChange={(e) => setBusqueda((p) => ({ ...p, fechaEntrada: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha de salida</label>
                  <input type="date" required min={busqueda.fechaEntrada || hoyString()} value={busqueda.fechaSalida}
                    onChange={(e) => setBusqueda((p) => ({ ...p, fechaSalida: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Huéspedes</label>
                  <select value={busqueda.huespedes}
                    onChange={(e) => setBusqueda((p) => ({ ...p, huespedes: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de habitación</label>
                  <select value={busqueda.tipo}
                    onChange={(e) => setBusqueda((p) => ({ ...p, tipo: e.target.value as TipoHabitacion | '' }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10">
                    <option value="">Cualquier tipo</option>
                    {(['simple', 'doble', 'suite', 'presidencial'] as TipoHabitacion[]).map((t) => (
                      <option key={t} value={t}>{TIPO_EMOJI[t]} {TIPO_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Noches calculadas */}
              {busqueda.fechaEntrada && busqueda.fechaSalida && noches > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#c5a255]/8 px-4 py-2.5">
                  <span className="text-[#c5a255] text-lg">🌙</span>
                  <span className="text-sm font-semibold text-[#0c1d3d]">{noches} noche{noches > 1 ? 's' : ''}</span>
                  <span className="text-xs text-slate-500">· {busqueda.fechaEntrada} → {busqueda.fechaSalida}</span>
                </div>
              )}

              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

              <button type="submit" disabled={cargando}
                className="btn-gold mt-6 w-full rounded-xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
                {cargando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Buscando disponibilidad...
                  </span>
                ) : '🔍 Buscar disponibilidad'}
              </button>
            </form>

            {/* ¿Por qué HotelFlux? */}
            <div className="mt-10">
              <h2 className="mb-6 text-center text-xl font-bold text-slate-800">¿Por qué elegir HotelFlux?</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: '⚡', title: 'Confirmación instantánea', desc: 'Tu reserva se confirma en segundos' },
                  { icon: '🔓', title: 'Cancelación flexible', desc: 'Modifica o cancela sin penalidad' },
                  { icon: '💳', title: 'Pago seguro', desc: 'Tarjeta, efectivo o transferencia' },
                  { icon: '🛎️', title: 'Servicio 24/7', desc: 'Soporte antes, durante y después' },
                ].map((feat: { icon: string; title: string; desc: string }) => (
                  <div key={feat.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 text-center transition-all hover:shadow-md">
                    <div className="mb-2 text-3xl">{feat.icon}</div>
                    <h3 className="mb-1 text-sm font-bold text-slate-800">{feat.title}</h3>
                    <p className="text-xs text-slate-500">{feat.desc}</p>
                  </div>
                ))}
              </div>

              {/* Testimonios */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { nombre: 'María G.', pais: '🇵🇪 Perú', texto: 'Proceso de reserva increíblemente sencillo. En menos de 5 minutos tenía mi confirmación.' },
                  { nombre: 'Carlos R.', pais: '🇨🇴 Colombia', texto: 'La habitación superó todas mis expectativas. La tecnología del hotel es impresionante.' },
                  { nombre: 'Ana L.', pais: '🇦🇷 Argentina', texto: 'Personal muy amable y atento. Definitivamente volveré en mi próximo viaje a Lima.' },
                ].map((t) => (
                  <div key={t.nombre} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-3 flex text-amber-400 text-sm">★★★★★</div>
                    <p className="mb-3 text-sm italic text-slate-600 leading-relaxed">"{t.texto}"</p>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c1d3d] text-xs font-bold text-[#c5a255]">
                        {t.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{t.nombre}</p>
                        <p className="text-[10px] text-slate-400">{t.pais}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 2: Selección ── */}
        {paso === 'seleccion' && (
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Habitaciones disponibles</h2>
                <p className="text-sm text-slate-500">
                  {busqueda.fechaEntrada} → {busqueda.fechaSalida} · {noches} noche{noches > 1 ? 's' : ''} · {busqueda.huespedes} huésp.
                </p>
              </div>
              <button onClick={() => setPaso('busqueda')}
                className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
                ← Modificar
              </button>
            </div>

            {disponibles.length === 0 ? (
              <div className="rounded-3xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 text-5xl">😔</div>
                <p className="text-lg font-semibold text-slate-700">Sin disponibilidad</p>
                <p className="mt-1 text-sm text-slate-400">Intenta cambiar las fechas o el tipo de habitación</p>
                <button onClick={() => setPaso('busqueda')} className="btn-gold mt-5 rounded-xl px-6 py-2.5 text-sm shadow-md">
                  Buscar de nuevo
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {disponibles.map((hab) => {
                  const tipo = hab.tipo as TipoHabitacion;
                  const precio = parseFloat(hab.precio_noche ?? '0');
                  const totalHab = (precio * noches).toFixed(2);
                  return (
                    <div key={hab.id}
                      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-[#c5a255]/30"
                      onClick={() => handleSeleccionar(hab)}>
                      {/* Visual header */}
                      <div className={`relative h-36 bg-gradient-to-br ${TIPO_COLOR[tipo] ?? 'from-slate-700 to-slate-900'} flex items-center justify-center`}>
                        <div className="absolute left-3 top-3">
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                            {TIPO_LABEL[tipo] ?? hab.tipo}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-5xl">{TIPO_EMOJI[tipo] ?? '🏨'}</span>
                          <p className="mt-1 text-xs font-medium text-white/60">Piso {hab.piso}</p>
                        </div>
                        <div className="absolute right-3 top-3 text-right">
                          <div className="text-xl font-extrabold text-[#c5a255]">S/{hab.precio_noche ?? '0'}</div>
                          <div className="text-[9px] text-white/50">/noche</div>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="mb-1.5 text-base font-bold text-slate-800">Habitación {hab.numero}</h3>
                        <div className="mb-3 flex flex-wrap gap-1">
                          {hab.amenidades.slice(0, 4).map((a) => (
                            <span key={a} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{a}</span>
                          ))}
                          {hab.amenidades.length > 4 && <span className="text-[10px] text-slate-400">+{hab.amenidades.length - 4}</span>}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                          <div>
                            <p className="text-xs text-slate-400">{noches} noche{noches > 1 ? 's' : ''}</p>
                            <p className="text-base font-extrabold text-slate-800">S/{totalHab}</p>
                          </div>
                          <div className="rounded-xl bg-[#0c1d3d] px-4 py-2 text-xs font-bold text-[#c5a255] transition-all group-hover:bg-[#c5a255] group-hover:text-[#0c1d3d]">
                            Seleccionar →
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 3: Datos del huésped ── */}
        {paso === 'datos' && habSeleccionada && (
          <div>
            <button onClick={() => setPaso('seleccion')}
              className="mb-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
              ← Cambiar habitación
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Formulario */}
              <form onSubmit={handleReservar}
                className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-6 text-xl font-extrabold text-slate-800">Datos del huésped</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { id: 'nombre', label: 'Nombre *', type: 'text', placeholder: 'Juan', key: 'nombre' as const },
                    { id: 'apellido', label: 'Apellido *', type: 'text', placeholder: 'Pérez', key: 'apellido' as const },
                    { id: 'email', label: 'Correo electrónico *', type: 'email', placeholder: 'juan@email.com', key: 'email' as const },
                    { id: 'telefono', label: 'Teléfono *', type: 'tel', placeholder: '+51 999 123 456', key: 'telefono' as const },
                    { id: 'documento', label: 'Documento de identidad *', type: 'text', placeholder: 'DNI / Pasaporte', key: 'documento' as const },
                    { id: 'nacionalidad', label: 'Nacionalidad *', type: 'text', placeholder: 'Perú', key: 'nacionalidad' as const },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        {field.label}
                      </label>
                      <input id={field.id} type={field.type} required placeholder={field.placeholder}
                        value={cliente[field.key]}
                        onChange={(e) => setCliente((p) => ({ ...p, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10 placeholder:text-slate-300" />
                    </div>
                  ))}
                </div>

                {/* Política */}
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="text-xl shrink-0">🔒</span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sus datos están protegidos bajo la <strong className="text-slate-700">Ley N° 29733</strong> de Protección de Datos Personales.
                    No compartimos su información con terceros.
                  </p>
                </div>

                {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

                <button type="submit" disabled={cargando}
                  className="btn-gold mt-6 w-full rounded-xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
                  {cargando ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Procesando reserva...
                    </span>
                  ) : '✅ Confirmar reserva'}
                </button>
              </form>

              {/* Resumen reserva */}
              <div className="h-fit rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-6 text-white shadow-xl">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#c5a255]">Resumen de tu reserva</p>

                {/* Habitación */}
                <div className={`mb-4 rounded-2xl bg-gradient-to-br ${TIPO_COLOR[habSeleccionada.tipo as TipoHabitacion] ?? 'from-slate-700 to-slate-900'} p-4 text-center`}>
                  <span className="text-4xl">{TIPO_EMOJI[habSeleccionada.tipo as TipoHabitacion] ?? '🏨'}</span>
                  <p className="mt-1 font-bold">Habitación {habSeleccionada.numero}</p>
                  <p className="text-xs text-white/60">{TIPO_LABEL[habSeleccionada.tipo as TipoHabitacion] ?? habSeleccionada.tipo} · Piso {habSeleccionada.piso}</p>
                </div>

                {/* Detalles */}
                <div className="space-y-2.5 border-t border-white/10 py-4 text-sm">
                  {[
                    { label: 'Check-in', value: busqueda.fechaEntrada },
                    { label: 'Check-out', value: busqueda.fechaSalida },
                    { label: 'Noches', value: `${noches}` },
                    { label: 'Huéspedes', value: `${busqueda.huespedes}` },
                    { label: 'Precio/noche', value: `S/${habSeleccionada.precio_noche ?? '0'}` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#c5a255]/15 px-4 py-3 ring-1 ring-[#c5a255]/20">
                  <span className="font-bold text-slate-200">Total</span>
                  <span className="text-2xl font-extrabold text-[#c5a255]">
                    S/{(parseFloat(habSeleccionada.precio_noche ?? '0') * noches).toFixed(2)}
                  </span>
                </div>

                <p className="mt-4 text-center text-[10px] text-slate-500">
                  Cancelación gratuita hasta 24h antes del check-in
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Confirmación ── */}
        {paso === 'confirmacion' && habSeleccionada && (
          <div className="mx-auto max-w-lg pb-12">
            <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
              {/* Header verde */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
                  ✅
                </div>
                <h2 className="text-2xl font-extrabold">¡Reserva Confirmada!</h2>
                <p className="mt-1 text-emerald-100">Tu estadía ha sido registrada exitosamente</p>
              </div>

              <div className="p-8">
                {/* Código */}
                <div className="mb-6 rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-200">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Código de confirmación</p>
                  <p className="text-3xl font-extrabold tracking-widest text-[#0c1d3d]">
                    {codigoConfirmacion || reservaId.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Guarda este código para tu check-in</p>
                </div>

                {/* Detalles */}
                <div className="mb-6 space-y-2.5">
                  {[
                    { icon: '👤', label: 'Huésped', value: `${cliente.nombre} ${cliente.apellido}` },
                    { icon: '🛏️', label: 'Habitación', value: `${habSeleccionada.numero} (${TIPO_LABEL[habSeleccionada.tipo as TipoHabitacion] ?? habSeleccionada.tipo})` },
                    { icon: '📅', label: 'Check-in', value: busqueda.fechaEntrada },
                    { icon: '📅', label: 'Check-out', value: busqueda.fechaSalida },
                    { icon: '🌙', label: 'Noches', value: `${noches}` },
                    { icon: '💰', label: 'Total', value: `S/${totalReserva || (parseFloat(habSeleccionada.precio_noche ?? '0') * noches).toFixed(2)}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span className="w-24 shrink-0 text-xs font-semibold text-slate-400">{item.label}</span>
                      <span className="text-sm font-medium text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>

                <p className="mb-6 rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-600 ring-1 ring-blue-200">
                  📧 Confirmación enviada a <strong>{cliente.email}</strong>
                </p>

                <button onClick={handleNuevaReserva}
                  className="btn-gold w-full rounded-2xl py-3.5 text-sm font-bold shadow-lg">
                  Hacer otra reserva
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
