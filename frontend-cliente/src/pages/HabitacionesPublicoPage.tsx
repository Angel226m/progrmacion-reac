// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Habitaciones (Público)
// Vitrina premium: tipos + galería + búsqueda de disponibilidad
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  obtenerTiposHabitacion,
  buscarDisponibilidad,
  type TipoHabitacionInfo,
  type HabitacionPublica,
} from '../services/publico.api';
import type { TipoHabitacion } from '../domain/types';

// ── Helpers de fecha ──

function hoyStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0]!;
}

function nombreMes(date: Date): string {
  return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

function primerDiaSemana(anio: number, mes: number): number {
  const d = new Date(anio, mes, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

// ── Datos estáticos de tipos ──

const TIPOS_INFO: Record<string, {
  label: string;
  tagline: string;
  desc: string;
  capacidad: string;
  amenidades: string[];
  gradiente: string;
  icon: string;
  badge: string;
}> = {
  simple: {
    label: 'Habitación Simple',
    tagline: 'Confort esencial, precio justo',
    desc: 'Habitaciones compactas e íntimas diseñadas para el viajero individual que valora la comodidad sin renunciar al lujo.',
    capacidad: '1 huésped',
    amenidades: ['Cama individual premium', 'WiFi fibra óptica', 'TV 4K 43"', 'Caja fuerte digital', 'Aire acondicionado', 'Baño privado'],
    gradiente: 'from-slate-700 to-slate-900',
    icon: '🛏️',
    badge: 'Ideal para negocios',
  },
  doble: {
    label: 'Habitación Doble',
    tagline: 'Espacio para dos, vista privilegiada',
    desc: 'Amplias habitaciones con cama matrimonial king o queen, perfectas para parejas y viajeros que buscan más espacio y vistas espectaculares.',
    capacidad: '1–2 huéspedes',
    amenidades: ['Cama king o queen', 'Vista piscina o jardín', 'WiFi fibra óptica', 'TV 4K 55"', 'Minibar incluido', 'Balcón privado'],
    gradiente: 'from-blue-800 to-blue-950',
    icon: '🛏️',
    badge: 'Más popular',
  },
  suite: {
    label: 'Suite Premium',
    tagline: 'Lujo sin límites, experiencia total',
    desc: 'Suites de alto standing con sala de estar independiente, jacuzzi privado y vistas panorámicas al mar o ciudad. Una experiencia que trasciende.',
    capacidad: '1–4 huéspedes',
    amenidades: ['Sala de estar privada', 'Jacuzzi premium', 'Vista panorámica al mar', 'Cama king XL', 'Servicio de mayordomo', 'Terraza o balcón'],
    gradiente: 'from-amber-700 to-amber-900',
    icon: '✨',
    badge: 'Lujo total',
  },
  presidencial: {
    label: 'Suite Presidencial',
    tagline: 'La cima del lujo y el confort',
    desc: 'Nuestra suite más exclusiva ocupa el ático completo con vistas de 360°, cocina gourmet equipada, comedor privado y acceso a servicios VIP ilimitados.',
    capacidad: '1–6 huéspedes',
    amenidades: ['Vista 360° panorámica', 'Jacuzzi + sauna privado', 'Cocina gourmet equipada', 'Comedor para 8 pax', 'Mayordomo 24h', 'Terraza privada'],
    gradiente: 'from-purple-800 to-purple-950',
    icon: '👑',
    badge: 'Exclusivo',
  },
};

// ── Calendario ──

interface CalendarioProps {
  readonly diasOcupados: Set<string>;
  readonly fechaEntrada: string;
  readonly fechaSalida: string;
  readonly onSeleccionarEntrada: (f: string) => void;
  readonly onSeleccionarSalida: (f: string) => void;
}

function CalendarioDisponibilidad({ diasOcupados, fechaEntrada, fechaSalida, onSeleccionarEntrada, onSeleccionarSalida }: CalendarioProps) {
  const hoy = new Date();
  const [mesOffset, setMesOffset] = useState(0);

  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth();

  const diasMes = diasEnMes(anio, mes);
  const primerDia = primerDiaSemana(anio, mes);

  const celdas: (number | null)[] = useMemo(() => [
    ...Array.from({ length: primerDia }, () => null as null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ], [primerDia, diasMes]);

  const formatFecha = useCallback((dia: number) => {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }, [anio, mes]);

  const esPasado = useCallback((dia: number) => {
    const f = new Date(anio, mes, dia);
    const h = new Date(); h.setHours(0, 0, 0, 0);
    return f < h;
  }, [anio, mes]);

  const handleClick = useCallback((dia: number) => {
    const fecha = formatFecha(dia);
    if (esPasado(dia) || diasOcupados.has(fecha)) return;
    if (!fechaEntrada || fechaSalida || fecha < fechaEntrada) {
      onSeleccionarEntrada(fecha); onSeleccionarSalida('');
    } else {
      onSeleccionarSalida(fecha);
    }
  }, [formatFecha, esPasado, diasOcupados, fechaEntrada, fechaSalida, onSeleccionarEntrada, onSeleccionarSalida]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMesOffset(mesOffset - 1)} disabled={mesOffset <= 0}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-bold capitalize text-slate-800">{nombreMes(mesActual)}</span>
        <button onClick={() => setMesOffset(mesOffset + 1)} disabled={mesOffset >= 5}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`e-${i}`} />;
          const fecha = formatFecha(dia);
          const pasado = esPasado(dia);
          const ocupado = diasOcupados.has(fecha);
          const esEntrada = fecha === fechaEntrada;
          const esSalida = fecha === fechaSalida;
          const enRango = fechaEntrada && fechaSalida && fecha > fechaEntrada && fecha < fechaSalida;
          return (
            <button key={fecha} onClick={() => handleClick(dia)} disabled={pasado || ocupado}
              className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                esEntrada || esSalida
                  ? 'bg-[#c5a255] text-[#0c1d3d] font-bold shadow-md'
                  : enRango ? 'bg-[#c5a255]/15 text-[#c5a255]'
                  : ocupado ? 'cursor-not-allowed bg-red-50 text-red-300 line-through'
                  : pasado ? 'cursor-not-allowed text-slate-200'
                  : 'text-slate-600 hover:bg-[#c5a255]/8 hover:text-[#c5a255]'
              }`}>
              {dia}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[#c5a255]" /> Seleccionado</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[#c5a255]/15" /> Rango</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-100 ring-1 ring-red-200" /> Ocupado</span>
      </div>
    </div>
  );
}

// ── Componente Principal ──

export default function HabitacionesPublicoPage() {
  const [tipos, setTipos] = useState<TipoHabitacionInfo[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TipoHabitacion | ''>('');
  const [fechaEntrada, setFechaEntrada] = useState(hoyStr());
  const [fechaSalida, setFechaSalida] = useState(sumarDias(hoyStr(), 1));
  const [disponibles, setDisponibles] = useState<HabitacionPublica[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [vistaActiva, setVistaActiva] = useState<'vitrina' | 'buscar'>('vitrina');

  const diasOcupados = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    obtenerTiposHabitacion().then(setTipos).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!fechaEntrada || !fechaSalida) return;
    setBuscando(true);
    try {
      const res = await buscarDisponibilidad({ fecha_entrada: fechaEntrada, fecha_salida: fechaSalida, tipo: filtroTipo || undefined });
      setDisponibles(res.habitaciones);
      setBuscado(true);
    } catch {
      setDisponibles([]);
      setBuscado(true);
    } finally {
      setBuscando(false);
    }
  }, [fechaEntrada, fechaSalida, filtroTipo]);

  const tiposOrden: TipoHabitacion[] = ['simple', 'doble', 'suite', 'presidencial'];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-16 sm:py-24">
        <div className="absolute inset-0 opacity-[0.05]">
          <svg className="h-full w-full" viewBox="0 0 1200 400">
            <defs>
              <pattern id="hg2" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0L0 0 0 80" fill="none" stroke="white" strokeWidth="0.4"/>
                <path d="M80 80L80 0 0 0" fill="none" stroke="white" strokeWidth="0.2"/>
              </pattern>
            </defs>
            <rect width="1200" height="400" fill="url(#hg2)"/>
          </svg>
        </div>
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-[#c5a255]/10 blur-[80px]" />
        <div className="absolute -right-20 bottom-10 h-48 w-48 rounded-full bg-[#c5a255]/8 blur-[60px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">Alojamiento Premium</p>
            <h1 className="mb-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Nuestras <span className="text-[#c5a255]">Habitaciones</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
              Cuatro categorías de lujo para cada tipo de viajero. Desde habitaciones íntimas hasta suites presidenciales con vistas de 360°.
            </p>
            {/* Stats */}
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-6">
              {[
                { num: '20', label: 'Habitaciones' },
                { num: '4', label: 'Categorías' },
                { num: '4', label: 'Pisos' },
                { num: '98%', label: 'Satisfacción' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-extrabold text-[#c5a255]">{s.num}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-10 flex justify-center gap-2">
            <button
              onClick={() => setVistaActiva('vitrina')}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                vistaActiva === 'vitrina' ? 'bg-[#c5a255] text-[#0c1d3d]' : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Ver todas las habitaciones
            </button>
            <button
              onClick={() => setVistaActiva('buscar')}
              className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                vistaActiva === 'buscar' ? 'bg-[#c5a255] text-[#0c1d3d]' : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Buscar disponibilidad
            </button>
          </div>
        </div>
      </section>

      {/* ── VISTA: Vitrina de tipos ── */}
      {vistaActiva === 'vitrina' && (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Resumen de disponibilidad */}
          {tipos.length > 0 && (
            <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tipos.map((t) => (
                <div key={t.tipo} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                  <div className={`mx-auto mb-2 text-2xl`}>{TIPOS_INFO[t.tipo]?.icon ?? '🏨'}</div>
                  <div className="text-sm font-semibold text-slate-700 capitalize">{t.tipo}</div>
                  <div className={`mt-1 text-xs font-bold ${t.disponibles > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.disponibles} disponibles
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards de tipos — una por una */}
          <div className="space-y-16">
            {tiposOrden.map((tipo, idx) => {
              const info = TIPOS_INFO[tipo];
              if (!info) return null;
              const isReversed = idx % 2 === 1;
              const tipoInfo = Array.isArray(tipos) ? tipos.find((t) => t.tipo === tipo) : null;
              const precioDesde = tipoInfo?.precio_desde ? parseFloat(tipoInfo.precio_desde).toFixed(0) : null;
              return (
                <div key={tipo} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
                  <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
                    {/* Imagen / Gradiente visual */}
                    <div className={`relative flex w-full items-center justify-center bg-gradient-to-br ${info.gradiente} lg:w-2/5 overflow-hidden`}
                      style={{ minHeight: '320px' }}>
                      {/* Pattern overlay */}
                      <div className="absolute inset-0 opacity-10">
                        <svg className="h-full w-full" viewBox="0 0 400 400">
                          <defs>
                            <pattern id={`p-${tipo}`} width="40" height="40" patternUnits="userSpaceOnUse">
                              <circle cx="20" cy="20" r="1" fill="white"/>
                            </pattern>
                          </defs>
                          <rect width="400" height="400" fill={`url(#p-${tipo})`}/>
                        </svg>
                      </div>
                      {/* Badge tipo */}
                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                          {info.badge}
                        </span>
                      </div>
                      {/* Precio destaque */}
                      <div className="absolute right-4 top-4 text-right">
                        <div className="text-xs font-medium text-white/60">desde</div>
                        <div className="text-3xl font-extrabold text-[#c5a255]">
                          {precioDesde ? `S/${precioDesde}` : '—'}
                        </div>
                        <div className="text-xs text-white/60">/ noche</div>
                      </div>
                      {/* Icono central */}
                      <div className="relative flex flex-col items-center">
                        <span className="text-7xl">{info.icon}</span>
                        <span className="mt-3 text-sm font-semibold text-white/70">{info.capacidad}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a255]">
                        {info.capacidad}
                      </p>
                      <h2 className="mb-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">{info.label}</h2>
                      <p className="mb-1 text-base font-semibold italic text-slate-500">{info.tagline}</p>
                      <p className="mb-6 text-sm leading-relaxed text-slate-500">{info.desc}</p>

                      {/* Amenidades */}
                      <div className="mb-6 grid grid-cols-2 gap-2">
                        {info.amenidades.map((a) => (
                          <div key={a} className="flex items-center gap-2">
                            <svg className="h-4 w-4 shrink-0 text-[#c5a255]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span className="text-xs text-slate-600">{a}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={`/reservar?tipo=${tipo}`}
                          className="btn-gold rounded-xl px-6 py-3 text-sm shadow-lg"
                        >
                          Reservar ahora
                        </Link>
                        <button
                          onClick={() => { setFiltroTipo(tipo); setVistaActiva('buscar'); }}
                          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-all hover:border-[#c5a255] hover:text-[#c5a255]"
                        >
                          Ver disponibilidad
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diferenciadores */}
          <div className="mt-16 rounded-3xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-8 sm:p-12">
            <h2 className="mb-2 text-center text-2xl font-bold text-white">Incluido en todas las habitaciones</h2>
            <p className="mb-8 text-center text-sm text-slate-400">Sin importar la categoría, cada estancia incluye estas prestaciones</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: '🌐', title: 'WiFi Fibra Óptica', desc: '1 Gbps en todas las áreas' },
                { icon: '🛡️', title: 'Caja Fuerte Digital', desc: 'Código personal en habitación' },
                { icon: '☕', title: 'Bienvenida Cortesía', desc: 'Café, té o infusión' },
                { icon: '🛎️', title: 'Concierge 24/7', desc: 'Atención personalizada' },
                { icon: '🏊', title: 'Piscina', desc: 'Climatizada todo el año' },
                { icon: '🏋️', title: 'Gimnasio 24h', desc: 'Equipamiento de última generación' },
                { icon: '🅿️', title: 'Estacionamiento', desc: 'Techado y vigilado' },
                { icon: '♿', title: 'Accesibilidad', desc: 'Habitaciones adaptadas disponibles' },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 transition-all hover:bg-white/10">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA: Buscar disponibilidad ── */}
      {vistaActiva === 'buscar' && (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Panel izquierdo */}
            <div className="space-y-5 lg:col-span-1">
              {/* Filtro tipo */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-800">Filtrar por categoría</h2>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFiltroTipo('')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      filtroTipo === '' ? 'bg-[#0c1d3d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    Todas
                  </button>
                  {tiposOrden.map((t) => (
                    <button key={t} onClick={() => setFiltroTipo(t)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        filtroTipo === t ? 'bg-[#0c1d3d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      <span>{TIPOS_INFO[t]?.icon}</span>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendario */}
              <CalendarioDisponibilidad
                diasOcupados={diasOcupados}
                fechaEntrada={fechaEntrada}
                fechaSalida={fechaSalida}
                onSeleccionarEntrada={setFechaEntrada}
                onSeleccionarSalida={setFechaSalida}
              />

              {/* Fechas + Buscar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Check-in</label>
                    <input type="date" value={fechaEntrada} min={hoyStr()}
                      onChange={(e) => setFechaEntrada(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#c5a255] focus:outline-none focus:ring-2 focus:ring-[#c5a255]/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Check-out</label>
                    <input type="date" value={fechaSalida} min={sumarDias(fechaEntrada, 1)}
                      onChange={(e) => setFechaSalida(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#c5a255] focus:outline-none focus:ring-2 focus:ring-[#c5a255]/20" />
                  </div>
                </div>
                <button onClick={buscar} disabled={buscando || !fechaEntrada || !fechaSalida}
                  className="btn-gold w-full rounded-xl py-3 text-sm shadow-md disabled:opacity-50">
                  {buscando ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Buscando...
                    </span>
                  ) : '🔍 Buscar Disponibilidad'}
                </button>
              </div>

              {/* Resumen tipos */}
              {tipos.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Disponibilidad actual</h3>
                  <div className="space-y-2">
                    {tipos.map((t) => (
                      <div key={t.tipo} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-600 capitalize">
                          <span>{TIPOS_INFO[t.tipo]?.icon}</span>{t.tipo}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          t.disponibles > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {t.disponibles} disp.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel derecho: Resultados */}
            <div className="lg:col-span-2">
              {!buscado ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0c1d3d]/5 text-4xl">🔍</div>
                  <h3 className="text-lg font-semibold text-slate-700">Seleccione sus fechas</h3>
                  <p className="mt-1 max-w-xs text-sm text-slate-400">Use el calendario o los campos de fecha y haga clic en "Buscar Disponibilidad"</p>
                </div>
              ) : disponibles.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
                  <div className="mb-4 text-5xl">😔</div>
                  <h3 className="text-lg font-semibold text-slate-700">Sin disponibilidad</h3>
                  <p className="mt-1 max-w-xs text-sm text-slate-400">No hay habitaciones disponibles para esas fechas. Intente con otras fechas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-600">
                      <span className="text-[#c5a255] text-lg font-extrabold">{disponibles.length}</span> habitación{disponibles.length > 1 ? 'es' : ''} disponible{disponibles.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-400">{fechaEntrada} → {fechaSalida}</p>
                  </div>
                  {disponibles.map((hab) => {
                    const noches = Math.max(1, Math.ceil((new Date(fechaSalida).getTime() - new Date(fechaEntrada).getTime()) / 86400000));
                    const total = hab.precio_noche ? (parseFloat(hab.precio_noche) * noches).toFixed(2) : null;
                    const tipoInfo = TIPOS_INFO[hab.tipo];

                    return (
                      <div key={hab.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:border-[#c5a255]/20">
                        <div className="flex flex-col sm:flex-row">
                          {/* Visual */}
                          <div className={`flex h-40 w-full shrink-0 items-center justify-center bg-gradient-to-br ${tipoInfo?.gradiente ?? 'from-slate-700 to-slate-900'} sm:h-auto sm:w-44`}>
                            <div className="text-center">
                              <span className="text-5xl">{tipoInfo?.icon ?? '🏨'}</span>
                              <p className="mt-1 text-xs font-semibold text-white/60">Piso {hab.piso}</p>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col justify-between p-5">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800">Hab. {hab.numero} — {hab.tipo.charAt(0).toUpperCase() + hab.tipo.slice(1)}</h3>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Disponible</span>
                              </div>
                              {hab.amenidades.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {hab.amenidades.slice(0, 5).map((a) => (
                                    <span key={a} className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">{a}</span>
                                  ))}
                                  {hab.amenidades.length > 5 && (
                                    <span className="text-[11px] text-slate-400">+{hab.amenidades.length - 5} más</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex flex-col items-start justify-between gap-3 border-t border-slate-50 pt-3 sm:flex-row sm:items-center">
                              <div>
                                {hab.precio_noche && (
                                  <>
                                    <span className="text-2xl font-extrabold text-[#0c1d3d]">S/ {hab.precio_noche}</span>
                                    <span className="text-xs text-slate-400"> / noche</span>
                                    {total && <p className="text-xs text-slate-400 mt-0.5">{noches} noche{noches > 1 ? 's' : ''}: <span className="font-bold text-slate-700">S/ {total}</span></p>}
                                  </>
                                )}
                              </div>
                              <Link
                                to={`/reservar?hab=${hab.id}&entrada=${fechaEntrada}&salida=${fechaSalida}`}
                                className="btn-gold shrink-0 rounded-xl px-5 py-2.5 text-sm shadow-md"
                              >
                                Seleccionar →
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
