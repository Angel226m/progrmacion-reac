// ═══════════════════════════════════════════════════════════
// HotelFlux — Página de Habitaciones (Público)
// Galería de habitaciones con filtros y calendario de disponibilidad
// Responsive: PC, tablet, laptop, celular
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
import { IconBed, IconBedDouble, IconCrown, IconStar } from '../components/shared/Icons';

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
  return d === 0 ? 6 : d - 1; // Lunes = 0
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

// ── Calendario de Disponibilidad ──

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

  const celdas: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = Array.from({ length: primerDia }, () => null);
    for (let d = 1; d <= diasMes; d++) arr.push(d);
    return arr;
  }, [primerDia, diasMes]);

  const formatFecha = useCallback((dia: number) => {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }, [anio, mes]);

  const esPasado = useCallback((dia: number) => {
    const f = new Date(anio, mes, dia);
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return f < h;
  }, [anio, mes]);

  const handleClick = useCallback((dia: number) => {
    const fecha = formatFecha(dia);
    if (esPasado(dia) || diasOcupados.has(fecha)) return;
    
    if (!fechaEntrada || fechaSalida || fecha < fechaEntrada) {
      onSeleccionarEntrada(fecha);
      onSeleccionarSalida('');
    } else {
      onSeleccionarSalida(fecha);
    }
  }, [formatFecha, esPasado, diasOcupados, fechaEntrada, fechaSalida, onSeleccionarEntrada, onSeleccionarSalida]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMesOffset(mesOffset - 1)}
          disabled={mesOffset <= 0}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="text-sm font-bold capitalize text-slate-800">{nombreMes(mesActual)}</h3>
        <button
          onClick={() => setMesOffset(mesOffset + 1)}
          disabled={mesOffset >= 5}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Días de la semana */}
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-slate-400">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => <span key={d}>{d}</span>)}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`e-${i}`} />;

          const fecha = formatFecha(dia);
          const pasado = esPasado(dia);
          const ocupado = diasOcupados.has(fecha);
          const esEntrada = fecha === fechaEntrada;
          const esSalida = fecha === fechaSalida;
          const enRango = fechaEntrada && fechaSalida && fecha > fechaEntrada && fecha < fechaSalida;
          const deshabilitado = pasado || ocupado;

          return (
            <button
              key={fecha}
              onClick={() => handleClick(dia)}
              disabled={deshabilitado}
              className={`flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all sm:h-10 ${
                esEntrada || esSalida
                  ? 'bg-[#c5a255] text-[#0c1d3d] shadow-md font-bold'
                  : enRango
                    ? 'bg-[#c5a255]/10 text-[#c5a255]'
                    : ocupado
                      ? 'cursor-not-allowed bg-red-50 text-red-300 line-through'
                      : pasado
                        ? 'cursor-not-allowed text-slate-200'
                        : 'text-slate-700 hover:bg-[#c5a255]/5 hover:text-[#c5a255]'
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#c5a255]" /> Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#c5a255]/20" /> Rango
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-50 ring-1 ring-red-200" /> No disponible
        </span>
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

  // Días sin disponibilidad (simulados — en producción vendría del API)
  const diasOcupados = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    obtenerTiposHabitacion().then(setTipos).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!fechaEntrada || !fechaSalida) return;
    setBuscando(true);
    try {
      const res = await buscarDisponibilidad({
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        tipo: filtroTipo || undefined,
      });
      setDisponibles(res.habitaciones);
      setBuscado(true);
    } catch {
      setDisponibles([]);
      setBuscado(true);
    } finally {
      setBuscando(false);
    }
  }, [fechaEntrada, fechaSalida, filtroTipo]);

  const tipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'simple': return <IconBed size={20} />;
      case 'doble': return <IconBedDouble size={20} />;
      case 'suite': return <IconCrown size={20} />;
      default: return <IconStar size={20} />;
    }
  };

  return (
    <>
      {/* Hero compacto premium */}
      <section className="relative overflow-hidden bg-[#0c1d3d] py-14 sm:py-20">
        <div className="absolute inset-0 opacity-[0.04]"><svg className="h-full w-full" viewBox="0 0 1200 300"><defs><pattern id="hg2" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="white" strokeWidth="0.3"/></pattern></defs><rect width="1200" height="300" fill="url(#hg2)"/></svg></div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a255]/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a255]">Alojamiento</p>
          <h1 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">Nuestras Habitaciones</h1>
          <p className="mx-auto max-w-2xl text-slate-400">
            Explore nuestras opciones y encuentre la habitación perfecta. 
            Seleccione sus fechas para ver disponibilidad en tiempo real.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Panel izquierdo: Filtros + Calendario */}
          <div className="space-y-6 lg:col-span-1">
            {/* Filtros */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-base font-bold text-slate-800">Filtrar por tipo</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTipo('')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    filtroTipo === '' ? 'bg-[#0c1d3d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                {(['simple', 'doble', 'suite', 'penthouse'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      filtroTipo === t ? 'bg-[#0c1d3d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tipoIcon(t)}
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

            {/* Fechas seleccionadas + buscar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Check-in</label>
                  <input
                    type="date"
                    value={fechaEntrada}
                    onChange={(e) => setFechaEntrada(e.target.value)}
                    min={hoyStr()}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Check-out</label>
                  <input
                    type="date"
                    value={fechaSalida}
                    onChange={(e) => setFechaSalida(e.target.value)}
                    min={sumarDias(fechaEntrada, 1)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <button
                onClick={buscar}
                disabled={buscando || !fechaEntrada || !fechaSalida}
                className="btn-gold w-full rounded-xl py-3 text-sm shadow-md disabled:opacity-50"
              >
                {buscando ? 'Buscando...' : 'Buscar Disponibilidad'}
              </button>
            </div>

            {/* Resumen de tipos */}
            {tipos.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h3 className="mb-3 text-sm font-bold text-slate-800">Resumen de disponibilidad</h3>
                <div className="space-y-2">
                  {tipos.map((t) => (
                    <div key={t.tipo} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600 capitalize">{t.tipo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                <svg className="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-600">Seleccione sus fechas</h3>
                <p className="mt-1 text-sm text-slate-400">Elija las fechas de su estadía y haga clic en "Buscar Disponibilidad"</p>
              </div>
            ) : disponibles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                <svg className="mx-auto mb-4 h-16 w-16 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-600">Sin disponibilidad</h3>
                <p className="mt-1 text-sm text-slate-400">No hay habitaciones disponibles para las fechas seleccionadas. Intente con otras fechas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-500">
                  {disponibles.length} habitacion{disponibles.length > 1 ? 'es' : ''} disponible{disponibles.length > 1 ? 's' : ''}
                  {' '}del {fechaEntrada} al {fechaSalida}
                </p>
                {disponibles.map((hab) => {
                  const noches = Math.max(1, Math.ceil((new Date(fechaSalida).getTime() - new Date(fechaEntrada).getTime()) / 86400000));
                  const total = hab.precio_noche ? (parseFloat(hab.precio_noche) * noches).toFixed(2) : null;

                  return (
                    <div key={hab.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg">
                      <div className="flex flex-col sm:flex-row">
                        {/* Imagen placeholder */}
                        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#0c1d3d] to-[#1a3a6e] text-[#c5a255]/60 sm:h-auto sm:w-48 sm:shrink-0">
                          {tipoIcon(hab.tipo)}
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-800">
                                Habitación {hab.numero} — {hab.tipo.charAt(0).toUpperCase() + hab.tipo.slice(1)}
                              </h3>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Disponible</span>
                            </div>
                            <p className="mb-2 text-sm text-slate-500">Piso {hab.piso}</p>
                            {hab.amenidades.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1.5">
                                {hab.amenidades.map((a) => (
                                  <span key={a} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                            <div>
                              {hab.precio_noche && (
                                <>
                                  <span className="text-2xl font-extrabold text-[#0c1d3d]">S/ {hab.precio_noche}</span>
                                  <span className="text-sm text-slate-400"> / noche</span>
                                  {total && (
                                    <p className="mt-0.5 text-xs text-slate-400">
                                      Total {noches} noche{noches > 1 ? 's' : ''}: <span className="font-semibold text-slate-600">S/ {total}</span>
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            <Link
                              to={`/reservar?hab=${hab.id}&entrada=${fechaEntrada}&salida=${fechaSalida}`}
                              className="btn-gold shrink-0 rounded-xl px-6 py-2.5 text-sm shadow-md"
                            >
                              Seleccionar
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
    </>
  );
}
