// ═══════════════════════════════════════════════════════════
// HotelFlux — HabitacionCard (detalle de habitación)
// Componente funcional puro: sin estado interno, sin side-effects
// ═══════════════════════════════════════════════════════════

import type { Habitacion } from '../../domain/types';
import { CLASE_ESTADO, LABEL_ESTADO } from '../../domain/types';
import { IconBed, IconBedDouble, IconStar, IconCrown, IconNotes, IconClose } from '../shared/Icons';

interface HabitacionCardProps {
  readonly habitacion: Habitacion;
  readonly onCheckin?: () => void;
  readonly onCheckout?: () => void;
  readonly onClose?: () => void;
}

const iconosPorTipo: Readonly<Record<string, React.FC<{ size?: number; className?: string }>>> = {
  simple: IconBed,
  doble: IconBedDouble,
  suite: IconStar,
  presidencial: IconCrown,
};

// Función pura: icono por tipo de habitación
function IconoTipo({ tipo, className }: { tipo: string; className?: string }) {
  const Icono = iconosPorTipo[tipo] ?? IconBed;
  return <Icono size={22} className={className} />;
}

const accionesPorEstado: Readonly<Record<string, { readonly checkin: boolean; readonly checkout: boolean }>> = {
  reservada: { checkin: true, checkout: false },
  ocupada: { checkin: false, checkout: true },
};

// Función pura: acciones disponibles según estado
function accionesDisponibles(estado: string): { checkin: boolean; checkout: boolean } {
  return accionesPorEstado[estado] ?? { checkin: false, checkout: false };
}

export default function HabitacionCard({
  habitacion,
  onCheckin,
  onCheckout,
  onClose,
}: HabitacionCardProps) {
  // [TAILWIND v4] claseColor usa variables CSS definidas en @theme de index.css
  // Evitamos inline styles — Tailwind puede aplicar hover:, dark:, etc.
  const claseColor = CLASE_ESTADO[habitacion.estado];
  const label = LABEL_ESTADO[habitacion.estado];
  const acciones = accionesDisponibles(habitacion.estado);

  return (
    <div className="animate-fade-in rounded-xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <IconoTipo tipo={habitacion.tipo} className="text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Habitación {habitacion.numero}
            </h3>
            <p className="text-sm capitalize text-slate-500">
              {habitacion.tipo} — Piso {habitacion.piso}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* Estado badge — usa clase Tailwind del @theme en lugar de inline style */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${claseColor}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          {label}
        </span>
        <span className="text-sm text-slate-500">
          Capacidad: {habitacion.capacidad} {habitacion.capacidad === 1 ? 'persona' : 'personas'}
        </span>
      </div>

      {/* Info */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Precio/noche</p>
          <p className="font-semibold text-slate-800">${habitacion.precio_noche}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Piso</p>
          <p className="font-semibold text-slate-800">{habitacion.piso}</p>
        </div>
      </div>

      {/* Amenidades */}
      {habitacion.amenidades.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Amenidades</p>
          <div className="flex flex-wrap gap-1.5">
            {habitacion.amenidades.map((amenidad) => (
              <span
                key={amenidad}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
              >
                {amenidad}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {habitacion.notas && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <IconNotes size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700">{habitacion.notas}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        {acciones.checkin && onCheckin && (
          <button
            onClick={onCheckin}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Check-In
          </button>
        )}
        {acciones.checkout && onCheckout && (
          <button
            onClick={onCheckout}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Check-Out
          </button>
        )}
      </div>
    </div>
  );
}
