// ═══════════════════════════════════════════════════════════
// HotelFlux — EventosRecientes (Event Sourcing — lectura)
// Componente funcional puro: lista de eventos del dominio
// ═══════════════════════════════════════════════════════════

import type { EventoDominio } from '../../domain/types';
import {
  IconReservas,
  IconKey,
  IconDoor,
  IconLimpieza,
  IconProductos,
  IconCreditCard,
  IconDocument,
} from '../shared/Icons';

interface EventosRecientesProps {
  readonly eventos: readonly EventoDominio[];
}

const ICONOS_EVENTO: Readonly<Record<string, React.FC<{ size?: number; className?: string }>>> = {
  reserva: IconReservas,
  checkin: IconKey,
  checkout: IconDoor,
  limpieza: IconLimpieza,
  producto: IconProductos,
  pago: IconCreditCard,
} as const;

// Función pura: icono por tipo de evento (dispatch map lookup)
function IconoEvento({ tipo }: { tipo: string | undefined }) {
  const t = (tipo ?? '').toLowerCase();
  const key = Object.keys(ICONOS_EVENTO).find((k) => t.includes(k));
  const Icono = key ? ICONOS_EVENTO[key]! : IconDocument;
  return <Icono size={16} className="shrink-0" />;
}

const COLORES_EVENTO: Readonly<Record<string, string>> = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  fallido: 'bg-red-50 text-red-700 ring-red-200',
  completad: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cread: 'bg-blue-50 text-blue-700 ring-blue-200',
  nuev: 'bg-blue-50 text-blue-700 ring-blue-200',
} as const;

// Función pura: color por tipo de evento (dispatch map lookup)
function colorEvento(tipo: string | undefined): string {
  const t = (tipo ?? '').toLowerCase();
  const key = Object.keys(COLORES_EVENTO).find((k) => t.includes(k));
  return key ? COLORES_EVENTO[key]! : 'bg-slate-50 text-slate-700 ring-slate-200';
}

const INTERVALOS_TIEMPO = [
  { limite: 1, divisor: 1, sufijo: 'ahora', fn: () => 'ahora' },
  { limite: 60, divisor: 1, sufijo: 'm', fn: (m: number) => `hace ${m}m` },
  { limite: 1440, divisor: 60, sufijo: 'h', fn: (m: number) => `hace ${Math.floor(m / 60)}h` },
] as const;

// Función pura: formato relativo de tiempo (lookup table)
function tiempoRelativo(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (isNaN(mins)) return '';
  const match = INTERVALOS_TIEMPO.find(({ limite }) => mins < limite);
  return match ? match.fn(mins) : `hace ${Math.floor(mins / 1440)}d`;
}

export default function EventosRecientes({ eventos }: EventosRecientesProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <IconDocument size={16} className="text-slate-500" />
        Eventos del Dominio <span className="text-xs font-normal text-slate-400">(Event Sourcing)</span>
      </h3>

      {eventos.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Sin eventos recientes
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {eventos.map((evento, i) => (
            <div
              key={`${evento.timestamp}-${i}`}
              className={`flex items-start gap-3 rounded-lg p-3 text-xs ring-1 animate-fade-in ${colorEvento(evento.tipo)}`}
            >
              <IconoEvento tipo={evento.tipo} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{evento.tipo}</p>
                <p className="truncate opacity-75">
                  {(JSON.stringify(evento.datos ?? {}) ?? '').slice(0, 100)}
                </p>
              </div>
              <span className="shrink-0 text-[10px] opacity-60">
                {tiempoRelativo(evento.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
