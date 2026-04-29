// ═══════════════════════════════════════════════════════════
// HotelFlux — Página Pública de Reservación (Clientes)
// Sin autenticación requerida — Frontend independiente
// Stack: React 19 + TypeScript + Tailwind 4.x
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, type FormEvent } from 'react';
import { buscarDisponibilidad, crearReservaPublica, type HabitacionPublica } from '../services/publico.api';
import type { TipoHabitacion } from '../domain/types';
import { IconBed, IconBedDouble, IconCrown, IconStar, IconBuilding, IconRoomService, IconSpa, IconGlobe } from '../components/shared/Icons';
import type { ReactNode } from 'react';

// ── Tipos del formulario ──

interface DatosCliente {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  nacionalidad: string;
}

interface BusquedaParams {
  fechaEntrada: string;
  fechaSalida: string;
  huespedes: number;
  tipo: TipoHabitacion | '';
}

type PasoReserva = 'busqueda' | 'seleccion' | 'datos' | 'confirmacion';

const TIPO_LABEL: Record<TipoHabitacion, string> = {
  simple: 'Simple',
  doble: 'Doble',
  suite: 'Suite',
  penthouse: 'Penthouse',
};

function TipoIcon({ tipo, size = 24 }: { tipo: TipoHabitacion; size?: number }) {
  switch (tipo) {
    case 'simple': return <IconBed size={size} />;
    case 'doble': return <IconBedDouble size={size} />;
    case 'suite': return <IconCrown size={size} />;
    case 'penthouse': return <IconStar size={size} />;
  }
}

// ── Helpers puros ──

function calcularNoches(entrada: string, salida: string): number {
  const ms = new Date(salida).getTime() - new Date(entrada).getTime();
  return Math.max(Math.ceil(ms / 86400000), 1);
}

function hoyString(): string {
  return new Date().toISOString().split('T')[0]!;
}

function mananaString(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
}

