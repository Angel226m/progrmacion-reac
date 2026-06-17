// ═══════════════════════════════════════════════════════════
// HotelFlux — MapaSVG (Mapa interactivo de habitaciones)
// Componente funcional puro: recibe datos, renderiza SVG
// Reactivo: se actualiza automáticamente vía RxJS stream
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from 'react';
import type { Habitacion } from '../../domain/types';
import { COLOR_ESTADO, LABEL_ESTADO } from '../../domain/types';
import clsx from 'clsx';

interface MapaSVGProps {
  readonly habitaciones: readonly Habitacion[];
  readonly pisoSeleccionado: number | null;
  readonly onHabitacionClick?: (habitacion: Habitacion) => void;
}

// Función pura: agrupar habitaciones por piso
function agruparPorPiso(
  habitaciones: readonly Habitacion[],
): ReadonlyMap<number, readonly Habitacion[]> {
  return habitaciones.reduce((acc, hab) => {
    const piso = hab.piso;
    const grupo = acc.get(piso) ?? [];
    const nuevoMap = new Map(acc);
    nuevoMap.set(piso, [...grupo, hab]);
    return nuevoMap;
  }, new Map<number, readonly Habitacion[]>());
}

const dimensionesPorTipo: Readonly<Record<string, { readonly w: number; readonly h: number }>> = {
  suite: { w: 140, h: 90 },
  presidencial: { w: 160, h: 100 },
  doble: { w: 120, h: 80 },
  simple: { w: 100, h: 70 },
};

// Función pura: dimensiones de la habitación según tipo
function dimensionHabitacion(tipo: string): { w: number; h: number } {
  return dimensionesPorTipo[tipo] ?? { w: 100, h: 70 };
}

export default function MapaSVG({ habitaciones, pisoSeleccionado, onHabitacionClick }: MapaSVGProps) {
  const porPiso = useMemo(() => agruparPorPiso(habitaciones), [habitaciones]);
  
  const pisosAMostrar = useMemo(() => {
    if (pisoSeleccionado !== null) {
      const hab = porPiso.get(pisoSeleccionado);
      return hab ? new Map([[pisoSeleccionado, hab]]) : new Map();
    }
    return porPiso;
  }, [porPiso, pisoSeleccionado]);

  const handleClick = useCallback(
    (hab: Habitacion) => onHabitacionClick?.(hab),
    [onHabitacionClick],
  );

  return (
    <div className="space-y-6">
      {Array.from(pisosAMostrar.entries())
        .sort(([a], [b]) => a - b)
        .map(([piso, habs]: [number, readonly Habitacion[]]) => (
          <div key={piso} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-semibold text-slate-600">
              Piso {piso}
            </h3>
            <div className="flex flex-wrap gap-3">
              {habs.map((hab) => (
                <HabitacionSVGCard
                  key={hab.id}
                  habitacion={hab}
                  onClick={handleClick}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Subcomponente funcional puro: tarjeta SVG por habitación ──

interface HabitacionSVGCardProps {
  readonly habitacion: Habitacion;
  readonly onClick: (hab: Habitacion) => void;
}

function HabitacionSVGCard({ habitacion, onClick }: HabitacionSVGCardProps) {
  const { w, h } = dimensionHabitacion(habitacion.tipo);
  const color = COLOR_ESTADO[habitacion.estado];
  const label = LABEL_ESTADO[habitacion.estado];
  const isAnimated = habitacion.estado === 'en_limpieza';

  return (
    <button
      onClick={() => onClick(habitacion)}
      className={clsx(
        'group relative rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md',
        isAnimated && 'animate-pulso-reactivo',
      )}
      title={`${habitacion.numero} — ${label}`}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Fondo de la habitación */}
        <rect
          x="2"
          y="2"
          width={w - 4}
          height={h - 4}
          rx="8"
          fill={color}
          fillOpacity={0.15}
          stroke={color}
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-opacity-25"
        />

        {/* Número */}
        <text
          x={w / 2}
          y={h / 2 - 8}
          textAnchor="middle"
          className="fill-slate-800 text-sm font-bold"
        >
          {habitacion.numero}
        </text>

        {/* Tipo */}
        <text
          x={w / 2}
          y={h / 2 + 8}
          textAnchor="middle"
          className="fill-slate-500 text-[10px] capitalize"
        >
          {habitacion.tipo}
        </text>

        {/* Indicador de estado (punto de color) */}
        <circle cx={w - 14} cy="14" r="5" fill={color} />

        {/* Badge de precio */}
        <text
          x={w / 2}
          y={h - 10}
          textAnchor="middle"
          className="fill-slate-400 text-[9px]"
        >
          ${habitacion.precio_noche}/noche
        </text>
      </svg>
    </button>
  );
}
