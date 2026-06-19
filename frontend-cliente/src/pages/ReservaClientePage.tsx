// ═══════════════════════════════════════════════════════════
// HotelFlux — Página Pública de Reservación (Premium UI)
// Sin autenticación — flujo en 4 pasos mejorado
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { buscarDisponibilidad, crearReservaPublica, obtenerServicios, type HabitacionPublica, type ServicioCategoria } from '../services/publico.api';
import type { TipoHabitacion } from '../domain/types';
import { fromPromise } from '../domain/result';

// ── Tipos ──

interface DatosCliente {
  nombre: string; apellido: string; email: string;
  telefono: string; documento: string; nacionalidad: string;
}

interface BusquedaParams {
  fechaEntrada: string; fechaSalida: string; huespedes: number; tipo: TipoHabitacion | '';
}

type PasoReserva = 'busqueda' | 'seleccion' | 'servicios' | 'datos' | 'pago' | 'confirmacion';

type MetodoPagoUI = 'tarjeta_credito' | 'tarjeta_debito' | 'yape';

const METODO_INFO: Record<MetodoPagoUI, { label: string; emoji: string; desc: string; valor: string }> = {
  tarjeta_credito: { label: 'reserva.tarjeta_credito', emoji: '💳', desc: 'reserva.tarjeta_credito_desc', valor: 'tarjeta' },
  tarjeta_debito:  { label: 'reserva.tarjeta_debito',  emoji: '🏧', desc: 'reserva.tarjeta_debito_desc',  valor: 'tarjeta' },
  yape:            { label: 'reserva.yape',            emoji: '📱', desc: 'reserva.yape_desc',            valor: 'yape' },
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

const CAT_META: Record<string, { emoji: string; color: string; bg: string }> = {
  estacionamiento: { emoji: '🚗', color: 'from-sky-500 to-blue-700',   bg: 'bg-sky-50'    },
  lavanderia:      { emoji: '👔', color: 'from-cyan-500 to-teal-700',  bg: 'bg-cyan-50'   },
  minibar:         { emoji: '🍾', color: 'from-amber-400 to-orange-600', bg: 'bg-amber-50' },
  desayuno:        { emoji: '🍳', color: 'from-orange-400 to-red-600',  bg: 'bg-orange-50' },
  spa:             { emoji: '💆', color: 'from-purple-500 to-violet-700', bg: 'bg-purple-50'},
  excursiones:     { emoji: '🗺️', color: 'from-emerald-500 to-green-700', bg: 'bg-emerald-50'},
};
function getCatMeta(cat: string) {
  const key = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CAT_META[key] ?? { emoji: '🛎️', color: 'from-slate-500 to-slate-700', bg: 'bg-slate-50' };
}

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
  const { t } = useI18n();
  const pasos: { key: PasoReserva; label: string; emoji: string }[] = [
    { key: 'busqueda',     label: 'reserva.step1', emoji: '🔍' },
    { key: 'seleccion',   label: 'reserva.step2', emoji: '🛏️' },
    { key: 'servicios',   label: 'reserva.step3', emoji: '🛒' },
    { key: 'datos',       label: 'reserva.step4', emoji: '👤' },
    { key: 'pago',        label: 'reserva.step5', emoji: '💳' },
    { key: 'confirmacion', label: 'reserva.step6', emoji: '✅' },
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
                {t(s.label)}
              </span>
            </div>
            {i < 5 && (
              <div className={`mx-1 mb-4 h-0.5 w-5 rounded-full transition-all sm:w-10 sm:mx-1.5 ${i < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──

export default function ReservaClientePage() {
  const { usuario } = useAuth();
  const { t } = useI18n();
  const [paso, setPaso] = useState<PasoReserva>('busqueda');
  const [busqueda, setBusqueda] = useState<BusquedaParams>({
    fechaEntrada: hoyString(), fechaSalida: mananaString(), huespedes: 2, tipo: '',
  });
  const [habSeleccionada, setHabSeleccionada] = useState<HabitacionPublica | null>(null);
  const [disponibles, setDisponibles] = useState<HabitacionPublica[]>([]);
  const [cliente, setCliente] = useState<DatosCliente>(() => {
    if (usuario) {
      const partes = usuario.nombre.trim().split(' ');
      return {
        nombre: partes[0] ?? '',
        apellido: partes.slice(1).join(' '),
        email: usuario.email,
        telefono: '',
        documento: '',
        nacionalidad: '',
      };
    }
    return { nombre: '', apellido: '', email: '', telefono: '', documento: '', nacionalidad: '' };
  });
  const [metodoPago, setMetodoPago] = useState<MetodoPagoUI>('tarjeta_credito');
  const [serviciosCatalogo, setServiciosCatalogo] = useState<ServicioCategoria[]>([]);
  const [serviciosSelec, setServiciosSelec] = useState<Record<string, number>>({});
  const [catActiva, setCatActiva] = useState<string>('');
  const [mostrarLoginPrompt, setMostrarLoginPrompt] = useState(false);
  const [reservaId, setReservaId] = useState('');
  const [codigoConfirmacion, setCodigoConfirmacion] = useState('');
  const [totalReserva, setTotalReserva] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const noches = useMemo(
    () => calcularNoches(busqueda.fechaEntrada, busqueda.fechaSalida),
    [busqueda.fechaEntrada, busqueda.fechaSalida],
  );

  // Cargar catálogo de servicios al montar
  useEffect(() => {
    obtenerServicios().then(data => {
      setServiciosCatalogo(data);
      if (data.length > 0 && !catActiva) setCatActiva(data[0]!.categoria);
    }).catch(() => {});
  }, []);

  const serviciosTotal = useMemo(() => {
    return serviciosCatalogo.reduce((total, cat) =>
      cat.productos.reduce((t, p) => {
        const qty = serviciosSelec[p.id] ?? 0;
        return t + parseFloat(p.precio) * qty;
      }, total), 0);
  }, [serviciosCatalogo, serviciosSelec]);

  const totalConServicios = useMemo(() => {
    if (!habSeleccionada) return 0;
    return parseFloat(habSeleccionada.precio_noche ?? '0') * noches + serviciosTotal;
  }, [habSeleccionada, noches, serviciosTotal]);

  const serviciosParaApi = useMemo(() => {
    const allProducts = serviciosCatalogo.flatMap(c => c.productos);
    return Object.entries(serviciosSelec)
      .filter(([, qty]) => qty > 0)
      .map(([id, cantidad]) => {
        const prod = allProducts.find(p => p.id === id);
        return { id, nombre: prod?.nombre ?? '', precio: prod?.precio ?? '0', cantidad };
      });
  }, [serviciosCatalogo, serviciosSelec]);

  const handleBuscar = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    const result = await fromPromise(
      buscarDisponibilidad({
        fecha_entrada: busqueda.fechaEntrada,
        fecha_salida: busqueda.fechaSalida,
        tipo: busqueda.tipo || undefined,
        capacidad: busqueda.huespedes,
      }),
      (err) => err instanceof Error ? err : new Error('Error al buscar disponibilidad'),
    );
    if (result.ok) {
      setDisponibles(result.value.habitaciones);
      setPaso('seleccion');
    } else {
      setError(result.error.message);
    }
    setCargando(false);
  }, [busqueda]);

  const handleSeleccionar = useCallback((hab: HabitacionPublica) => {
    if (!usuario) {
      setMostrarLoginPrompt(true);
      return;
    }
    setHabSeleccionada(hab);
    setPaso('servicios');
  }, [usuario]);

  // Paso 2b → 3: continuar desde servicios extra
  const handleContinuarServicios = useCallback(() => {
    setPaso('datos');
  }, []);

  // Paso 3 → 4: guardar datos y avanzar al paso de pago
  const handleReservar = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPaso('pago');
  }, []);

  // Paso 4 → 5: seleccionar método de pago y crear reserva en BD
  const handlePagar = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!habSeleccionada) return;
    setError('');
    setCargando(true);
    const result = await fromPromise(
      crearReservaPublica({
        nombre: cliente.nombre, apellido: cliente.apellido, email: cliente.email,
        telefono: cliente.telefono, documento: cliente.documento, nacionalidad: cliente.nacionalidad,
        habitacion_id: habSeleccionada.id,
        fecha_entrada: busqueda.fechaEntrada, fecha_salida: busqueda.fechaSalida,
        metodo_pago: METODO_INFO[metodoPago].valor,
        servicios_extra: serviciosParaApi,
      }),
      (err) => err instanceof Error ? err : new Error('Error al procesar el pago'),
    );
    if (result.ok) {
      setReservaId(result.value.id);
      setCodigoConfirmacion(result.value.codigo_confirmacion);
      setTotalReserva(result.value.total);
      setPaso('confirmacion');
    } else {
      setError(result.error.message);
    }
    setCargando(false);
  }, [habSeleccionada, cliente, busqueda, metodoPago]);

  const handleNuevaReserva = useCallback(() => {
    setPaso('busqueda');
    setHabSeleccionada(null);
    setDisponibles([]);
    setCliente({ nombre: '', apellido: '', email: '', telefono: '', documento: '', nacionalidad: '' });
    setMetodoPago('tarjeta_credito');
    setServiciosSelec({});
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white">
      {/* ── Modal: login requerido ── */}
      {mostrarLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
            <div className="mb-4 text-5xl">🔒</div>
            <h3 className="mb-2 text-xl font-extrabold text-slate-800">{t('reserva.login_title')}</h3>
            <p className="mb-6 text-sm text-slate-500">{t('reserva.login_desc')}</p>
            <div className="flex flex-col gap-3">
              <Link to="/acceso"
                className="btn-gold w-full rounded-xl py-3 text-sm font-bold text-center block shadow-md">
                {t('reserva.login_btn')}
              </Link>
              <Link to="/registro"
                className="w-full rounded-xl border border-[#0c1d3d] py-3 text-sm font-bold text-[#0c1d3d] text-center block transition-all hover:bg-[#0c1d3d]/5">
                {t('reserva.register_btn')}
              </Link>
              <button onClick={() => setMostrarLoginPrompt(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1">
                {t('reserva.cancelar')}
              </button>
            </div>
          </div>
        </div>
      )}
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
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">{t('reserva.hero_tag')}</p>
            <h1 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
              {t('reserva.hero_title')}<br /><span className="text-[#c5a255]">{t('reserva.hero_gold')}</span>
            </h1>
            <p className="text-slate-400">{t('reserva.hero_desc')}</p>
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
              <h2 className="mb-6 text-xl font-extrabold text-slate-800">{t('reserva.buscar_title')}</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('reserva.fecha_entrada')}</label>
                  <input type="date" required min={hoyString()} value={busqueda.fechaEntrada}
                    onChange={(e) => setBusqueda((p) => ({ ...p, fechaEntrada: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('reserva.fecha_salida')}</label>
                  <input type="date" required min={busqueda.fechaEntrada || hoyString()} value={busqueda.fechaSalida}
                    onChange={(e) => setBusqueda((p) => ({ ...p, fechaSalida: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('reserva.huespedes')}</label>
                  <select value={busqueda.huespedes}
                    onChange={(e) => setBusqueda((p) => ({ ...p, huespedes: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} {t('reserva.huesped_option').replace('{n}', String(n))}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('reserva.tipo_hab')}</label>
                  <select value={busqueda.tipo}
                    onChange={(e) => setBusqueda((p) => ({ ...p, tipo: e.target.value as TipoHabitacion | '' }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10">
                    <option value="">{t('reserva.cualquier_tipo')}</option>
                    {(['simple', 'doble', 'suite', 'presidencial'] as TipoHabitacion[]).map((tipo) => (
                      <option key={tipo} value={tipo}>{TIPO_EMOJI[tipo]} {t('habitaciones.' + tipo)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Noches calculadas */}
              {busqueda.fechaEntrada && busqueda.fechaSalida && noches > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#c5a255]/8 px-4 py-2.5">
                  <span className="text-[#c5a255] text-lg">🌙</span>
                  <span className="text-sm font-semibold text-[#0c1d3d]">{t('reserva.noches').replace('{n}', String(noches))}</span>
                  <span className="text-xs text-slate-500">· {busqueda.fechaEntrada} → {busqueda.fechaSalida}</span>
                </div>
              )}

              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

              <button type="submit" disabled={cargando}
                className="btn-gold mt-6 w-full rounded-xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
                {cargando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('reserva.buscando')}
                  </span>
                ) : <>{'🔍'} {t('reserva.buscar_btn')}</>}
              </button>
            </form>

            {/* ¿Por qué HotelFlux? */}
            <div className="mt-10">
              <h2 className="mb-6 text-center text-xl font-bold text-slate-800">{t('reserva.porque_title')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: '⚡', title: t('reserva.feature1'), desc: t('reserva.feature1_desc') },
                  { icon: '🔓', title: t('reserva.feature2'), desc: t('reserva.feature2_desc') },
                  { icon: '💳', title: t('reserva.feature3'), desc: t('reserva.feature3_desc') },
                  { icon: '🛎️', title: t('reserva.feature4'), desc: t('reserva.feature4_desc') },
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
                <h2 className="text-xl font-extrabold text-slate-800">{t('reserva.habs_disponibles')}</h2>
                <p className="text-sm text-slate-500">
                  {t('reserva.resultados_subtitulo').replace('{entrada}', busqueda.fechaEntrada).replace('{salida}', busqueda.fechaSalida).replace('{n}', String(noches)).replace('{h}', String(busqueda.huespedes))}
                </p>
              </div>
              <button onClick={() => setPaso('busqueda')}
                className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
                ← {t('reserva.modificar')}
              </button>
            </div>

            {disponibles.length === 0 ? (
              <div className="rounded-3xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 text-5xl">😔</div>
                <p className="text-lg font-semibold text-slate-700">{t('reserva.sin_disp_title')}</p>
                <p className="mt-1 text-sm text-slate-400">{t('reserva.sin_disp_desc')}</p>
                <button onClick={() => setPaso('busqueda')} className="btn-gold mt-5 rounded-xl px-6 py-2.5 text-sm shadow-md">
                  {t('reserva.buscar_de_nuevo')}
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
                            {t('habitaciones.' + tipo) ?? hab.tipo}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-5xl">{TIPO_EMOJI[tipo] ?? '🏨'}</span>
                          <p className="mt-1 text-xs font-medium text-white/60">{t('reserva.piso_label')} {hab.piso}</p>
                        </div>
                        <div className="absolute right-3 top-3 text-right">
                          <div className="text-xl font-extrabold text-[#c5a255]">S/{hab.precio_noche ?? '0'}</div>
                          <div className="text-[9px] text-white/50">{t('habitaciones.noche')}</div>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="mb-1.5 text-base font-bold text-slate-800">{t('reserva.habitacion_label')} {hab.numero}</h3>
                        <div className="mb-3 flex flex-wrap gap-1">
                          {hab.amenidades.slice(0, 4).map((a) => (
                            <span key={a} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{a}</span>
                          ))}
                          {hab.amenidades.length > 4 && <span className="text-[10px] text-slate-400">+{hab.amenidades.length - 4}</span>}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                          <div>
                            <p className="text-xs text-slate-400">{t('reserva.noches').replace('{n}', String(noches))}</p>
                            <p className="text-base font-extrabold text-slate-800">S/{totalHab}</p>
                          </div>
                          <div className="rounded-xl bg-[#0c1d3d] px-4 py-2 text-xs font-bold text-[#c5a255] transition-all group-hover:bg-[#c5a255] group-hover:text-[#0c1d3d]">
                            {t('habitaciones.seleccionar')} →
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

        {/* ── Paso 3: Servicios extra ── */}
        {paso === 'servicios' && habSeleccionada && (
          <div>
            <button onClick={() => setPaso('seleccion')}
              className="mb-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
              ← {t('reserva.cambiar_hab')}
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              {/* ── Panel principal ── */}
              <div>
                {/* Header */}
                <div className="mb-5 rounded-3xl bg-gradient-to-r from-[#0c1d3d] to-[#1a3560] px-7 py-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">{t('reserva.personalizar')}</p>
                      <h2 className="text-2xl font-extrabold">{t('reserva.extras_title')}</h2>
                      <p className="mt-1 text-sm text-slate-400">{t('reserva.extras_desc')}</p>
                    </div>
                    {Object.values(serviciosSelec).some(v => v > 0) && (
                      <div className="shrink-0 rounded-2xl bg-[#c5a255]/20 px-4 py-2 text-center ring-1 ring-[#c5a255]/40">
                        <p className="text-lg font-extrabold text-[#c5a255]">
                          +S/{serviciosTotal.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400">{t('reserva.en_extras')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {serviciosCatalogo.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <svg className="h-6 w-6 animate-spin text-[#c5a255]" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="ml-3 text-sm text-slate-400">{t('reserva.cargando_servicios')}</span>
                  </div>
                ) : (
                  <>
                    {/* Tabs de categorías */}
                    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {serviciosCatalogo.map((cat) => {
                        const meta = getCatMeta(cat.categoria);
                        const selCount = cat.productos.reduce((n, p) => n + (serviciosSelec[p.id] ?? 0), 0);
                        const isActive = catActiva === cat.categoria;
                        return (
                          <button key={cat.categoria} type="button"
                            onClick={() => setCatActiva(cat.categoria)}
                            className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                              isActive
                                ? 'border-[#0c1d3d] bg-[#0c1d3d] text-[#c5a255] shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}>
                            <span>{meta.emoji}</span>
                            <span className="capitalize">{cat.categoria}</span>
                            {selCount > 0 && (
                              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                                isActive ? 'bg-[#c5a255] text-[#0c1d3d]' : 'bg-[#0c1d3d] text-white'
                              }`}>{selCount}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Grid de productos */}
                    {serviciosCatalogo.filter(c => c.categoria === catActiva).map((cat) => {
                      const meta = getCatMeta(cat.categoria);
                      return (
                        <div key={cat.categoria} className="grid gap-4 sm:grid-cols-2">
                          {cat.productos.map((prod) => {
                            const qty = serviciosSelec[prod.id] ?? 0;
                            const selected = qty > 0;
                            return (
                              <div key={prod.id}
                                className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-200 ${
                                  selected
                                    ? 'border-[#c5a255] shadow-lg shadow-[#c5a255]/15'
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                                }`}>

                                {/* Top band con gradiente */}
                                <div className={`bg-gradient-to-r ${meta.color} px-5 py-4 flex items-center justify-between`}>
                                  <span className="text-2xl">{meta.emoji}</span>
                                  {selected && (
                                    <span className="flex items-center gap-1 rounded-xl bg-white/20 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm">
                                      <IconCheck className="h-3 w-3" /> ×{qty}
                                    </span>
                                  )}
                                </div>

                                {/* Contenido */}
                                <div className={`p-5 ${selected ? 'bg-[#c5a255]/4' : 'bg-white'}`}>
                                  <p className="mb-0.5 text-[15px] font-bold leading-snug text-slate-800">{prod.nombre}</p>
                                  {prod.descripcion && (
                                    <p className="mb-3 text-xs leading-relaxed text-slate-400">{prod.descripcion}</p>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-xl font-extrabold text-[#0c1d3d]">S/{prod.precio}</span>
                                      <span className="ml-1 text-[11px] text-slate-400">{t('reserva.unidad')}</span>
                                    </div>

                                    {/* Controles qty */}
                                    <div className="flex items-center gap-2">
                                      <button type="button"
                                        onClick={() => setServiciosSelec(p => ({ ...p, [prod.id]: Math.max(0, (p[prod.id] ?? 0) - 1) }))}
                                        disabled={qty === 0}
                                        className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition-all ${
                                          qty > 0
                                            ? 'bg-slate-800 text-white shadow-md hover:bg-slate-700 active:scale-95'
                                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                        }`}>
                                        −
                                      </button>
                                      <span className={`w-6 text-center text-base font-extrabold transition-all ${
                                        qty > 0 ? 'text-[#0c1d3d]' : 'text-slate-300'
                                      }`}>{qty}</span>
                                      <button type="button"
                                        onClick={() => setServiciosSelec(p => ({ ...p, [prod.id]: (p[prod.id] ?? 0) + 1 }))}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#c5a255] to-[#a8832f] text-white text-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition-all">
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {selected && (
                                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#c5a255]/10 px-3 py-2 ring-1 ring-[#c5a255]/20">
                                      <span className="text-xs text-slate-500">{t('reserva.subtotal')}</span>
                                      <span className="text-sm font-extrabold text-[#0c1d3d]">
                                        S/{(parseFloat(prod.precio) * qty).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}

                <button type="button" onClick={handleContinuarServicios}
                  className="btn-gold mt-8 w-full rounded-2xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98]">
                  {serviciosParaApi.length > 0
                    ? `${t('reserva.continuar_extras').replace('{n}', String(serviciosParaApi.reduce((n, s) => n + s.cantidad, 0)))} →`
                    : `${t('reserva.continuar_sin')} →`}
                </button>
              </div>

              {/* ── Panel lateral: resumen ── */}
              <div className="h-fit rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-6 text-white shadow-xl">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#c5a255]">{t('reserva.tu_reserva')}</p>

                {/* Room card */}
                <div className={`mb-4 rounded-2xl bg-gradient-to-br ${TIPO_COLOR[habSeleccionada.tipo as TipoHabitacion] ?? 'from-slate-700 to-slate-900'} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{TIPO_EMOJI[habSeleccionada.tipo as TipoHabitacion] ?? '🏨'}</span>
                    <div>
                      <p className="font-bold">{t('reserva.habitacion_label')} {habSeleccionada.numero}</p>
                      <p className="text-xs text-white/60">{t('habitaciones.' + (habSeleccionada.tipo as TipoHabitacion)) ?? habSeleccionada.tipo} · {t('reserva.piso_label')} {habSeleccionada.piso}</p>
                    </div>
                  </div>
                </div>

                {/* Desglose */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('reserva.alojamiento')}</span>
                    <span className="font-semibold">S/{(parseFloat(habSeleccionada.precio_noche ?? '0') * noches).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t('reserva.noches_detalle').replace('{n}', String(noches)).replace('{precio}', habSeleccionada.precio_noche ?? '0')}</span>
                  </div>

                  {serviciosParaApi.length > 0 && (
                    <>
                      <div className="border-t border-white/10 pt-2.5">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c5a255]">{t('reserva.extras')}</p>
                        {serviciosParaApi.map(s => (
                          <div key={s.id} className="mb-1.5 flex items-start justify-between gap-2">
                            <span className="text-xs text-slate-400 leading-relaxed">{s.nombre} ×{s.cantidad}</span>
                            <span className="shrink-0 text-xs font-semibold">S/{(parseFloat(s.precio) * s.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#c5a255]/15 px-4 py-3 ring-1 ring-[#c5a255]/20">
                    <span className="font-bold text-slate-200">{t('reserva.total_estimado')}</span>
                    <span className="text-xl font-extrabold text-[#c5a255]">S/{totalConServicios.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-slate-500">{t('reserva.pie_extras')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Datos del huésped ── */}
        {paso === 'datos' && habSeleccionada && (
          <div>
            <button onClick={() => setPaso('servicios')}
              className="mb-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
              ← {t('reserva.cambiar_hab')}
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Formulario */}
              <form onSubmit={handleReservar}
                className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-6 text-xl font-extrabold text-slate-800">{t('reserva.datos_title')}</h2>

                {/* Banner autofill cuando hay sesión */}
                {usuario && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <p className="text-sm text-emerald-700">
                      {t('reserva.datos_autofill')}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { id: 'nombre', label: t('reserva.nombre'), type: 'text', placeholder: t('reserva.placeholder_nombre'), key: 'nombre' as const },
                    { id: 'apellido', label: t('reserva.apellido'), type: 'text', placeholder: t('reserva.placeholder_apellido'), key: 'apellido' as const },
                    { id: 'email', label: t('reserva.email'), type: 'email', placeholder: t('reserva.placeholder_email'), key: 'email' as const },
                    { id: 'telefono', label: t('reserva.telefono'), type: 'tel', placeholder: t('reserva.placeholder_telefono'), key: 'telefono' as const },
                    { id: 'documento', label: t('reserva.documento'), type: 'text', placeholder: t('reserva.placeholder_documento'), key: 'documento' as const },
                    { id: 'nacionalidad', label: t('reserva.nacionalidad'), type: 'text', placeholder: t('reserva.placeholder_nacionalidad'), key: 'nacionalidad' as const },
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
                    {t('reserva.privacy')}
                  </p>
                </div>

                {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

                <button type="submit"
                  className="btn-gold mt-6 w-full rounded-xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98]">
                  {t('reserva.continuar_pago')} →
                </button>
              </form>

              {/* Resumen reserva */}
              <div className="h-fit rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-6 text-white shadow-xl">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#c5a255]">{t('reserva.resumen_title')}</p>

                {/* Habitación */}
                <div className={`mb-4 rounded-2xl bg-gradient-to-br ${TIPO_COLOR[habSeleccionada.tipo as TipoHabitacion] ?? 'from-slate-700 to-slate-900'} p-4 text-center`}>
                  <span className="text-4xl">{TIPO_EMOJI[habSeleccionada.tipo as TipoHabitacion] ?? '🏨'}</span>
                  <p className="mt-1 font-bold">{t('reserva.habitacion_label')} {habSeleccionada.numero}</p>
                  <p className="text-xs text-white/60">{t('habitaciones.' + (habSeleccionada.tipo as TipoHabitacion)) ?? habSeleccionada.tipo} · {t('reserva.piso_label')} {habSeleccionada.piso}</p>
                </div>

                {/* Detalles */}
                <div className="space-y-2.5 border-t border-white/10 py-4 text-sm">
                  {[
                    { label: t('reserva.checkin'), value: busqueda.fechaEntrada },
                    { label: t('reserva.checkout'), value: busqueda.fechaSalida },
                    { label: t('reserva.noches_label'), value: `${noches}` },
                    { label: t('reserva.huespedes_label'), value: `${busqueda.huespedes}` },
                    { label: t('reserva.precio_noche'), value: `S/${habSeleccionada.precio_noche ?? '0'}` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#c5a255]/15 px-4 py-3 ring-1 ring-[#c5a255]/20">
                  <span className="font-bold text-slate-200">{t('reserva.total')}</span>
                  <span className="text-2xl font-extrabold text-[#c5a255]">
                    S/{totalConServicios.toFixed(2)}
                  </span>
                </div>

                <p className="mt-4 text-center text-[10px] text-slate-500">
                  {t('reserva.cancelacion_gratis')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 5: Pago ── */}
        {paso === 'pago' && habSeleccionada && (
          <div className="mx-auto max-w-2xl">
            <button onClick={() => setPaso('datos')}
              className="mb-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#c5a255] transition-all hover:bg-[#c5a255]/5">
              ← {t('reserva.volver_datos')}
            </button>

            <form onSubmit={handlePagar} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
              <h2 className="mb-2 text-xl font-extrabold text-slate-800">{t('reserva.metodo_pago_title')}</h2>
              <p className="mb-6 text-sm text-slate-500">{t('reserva.metodo_pago_desc')}</p>

              {/* Métodos de pago */}
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.entries(METODO_INFO) as [MetodoPagoUI, typeof METODO_INFO[MetodoPagoUI]][]).map(([key, info]) => (
                  <button key={key} type="button"
                    onClick={() => setMetodoPago(key)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all ${
                      metodoPago === key
                        ? 'border-[#c5a255] bg-[#c5a255]/8 shadow-md'
                        : 'border-slate-200 hover:border-[#c5a255]/40 hover:bg-slate-50'
                    }`}>
                    <span className="text-4xl">{info.emoji}</span>
                    <span className="text-sm font-bold text-slate-800">{t('reserva.' + key)}</span>
                    <span className="text-[11px] text-slate-500">{t('reserva.' + key + '_desc')}</span>
                    {metodoPago === key && (
                      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c5a255]">
                        <IconCheck className="text-white h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Resumen del total */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-5 text-white">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#c5a255]">{t('reserva.resumen_pago')}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{t('reserva.habitacion_label')} {habSeleccionada.numero}</span>
                    <span>S/{habSeleccionada.precio_noche ?? '0'}{t('habitaciones.noche')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">{t('reserva.noches_label')}</span>
                    <span>× {noches}</span>
                  </div>
                  {serviciosParaApi.length > 0 && (
                    <>
                      <div className="border-t border-white/10 pt-2">
                        {serviciosParaApi.map(s => (
                          <div key={s.id} className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{s.nombre} ×{s.cantidad}</span>
                            <span>S/{(parseFloat(s.precio) * s.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="text-slate-300">{t('reserva.metodo_label')}</span>
                    <span>{METODO_INFO[metodoPago].emoji} {t('reserva.' + metodoPago)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#c5a255]/15 px-4 py-3 ring-1 ring-[#c5a255]/20">
                  <span className="font-bold">{t('reserva.total_pagar')}</span>
                  <span className="text-2xl font-extrabold text-[#c5a255]">
                    S/{totalConServicios.toFixed(2)}
                  </span>
                </div>
              </div>

              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

              <button type="submit" disabled={cargando}
                className="btn-gold mt-6 w-full rounded-xl py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
                {cargando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('reserva.procesando')}
                  </span>
                ) : <>{'💳'} {t('reserva.pagar')} S/{totalConServicios.toFixed(2)}</>}
              </button>
            </form>
          </div>
        )}

        {/* ── Paso 6: Confirmación ── */}
        {paso === 'confirmacion' && habSeleccionada && (
          <div className="mx-auto max-w-lg pb-12">
            <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
              {/* Header verde */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm">
                  ✅
                </div>
                <h2 className="text-2xl font-extrabold">{t('reserva.confirmado_title')}</h2>
                <p className="mt-1 text-emerald-100">{t('reserva.confirmado_desc')}</p>
              </div>

              <div className="p-8">
                {/* Código */}
                <div className="mb-6 rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-200">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{t('reserva.codigo')}</p>
                  <p className="text-3xl font-extrabold tracking-widest text-[#0c1d3d]">
                    {codigoConfirmacion || reservaId.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{t('reserva.guarda_codigo')}</p>
                </div>

                {/* Detalles */}
                <div className="mb-6 space-y-2.5">
                  {[
                    { icon: '👤', label: t('reserva.huesped_label'), value: `${cliente.nombre} ${cliente.apellido}` },
                    { icon: '🛏️', label: t('reserva.habitacion_label'), value: `${habSeleccionada.numero} (${t('habitaciones.' + (habSeleccionada.tipo as TipoHabitacion)) ?? habSeleccionada.tipo})` },
                    { icon: '📅', label: t('reserva.checkin'), value: busqueda.fechaEntrada },
                    { icon: '📅', label: t('reserva.checkout'), value: busqueda.fechaSalida },
                    { icon: '🌙', label: t('reserva.noches_label'), value: `${noches}` },
                    { icon: '💰', label: t('reserva.total'), value: `S/${totalReserva || totalConServicios.toFixed(2)}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span className="w-24 shrink-0 text-xs font-semibold text-slate-400">{item.label}</span>
                      <span className="text-sm font-medium text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>

                <p className="mb-6 rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-600 ring-1 ring-blue-200">
                  📧 {t('reserva.confirmacion_email').replace('{email}', cliente.email)}
                </p>

                <button onClick={handleNuevaReserva}
                  className="btn-gold w-full rounded-2xl py-3.5 text-sm font-bold shadow-lg">
                  {t('reserva.otra_reserva')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