export default function ReservaClientePage() {
  const [paso, setPaso] = useState<PasoReserva>('busqueda');
  const [busqueda, setBusqueda] = useState<BusquedaParams>({
    fechaEntrada: hoyString(),
    fechaSalida: mananaString(),
    huespedes: 2,
    tipo: '',
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

  const handleReservar = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!habSeleccionada) return;

      setError('');
      setCargando(true);
      try {
        const reserva = await crearReservaPublica({
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email,
          telefono: cliente.telefono,
          documento: cliente.documento,
          nacionalidad: cliente.nacionalidad,
          habitacion_id: habSeleccionada.id,
          fecha_entrada: busqueda.fechaEntrada,
          fecha_salida: busqueda.fechaSalida,
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
    },
    [habSeleccionada, cliente, busqueda],
  );

  const handleNuevaReserva = useCallback(() => {
    setPaso('busqueda');
    setHabSeleccionada(null);
    setDisponibles([]);
    setCliente({ nombre: '', apellido: '', email: '', telefono: '', documento: '', nacionalidad: '' });
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white">
      {/* ── Hero ── */}
      {paso === 'busqueda' && (
        <div className="relative overflow-hidden bg-[#0c1d3d] py-20">
          <div className="absolute inset-0 opacity-[0.04]">
            <svg className="h-full w-full" viewBox="0 0 800 400">
              <defs>
                <pattern id="pubgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect width="800" height="400" fill="url(#pubgrid)" />
            </svg>
          </div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#c5a255]/8 blur-[100px]" />
          <div className="absolute -right-20 -top-10 h-48 w-48 rounded-full bg-[#c5a255]/5 blur-[80px]" />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a255]">Reservaciones</p>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Tu estancia perfecta te espera
            </h1>
            <p className="mx-auto mb-2 max-w-xl text-lg text-slate-400">
              Reserva tu habitación en HotelFlux — confort, tecnología y servicio excepcional.
            </p>
          </div>
        </div>
      )}

      {/* ── Stepper ── */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex items-center justify-center gap-1">
          {[
            { key: 'busqueda', label: 'Búsqueda', num: 1 },
            { key: 'seleccion', label: 'Selección', num: 2 },
            { key: 'datos', label: 'Tus Datos', num: 3 },
            { key: 'confirmacion', label: 'Listo', num: 4 },
          ].map((s, i) => {
            const pasos: PasoReserva[] = ['busqueda', 'seleccion', 'datos', 'confirmacion'];
            const current = pasos.indexOf(paso);
            const isActive = pasos.indexOf(s.key as PasoReserva) <= current;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0c1d3d] text-[#c5a255] shadow-md shadow-[#0c1d3d]/20'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`ml-2 hidden text-sm font-medium sm:inline ${
                    isActive ? 'text-[#0c1d3d]' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
                {i < 3 && (
                  <div
                    className={`mx-3 h-0.5 w-8 rounded-full sm:w-16 ${
                      pasos.indexOf(s.key as PasoReserva) < current ? 'bg-[#c5a255]' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Paso 1: Búsqueda ── */}
        {paso === 'busqueda' && (
          <form
            onSubmit={handleBuscar}
            className="mx-auto max-w-2xl animate-fade-in-up rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100"
          >
            <h2 className="mb-6 text-xl font-bold text-slate-800">Busca tu habitación ideal</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Fecha de entrada
                </label>
                <input
                  type="date"
                  required
                  min={hoyString()}
                  value={busqueda.fechaEntrada}
                  onChange={(e) => setBusqueda((prev) => ({ ...prev, fechaEntrada: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Fecha de salida
                </label>
                <input
                  type="date"
                  required
                  min={busqueda.fechaEntrada || hoyString()}
                  value={busqueda.fechaSalida}
                  onChange={(e) => setBusqueda((prev) => ({ ...prev, fechaSalida: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Huéspedes
                </label>
                <select
                  value={busqueda.huespedes}
                  onChange={(e) => setBusqueda((prev) => ({ ...prev, huespedes: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'huésped' : 'huéspedes'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tipo de habitación
                </label>
                <select
                  value={busqueda.tipo}
                  onChange={(e) => setBusqueda((prev) => ({ ...prev, tipo: e.target.value as TipoHabitacion | '' }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                >
                  <option value="">Cualquier tipo</option>
                  {(['simple', 'doble', 'suite', 'penthouse'] as TipoHabitacion[]).map((t) => (
                    <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="btn-gold mt-6 w-full rounded-xl px-6 py-3.5 text-sm shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
            >
              {cargando ? 'Buscando...' : 'Buscar disponibilidad'}
            </button>
          </form>
        )}

        {/* ── Paso 2: Selección ── */}
        {paso === 'seleccion' && (
          <div className="animate-fade-in-up">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Habitaciones disponibles</h2>
                <p className="text-sm text-slate-500">
                  {busqueda.fechaEntrada} → {busqueda.fechaSalida} · {noches} {noches === 1 ? 'noche' : 'noches'} · {busqueda.huespedes} huéspedes
                </p>
              </div>
              <button
                onClick={() => setPaso('busqueda')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#c5a255] hover:bg-[#c5a255]/5"
              >
                ← Modificar búsqueda
              </button>
            </div>

            {disponibles.length === 0 ? (
              <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                <IconBuilding size={48} className="mx-auto text-slate-400" />
                <p className="mt-4 text-lg font-medium text-slate-600">No hay habitaciones disponibles</p>
                <p className="mt-1 text-sm text-slate-400">Intenta modificar tus fechas o criterios de búsqueda</p>
                <button
                  onClick={() => setPaso('busqueda')}
                  className="btn-gold mt-4 rounded-xl px-6 py-2.5 text-sm shadow-md"
                >
                  Buscar de nuevo
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {disponibles.map((hab) => (
                  <div
                    key={hab.id}
                    className="luxury-card group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-[#c5a255]/30"
                    onClick={() => handleSeleccionar(hab)}
                  >
                    {/* Header con tipo */}
                    <div className="mb-3 flex items-center justify-between">
                      <TipoIcon tipo={hab.tipo as TipoHabitacion} size={24} />
                      <span className="rounded-full bg-[#c5a255]/10 px-2.5 py-1 text-xs font-semibold text-[#c5a255]">
                        {TIPO_LABEL[hab.tipo as TipoHabitacion] ?? hab.tipo}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Habitación {hab.numero}</h3>
                    <p className="text-sm text-slate-500">
                      Piso {hab.piso}
                    </p>
                    {/* Amenidades */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {hab.amenidades.slice(0, 4).map((a) => (
                        <span key={a} className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                          {a}
                        </span>
                      ))}
                      {hab.amenidades.length > 4 && (
                        <span className="text-[11px] text-slate-400">+{hab.amenidades.length - 4}</span>
                      )}
                    </div>
                    {/* Precio */}
                    <div className="mt-4 flex items-end justify-between border-t border-slate-50 pt-3">
                      <div>
                        <span className="text-2xl font-extrabold text-slate-800">S/{hab.precio_noche ?? '0'}</span>
                        <span className="text-sm text-slate-400">/noche</span>
                      </div>
                      <span className="text-sm font-semibold text-[#c5a255] group-hover:text-[#0c1d3d]">
                        Total: S/{(parseFloat(hab.precio_noche ?? '0') * noches).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 3: Datos del cliente ── */}
        {paso === 'datos' && habSeleccionada && (
          <div className="animate-fade-in-up">
            <button
              onClick={() => setPaso('seleccion')}
              className="mb-4 rounded-lg px-3 py-1.5 text-sm font-medium text-[#c5a255] hover:bg-[#c5a255]/5"
            >
              ← Cambiar habitación
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              {/* Formulario */}
              <form onSubmit={handleReservar} className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-6 text-xl font-bold text-slate-800">Datos del huésped</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { id: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Juan', key: 'nombre' as const },
                    { id: 'apellido', label: 'Apellido', type: 'text', placeholder: 'Pérez', key: 'apellido' as const },
                    { id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'juan@email.com', key: 'email' as const },
                    { id: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+52 555 123 4567', key: 'telefono' as const },
                    { id: 'documento', label: 'Documento de identidad', type: 'text', placeholder: 'INE / Pasaporte', key: 'documento' as const },
                    { id: 'nacionalidad', label: 'Nacionalidad', type: 'text', placeholder: 'México', key: 'nacionalidad' as const },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="mb-1.5 block text-sm font-semibold text-slate-700">
                        {field.label}
                      </label>
                      <input
                        id={field.id}
                        type={field.type}
                        required
                        placeholder={field.placeholder}
                        value={cliente[field.key]}
                        onChange={(e) => setCliente((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-[#c5a255] focus:ring-4 focus:ring-[#c5a255]/10"
                      />
                    </div>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={cargando}
                  className="btn-gold mt-6 w-full rounded-xl px-6 py-3.5 text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando ? 'Procesando...' : 'Confirmar reserva'}
                </button>
              </form>

              {/* Resumen */}
              <div className="h-fit rounded-2xl bg-gradient-to-br from-[#0c1d3d] to-[#142d5c] p-6 text-white shadow-xl">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#c5a255]">Resumen</h3>
                <div className="mb-4 flex items-center gap-3">
                  <TipoIcon tipo={habSeleccionada.tipo as TipoHabitacion} size={30} />
                  <div>
                    <p className="font-bold">Habitación {habSeleccionada.numero}</p>
                    <p className="text-sm text-slate-400">{TIPO_LABEL[habSeleccionada.tipo as TipoHabitacion] ?? habSeleccionada.tipo} · Piso {habSeleccionada.piso}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-in</span>
                    <span className="font-medium">{busqueda.fechaEntrada}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-out</span>
                    <span className="font-medium">{busqueda.fechaSalida}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Noches</span>
                    <span className="font-medium">{noches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Precio/noche</span>
                    <span className="font-medium">S/{habSeleccionada.precio_noche ?? '0'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="font-bold text-slate-300">Total</span>
                  <span className="text-2xl font-extrabold text-[#c5a255]">
                    S/{(parseFloat(habSeleccionada.precio_noche ?? '0') * noches).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Confirmación ── */}
        {paso === 'confirmacion' && habSeleccionada && (
          <div className="mx-auto max-w-lg animate-scale-in text-center">
            <div className="rounded-2xl bg-white p-10 shadow-xl ring-1 ring-slate-100">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-extrabold text-slate-800">¡Reserva confirmada!</h2>
              <p className="mb-6 text-sm text-slate-500">
                Tu reservación ha sido registrada exitosamente.
              </p>
              <div className="mb-6 rounded-xl bg-slate-50 p-4 text-left">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Código de reserva
                </div>
                <div className="text-2xl font-extrabold tracking-wider text-[#0c1d3d]">{codigoConfirmacion || reservaId}</div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><span className="font-medium">Huésped:</span> {cliente.nombre} {cliente.apellido}</p>
                  <p><span className="font-medium">Habitación:</span> {habSeleccionada.numero} ({TIPO_LABEL[habSeleccionada.tipo as TipoHabitacion] ?? habSeleccionada.tipo})</p>
                  <p><span className="font-medium">Fechas:</span> {busqueda.fechaEntrada} → {busqueda.fechaSalida}</p>
                  <p><span className="font-medium">Total:</span> S/{totalReserva || (parseFloat(habSeleccionada.precio_noche ?? '0') * noches).toFixed(2)}</p>
                </div>
              </div>
              <p className="mb-6 text-xs text-slate-400">
                Se ha enviado una confirmación a <span className="font-medium">{cliente.email}</span>
              </p>
              <button
                onClick={handleNuevaReserva}
                className="btn-gold rounded-xl px-6 py-3 text-sm shadow-lg transition-all active:scale-[0.98]"
              >
                Hacer otra reserva
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Features (solo en búsqueda) ── */}
      {paso === 'busqueda' && (
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="section-divider mb-8 text-center text-2xl font-extrabold text-slate-800">
            ¿Por qué elegir HotelFlux?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <IconRoomService size={28} className="text-[#c5a255]" />, title: 'Servicio 24/7', desc: 'Recepción y room service disponible las 24 horas' },
              { icon: <IconGlobe size={28} className="text-[#c5a255]" />, title: 'Ubicación premium', desc: 'Miraflores, Lima — zona turística privilegiada' },
              { icon: <IconRoomService size={28} className="text-[#c5a255]" />, title: 'Gastronomía', desc: 'Restaurantes gourmet y bar con mixología' },
              { icon: <IconSpa size={28} className="text-[#c5a255]" />, title: 'Spa & Wellness', desc: 'Masajes, tratamientos faciales y más' },
            ].map((feat: { icon: ReactNode; title: string; desc: string }) => (
              <div
                key={feat.title}
                className="luxury-card rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
              >
                {feat.icon}
                <h3 className="mt-3 text-base font-bold text-slate-800">{feat.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonios */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { nombre: 'María G.', pais: 'Perú', texto: 'Excelente servicio y habitaciones impecables. La tecnología del hotel hace todo más fácil.' },
              { nombre: 'Carlos R.', pais: 'Colombia', texto: 'La mejor experiencia de hospedaje. Proceso de reserva muy sencillo y rápido.' },
              { nombre: 'Ana L.', pais: 'Argentina', texto: 'Ubicación perfecta y personal muy amable. Definitivamente volveré.' },
            ].map((t) => (
              <div key={t.nombre} className="rounded-xl bg-white p-4 ring-1 ring-slate-100 shadow-sm">
                <div className="mb-2 flex text-[#c5a255]">{'★★★★★'}</div>
                <p className="text-sm text-slate-600 italic">"{t.texto}"</p>
                <p className="mt-2 text-xs font-semibold text-slate-800">
                  {t.nombre}
                  <span className="ml-1 font-normal text-slate-400">· {t.pais}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
