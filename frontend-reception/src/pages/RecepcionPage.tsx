// ═══════════════════════════════════════════════════════════
// HotelFlux — RecepcionPage (mapa interactivo + reserva directa)
// Muestra habitaciones por piso, disponibilidad en color,
// y permite reservar directamente haciendo clic en una hab.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { queries, comandos } from '../services/api';
import { isOfflineMode } from '../services/api';
import type { Habitacion, Huesped, MetodoPago } from '../domain/types';
import { COLOR_ESTADO, CLASE_ESTADO, LABEL_ESTADO } from '../domain/types';
import {
  IconRecepcion,
  IconLive,
  IconFilter,
  IconFloor,
  IconBed,
  IconBedDouble,
  IconStar,
  IconCrown,
  IconClose,
  IconUser,
  IconMail,
  IconPhone,
  IconDocument,
  IconGlobe,
  IconCalendar,
  IconCreditCard,
  IconMoney,
  IconBank,
  IconCheck,
  IconNotes,
  IconSearch,
  IconRefresh,
} from '../components/shared/Icons';
import clsx from 'clsx';

// ── Función pura: icono por tipo de habitación ──

function IconTipoHab({ tipo, className }: { tipo: string; className?: string }) {
  switch (tipo) {
    case 'simple': return <IconBed size={18} className={className} />;
    case 'doble': return <IconBedDouble size={18} className={className} />;
    case 'suite': return <IconStar size={18} className={className} />;
    case 'penthouse': return <IconCrown size={18} className={className} />;
    default: return <IconBed size={18} className={className} />;
  }
}

// ── Icono de método de pago ──

function IconMetodoPago({ metodo }: { metodo: MetodoPago }) {
  switch (metodo) {
    case 'tarjeta': return <IconCreditCard size={18} />;
    case 'efectivo': return <IconMoney size={18} />;
    case 'transferencia': return <IconBank size={18} />;
  }
}

