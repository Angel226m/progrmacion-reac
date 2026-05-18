// ═══════════════════════════════════════════════════════════
// HotelFlux — ListaReservas (CQRS — solo lectura)
// Componente funcional puro: renderiza lista de reservas
// ═══════════════════════════════════════════════════════════

import type { Reserva } from '../../domain/types';
import { IconDocument, IconKey, IconDoor, IconClose, IconReservas } from '../shared/Icons';

interface ListaReservasProps {
  readonly reservas: readonly Reserva[];
  readonly onCheckin?: (reservaId: string) => void;
  readonly onCheckout?: (reservaId: string) => void;
  readonly onCancelar?: (reservaId: string) => void;
}

// Función pura: color del badge según estado
function colorEstadoReserva(estado: string): string {
  switch (estado) {
    case 'confirmada':  return 'bg-blue-100 text-blue-800';
    case 'checked_in':  return 'bg-emerald-100 text-emerald-800';
    case 'checked_out': return 'bg-slate-100 text-slate-600';
    case 'cancelada':   return 'bg-red-100 text-red-700';
    default:            return 'bg-slate-100 text-slate-600';
  }
}

// Función pura: icono del estado
function IconoEstado({ estado }: { estado: string }) {
  switch (estado) {
    case 'confirmada':  return <IconDocument size={14} />;
    case 'checked_in':  return <IconKey size={14} />;
    case 'checked_out': return <IconDoor size={14} />;
    case 'cancelada':   return <IconClose size={14} />;
    default:            return <IconReservas size={14} />;
  }
}

export default function ListaReservas({
  reservas,
  onCheckin,
  onCheckout,
  onCancelar,
}: ListaReservasProps) {
  if (reservas.length === 0) {
    return (
      <div className="rounded-xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200">
        <IconReservas size={40} className="mx-auto text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No hay reservas</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Huésped</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Habitación</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Entrada</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Salida</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Total</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservas.map((reserva) => (
              <tr key={reserva.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstadoReserva(reserva.estado)}`}>
                    <IconoEstado estado={reserva.estado} /> {reserva.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {reserva.huesped
                    ? `${reserva.huesped.nombre} ${reserva.huesped.apellido}`
                    : reserva.huesped_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {reserva.habitacion?.numero ?? reserva.habitacion_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-600">{reserva.fecha_entrada}</td>
                <td className="px-4 py-3 text-slate-600">{reserva.fecha_salida}</td>
                <td className="px-4 py-3 font-semibold">${reserva.total}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {reserva.estado === 'confirmada' && onCheckin && (
                      <button
                        onClick={() => onCheckin(reserva.id)}
                        className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                      >
                        Check-In
                      </button>
                    )}
                    {reserva.estado === 'checked_in' && onCheckout && (
                      <button
                        onClick={() => onCheckout(reserva.id)}
                        className="rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                      >
                        Check-Out
                      </button>
                    )}
                    {reserva.estado === 'confirmada' && onCancelar && (
                      <button
                        onClick={() => onCancelar(reserva.id)}
                        className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
