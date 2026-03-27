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

// Función pura: icono por tipo de evento
function IconoEvento({ tipo }: { tipo: string }) {
  const cls = 'shrink-0';
  if (tipo.includes('reserva') || tipo.includes('Reserva')) return <IconReservas size={16} className={cls} />;
  if (tipo.includes('checkin') || tipo.includes('CheckIn')) return <IconKey size={16} className={cls} />;
  if (tipo.includes('checkout') || tipo.includes('CheckOut')) return <IconDoor size={16} className={cls} />;
  if (tipo.includes('limpieza') || tipo.includes('Limpieza')) return <IconLimpieza size={16} className={cls} />;
  if (tipo.includes('producto') || tipo.includes('Venta')) return <IconProductos size={16} className={cls} />;
  if (tipo.includes('pago') || tipo.includes('Pago')) return <IconCreditCard size={16} className={cls} />;
  return <IconDocument size={16} className={cls} />;
}

// Función pura: color por tipo de evento
function colorEvento(tipo: string): string {
  if (tipo.includes('error') || tipo.includes('fallido')) return 'bg-red-50 text-red-700 ring-red-200';
  if (tipo.includes('completad')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (tipo.includes('cread') || tipo.includes('nuev')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

// Función pura: formato relativo de tiempo
function tiempoRelativo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
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
                  {JSON.stringify(evento.datos).slice(0, 100)}
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