export default function RecepcionPage() {
  const { token } = useAuth();
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [huespedes, setHuespedes] = useState<Huesped[]>([]);
  const [loading, setLoading] = useState(true);
  const [pisoFiltro, setPisoFiltro] = useState<number | null>(null);
  const [habSeleccionada, setHabSeleccionada] = useState<Habitacion | null>(null);
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // ── Cargar datos ──

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [resHab, resHue] = await Promise.all([
        queries.listarHabitaciones(token),
        queries.listarHuespedes(token),
      ]);
      setHabitaciones(resHab.habitaciones);
      setHuespedes(resHue.huespedes);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Pisos disponibles ──

  const pisos = [...new Set(habitaciones.map((h) => h.piso))].sort((a, b) => a - b);

  const habitacionesFiltradas = habitaciones.filter((h) => {
    const pasaPiso = pisoFiltro === null || h.piso === pisoFiltro;
    const pasaBusqueda = !busqueda || h.numero.includes(busqueda) || h.tipo.includes(busqueda.toLowerCase());
    return pasaPiso && pasaBusqueda;
  });

  // Agrupar por piso
  const porPiso = new Map<number, Habitacion[]>();
  habitacionesFiltradas.forEach((h) => {
    const arr = porPiso.get(h.piso) ?? [];
    arr.push(h);
    porPiso.set(h.piso, arr);
  });

  // Conteos
  const conteos = {
    total: habitaciones.length,
    disponible: habitaciones.filter((h) => h.estado === 'disponible').length,
    ocupada: habitaciones.filter((h) => h.estado === 'ocupada').length,
    reservada: habitaciones.filter((h) => h.estado === 'reservada').length,
    en_limpieza: habitaciones.filter((h) => h.estado === 'en_limpieza').length,
    en_mantenimiento: habitaciones.filter((h) => h.estado === 'en_mantenimiento').length,
    bloqueada: habitaciones.filter((h) => h.estado === 'bloqueada').length,
  };

  const handleHabitacionClick = useCallback((hab: Habitacion) => {
    setHabSeleccionada(hab);
    if (hab.estado === 'disponible') {
      setShowReservaModal(true);
    }
  }, []);

  const handleReservaSuccess = useCallback(() => {
    setShowReservaModal(false);
    setHabSeleccionada(null);
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-500">Cargando mapa de habitaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
            <IconRecepcion size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Recepción</h1>
            <p className="text-sm text-slate-500">
              Mapa interactivo — {conteos.total} habitaciones · {conteos.disponible} disponibles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <IconRefresh size={16} />
            Actualizar
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <IconLive size={14} className="text-emerald-500" />
            {isOfflineMode() ? 'Demo' : 'En vivo'}
          </span>
        </div>
      </div>

      {/* ── Contadores rápidos ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([
          { key: 'disponible', label: 'Disponible', count: conteos.disponible },
          { key: 'ocupada', label: 'Ocupada', count: conteos.ocupada },
          { key: 'reservada', label: 'Reservada', count: conteos.reservada },
          { key: 'en_limpieza', label: 'Limpieza', count: conteos.en_limpieza },
          { key: 'en_mantenimiento', label: 'Mantenim.', count: conteos.en_mantenimiento },
          { key: 'bloqueada', label: 'Bloqueada', count: conteos.bloqueada },
        ] as const).map(({ key, label, count }) => (
          <div key={key} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${CLASE_ESTADO[key]}`} />
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-800">{count}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
          <IconSearch size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar habitación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-40 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-1">
          <IconFilter size={16} className="mr-1 text-slate-400" />
          <button
            onClick={() => setPisoFiltro(null)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              pisoFiltro === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            Todos
          </button>
          {pisos.map((piso) => (
            <button
              key={piso}
              onClick={() => setPisoFiltro(piso === pisoFiltro ? null : piso)}
              className={clsx(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                pisoFiltro === piso
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <IconFloor size={12} />
              Piso {piso}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mapa por pisos ── */}
      <div className="space-y-6">
        {Array.from(porPiso.entries())
          .sort(([a], [b]) => a - b)
          .map(([piso, habs]) => (
            <div key={piso} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <IconFloor size={16} className="text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Piso {piso}</h3>
                    <p className="text-xs text-slate-500">
                      {habs.length} habitaciones · {habs.filter((h) => h.estado === 'disponible').length} disponibles
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {habs.map((hab) => (
                  <RoomCard
                    key={hab.id}
                    habitacion={hab}
                    onClick={handleHabitacionClick}
                    isSelected={habSeleccionada?.id === hab.id}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* ── Detalle de habitación (panel lateral) ── */}
      {habSeleccionada && !showReservaModal && (
        <HabitacionDetailPanel
          habitacion={habSeleccionada}
          onClose={() => setHabSeleccionada(null)}
          onReservar={() => setShowReservaModal(true)}
        />
      )}

      {/* ── Modal de reserva directa ── */}
      {showReservaModal && habSeleccionada && (
        <ReservaDirectaModal
          habitacion={habSeleccionada}
          huespedes={huespedes}
          token={token ?? ''}
          onClose={() => { setShowReservaModal(false); setHabSeleccionada(null); }}
          onSuccess={handleReservaSuccess}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Card — tarjeta individual de habitación
// ═══════════════════════════════════════════════════════════

function RoomCard({
  habitacion,
  onClick,
  isSelected,
}: {
  habitacion: Habitacion;
  onClick: (h: Habitacion) => void;
  isSelected: boolean;
}) {
  const color = COLOR_ESTADO[habitacion.estado]; // para tinte alfa del ícono
  const claseColor = CLASE_ESTADO[habitacion.estado];
  const isDisponible = habitacion.estado === 'disponible';

  return (
    <button
      onClick={() => onClick(habitacion)}
      className={clsx(
        'group relative flex flex-col items-center rounded-xl border-2 p-4 transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
          : 'border-transparent bg-slate-50 hover:shadow-md',
        isDisponible && 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50',
        !isDisponible && habitacion.estado !== 'reservada' && 'opacity-80',
      )}
    >
      {/* Indicador de estado — [TAILWIND v4] clase semántica del @theme */}
      <div className={`absolute right-2 top-2 h-3 w-3 rounded-full ring-2 ring-white ${claseColor}`} />

      {/* Icono tipo — tinte suave con alpha requiere inline style */}
      <div
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
        style={{ backgroundColor: `${color}15` }}
      >
        <IconTipoHab tipo={habitacion.tipo} className="text-slate-700" />
      </div>

      {/* Número */}
      <span className="text-lg font-bold text-slate-800">{habitacion.numero}</span>

      {/* Tipo */}
      <span className="text-[11px] capitalize text-slate-500">{habitacion.tipo}</span>

      {/* Precio */}
      <span className="mt-1 text-xs font-semibold" style={{ color }}>
        ${habitacion.precio_noche}
      </span>

      {/* Badge "Reservar" si disponible */}
      {isDisponible && (
        <span className="mt-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Reservar
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Detail Panel — panel lateral de detalle
// ═══════════════════════════════════════════════════════════

function HabitacionDetailPanel({
  habitacion,
  onClose,
  onReservar,
}: {
  habitacion: Habitacion;
  onClose: () => void;
  onReservar: () => void;
}) {
  const claseColor = CLASE_ESTADO[habitacion.estado];
  const label = LABEL_ESTADO[habitacion.estado];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 animate-slide-in border-l border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Habitación {habitacion.numero}</h2>
          <p className="text-sm capitalize text-slate-500">{habitacion.tipo} · Piso {habitacion.piso}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <IconClose size={18} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Estado */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${claseColor}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            {label}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Precio/noche</p>
            <p className="text-lg font-bold text-slate-800">${habitacion.precio_noche}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Capacidad</p>
            <p className="text-lg font-bold text-slate-800">{habitacion.capacidad} pers.</p>
          </div>
        </div>

        {/* Amenidades */}
        {habitacion.amenidades.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Amenidades</p>
            <div className="flex flex-wrap gap-1.5">
              {habitacion.amenidades.map((a) => (
                <span key={a} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {habitacion.notas && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
            <IconNotes size={14} className="mt-0.5 text-amber-600" />
            <p className="text-xs text-amber-700">{habitacion.notas}</p>
          </div>
        )}

        {/* Botón reservar */}
        {habitacion.estado === 'disponible' && (
          <button
            onClick={onReservar}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
          >
            Reservar esta habitación
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Reserva Directa Modal — flujo DNI primero
// Paso 1: Buscar por DNI → si existe: auto-fill, si no: formulario
// Paso 2: Fechas y pago
// Paso 3: Confirmación
// ═══════════════════════════════════════════════════════════

interface ReservaForm {
  // Búsqueda DNI
  dni_busqueda: string;
  dni_buscado: boolean;
  cliente_encontrado: boolean;
  huesped_id: string;
  // Datos huésped
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento_identidad: string;
  nacionalidad: string;
  // Reserva
  fecha_entrada: string;
  fecha_salida: string;
  metodo_pago: MetodoPago;
  notas: string;
}

function ReservaDirectaModal({
  habitacion,
  huespedes,
  token,
  onClose,
  onSuccess,
}: {
  habitacion: Habitacion;
  huespedes: Huesped[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0]!;
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]!;

  const [form, setForm] = useState<ReservaForm>({
    dni_busqueda: '',
    dni_buscado: false,
    cliente_encontrado: false,
    huesped_id: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    documento_identidad: '',
    nacionalidad: '',
    fecha_entrada: hoy,
    fecha_salida: manana,
    metodo_pago: 'tarjeta',
    notas: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Calcular total
  const dias = Math.max(1, Math.ceil(
    (new Date(form.fecha_salida).getTime() - new Date(form.fecha_entrada).getTime()) / 86400000,
  ));
  const total = (parseFloat(habitacion.precio_noche) * dias).toFixed(2);

  const updateField = <K extends keyof ReservaForm>(key: K, value: ReservaForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Buscar DNI ──

  const buscarDni = useCallback(() => {
    const dni = form.dni_busqueda.trim();
    if (!dni) return;

    const encontrado = huespedes.find(
      (h) => h.documento_identidad?.toLowerCase() === dni.toLowerCase(),
    );

    if (encontrado) {
      setForm((prev) => ({
        ...prev,
        dni_buscado: true,
        cliente_encontrado: true,
        huesped_id: encontrado.id,
        nombre: encontrado.nombre,
        apellido: encontrado.apellido,
        email: encontrado.email,
        telefono: encontrado.telefono ?? '',
        documento_identidad: encontrado.documento_identidad ?? dni,
        nacionalidad: encontrado.nacionalidad ?? '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        dni_buscado: true,
        cliente_encontrado: false,
        huesped_id: '',
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        documento_identidad: dni,
        nacionalidad: '',
      }));
    }
  }, [form.dni_busqueda, huespedes]);

  const resetDni = () => {
    setForm((prev) => ({
      ...prev,
      dni_busqueda: '',
      dni_buscado: false,
      cliente_encontrado: false,
      huesped_id: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      documento_identidad: '',
      nacionalidad: '',
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await comandos.crearReservaDirecta({
        habitacion_id: habitacion.id,
        fecha_entrada: form.fecha_entrada,
        fecha_salida: form.fecha_salida,
        metodo_pago: form.metodo_pago,
        notas: form.notas || undefined,
        ...(form.cliente_encontrado
          ? { huesped_id: form.huesped_id }
          : {
              nombre: form.nombre,
              apellido: form.apellido,
              email: form.email,
              telefono: form.telefono || undefined,
              documento_identidad: form.documento_identidad || undefined,
              nacionalidad: form.nacionalidad || undefined,
            }),
      }, token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = form.dni_buscado && (
    form.cliente_encontrado
      ? form.huesped_id !== ''
      : form.nombre.trim() !== '' && form.apellido.trim() !== '' && form.email.trim() !== ''
  );

  const canProceedStep2 = form.fecha_entrada && form.fecha_salida && form.metodo_pago;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Reservar Habitación {habitacion.numero}</h2>
            <p className="text-sm text-slate-500">{habitacion.tipo} · Piso {habitacion.piso} · ${habitacion.precio_noche}/noche</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <IconClose size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-100 px-6 py-3">
          {[
            { n: 1, label: 'Identificación del huésped' },
            { n: 2, label: 'Fechas y pago' },
            { n: 3, label: 'Confirmación' },
          ].map(({ n, label }) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  step >= n
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-400',
                )}
              >
                {step > n ? <IconCheck size={14} /> : n}
              </div>
              <span className={clsx('text-xs font-medium', step >= n ? 'text-slate-700' : 'text-slate-400')}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {/* Step 1: Búsqueda por DNI */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Buscar DNI */}
              {!form.dni_buscado ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
                    <p className="text-sm font-medium text-blue-800">
                      Ingrese el documento de identidad (DNI) del huésped para verificar si ya está registrado.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                      <IconDocument size={14} />
                      Documento de Identidad (DNI)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.dni_busqueda}
                        onChange={(e) => updateField('dni_busqueda', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarDni()}
                        placeholder="Ej: INE-12345, PAS-MX-001..."
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        autoFocus
                      />
                      <button
                        onClick={buscarDni}
                        disabled={!form.dni_busqueda.trim()}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                      >
                        <IconSearch size={16} />
                        Buscar
                      </button>
                    </div>
                  </div>
                </div>
              ) : form.cliente_encontrado ? (
                /* ── Cliente encontrado ── */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <IconCheck size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Cliente encontrado</p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Los datos se han cargado automáticamente del registro existente.
                      </p>
                    </div>
                    <button onClick={resetDni} className="ml-auto rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600">
                      <IconClose size={14} />
                    </button>
                  </div>

                  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Nombre completo</p>
                        <p className="font-semibold text-slate-800">{form.nombre} {form.apellido}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="font-semibold text-slate-800">{form.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">DNI</p>
                        <p className="font-semibold text-slate-800">{form.documento_identidad}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Teléfono</p>
                        <p className="font-semibold text-slate-800">{form.telefono || '—'}</p>
                      </div>
                      {form.nacionalidad && (
                        <div>
                          <p className="text-xs text-slate-500">Nacionalidad</p>
                          <p className="font-semibold text-slate-800">{form.nacionalidad}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Cliente NO encontrado: formulario de registro ── */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <IconDocument size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Cliente no registrado</p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        DNI «{form.documento_identidad}» no encontrado. Complete los datos para registrar al nuevo huésped.
                      </p>
                    </div>
                    <button onClick={resetDni} className="ml-auto rounded-lg p-1.5 text-amber-400 hover:bg-amber-100 hover:text-amber-600">
                      <IconClose size={14} />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField icon={<IconUser size={16} />} label="Nombre *" value={form.nombre} onChange={(v) => updateField('nombre', v)} />
                    <InputField icon={<IconUser size={16} />} label="Apellido *" value={form.apellido} onChange={(v) => updateField('apellido', v)} />
                    <InputField icon={<IconMail size={16} />} label="Email *" value={form.email} onChange={(v) => updateField('email', v)} type="email" />
                    <InputField icon={<IconPhone size={16} />} label="Teléfono" value={form.telefono} onChange={(v) => updateField('telefono', v)} />
                    <InputField icon={<IconDocument size={16} />} label="Documento de identidad" value={form.documento_identidad} onChange={(v) => updateField('documento_identidad', v)} />
                    <InputField icon={<IconGlobe size={16} />} label="Nacionalidad" value={form.nacionalidad} onChange={(v) => updateField('nacionalidad', v)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Fechas y medio de pago */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <IconCalendar size={14} />
                    Fecha de entrada
                  </label>
                  <input
                    type="date"
                    value={form.fecha_entrada}
                    min={hoy}
                    onChange={(e) => updateField('fecha_entrada', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <IconCalendar size={14} />
                    Fecha de salida
                  </label>
                  <input
                    type="date"
                    value={form.fecha_salida}
                    min={form.fecha_entrada || hoy}
                    onChange={(e) => updateField('fecha_salida', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Método de pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'tarjeta' as MetodoPago, label: 'Tarjeta' },
                    { value: 'efectivo' as MetodoPago, label: 'Efectivo' },
                    { value: 'transferencia' as MetodoPago, label: 'Transferencia' },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => updateField('metodo_pago', value)}
                      className={clsx(
                        'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all',
                        form.metodo_pago === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <IconMetodoPago metodo={value} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <IconNotes size={14} />
                  Notas (opcional)
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => updateField('notas', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Observaciones especiales..."
                />
              </div>

              {/* Resumen de precio */}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>${habitacion.precio_noche} × {dias} {dias === 1 ? 'noche' : 'noches'}</span>
                  <span className="font-bold text-slate-800">${total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmación */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 ring-1 ring-blue-100">
                <h3 className="mb-3 text-sm font-bold text-blue-800">Resumen de la reserva</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Habitación</span>
                    <span className="font-semibold text-slate-800">{habitacion.numero} — {habitacion.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Huésped</span>
                    <span className="font-semibold text-slate-800">
                      {form.nombre} {form.apellido}
                      {form.cliente_encontrado && (
                        <span className="ml-1 text-xs text-emerald-600">(registrado)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">DNI</span>
                    <span className="font-semibold text-slate-800">{form.documento_identidad}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Check-in</span>
                    <span className="font-semibold text-slate-800">{form.fecha_entrada}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Check-out</span>
                    <span className="font-semibold text-slate-800">{form.fecha_salida}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Noches</span>
                    <span className="font-semibold text-slate-800">{dias}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Método de pago</span>
                    <span className="flex items-center gap-1 font-semibold capitalize text-slate-800">
                      <IconMetodoPago metodo={form.metodo_pago} />
                      {form.metodo_pago}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-blue-200 pt-2">
                    <div className="flex justify-between text-base">
                      <span className="font-bold text-blue-800">Total</span>
                      <span className="text-xl font-extrabold text-blue-800">${total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className={clsx(
                'rounded-lg px-6 py-2 text-sm font-semibold text-white transition-all',
                (step === 1 ? canProceedStep1 : canProceedStep2)
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-300 cursor-not-allowed',
              )}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <IconCheck size={16} />
              )}
              Confirmar Reserva
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// InputField — campo de formulario reutilizable
// ═══════════════════════════════════════════════════════════

function InputField({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label.replace(' *', '')}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}
