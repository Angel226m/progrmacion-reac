// ═══════════════════════════════════════════════════════════
// HotelFlux — ListaReservas (CQRS — solo lectura)
// Componente funcional puro: renderiza lista de reservas
// Con búsqueda y paginación integradas
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import type { Reserva } from '../../domain/types';
import { IconDocument, IconKey, IconDoor, IconClose, IconReservas, IconSearch } from '../shared/Icons';
import Pagination from '../shared/Pagination';

const POR_PAGINA = 10;

interface ListaReservasProps {
  readonly reservas: readonly Reserva[];
  readonly onCheckin?: (reservaId: string) => void;
  readonly onCheckout?: (reservaId: string) => void;
  readonly onCancelar?: (reservaId: string) => void;
}

const colorEstadoReservaMap: Readonly<Record<string, string>> = {
  confirmada: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-emerald-100 text-emerald-800',
  checked_out: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-100 text-red-700',
};

// Función pura: color del badge según estado
function colorEstadoReserva(estado: string): string {
  return colorEstadoReservaMap[estado] ?? 'bg-slate-100 text-slate-600';
}

const iconoEstadoMap: Readonly<Record<string, React.FC<{ size?: number; className?: string }>>> = {
  confirmada: IconDocument,
  checked_in: IconKey,
  checked_out: IconDoor,
  cancelada: IconClose,
};

// Función pura: icono del estado
function IconoEstado({ estado }: { estado: string }) {
  const Icono = iconoEstadoMap[estado] ?? IconReservas;
  return <Icono size={14} />;
}

export default function ListaReservas({
  reservas,
  onCheckin,
  onCheckout,
  onCancelar,
}: ListaReservasProps) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const reservasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return reservas;
    return reservas.filter((r) => {
      const nombreHuesped = r.huesped
        ? `${r.huesped.nombre} ${r.huesped.apellido}`.toLowerCase()
        : r.huesped_id.toLowerCase();
      const numHab = String(r.habitacion?.numero ?? r.habitacion_id).toLowerCase();
      return (
        nombreHuesped.includes(q) ||
        numHab.includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.fecha_entrada.includes(q) ||
        r.fecha_salida.includes(q)
      );
    });
  }, [reservas, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(reservasFiltradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const reservasPagina = reservasFiltradas.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );

  const cambiarBusqueda = (val: string) => {
    setBusqueda(val);
    setPagina(1);
  };

  if (reservas.length === 0) {
    return (
      <div className="rounded-xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200">
        <IconReservas size={40} className="mx-auto text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No hay reservas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
        <IconSearch size={16} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          placeholder="Buscar por huésped, habitación, estado o fecha…"
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {busqueda && (
          <button
            onClick={() => cambiarBusqueda('')}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <IconClose size={14} />
          </button>
        )}
        <span className="shrink-0 text-xs text-slate-400">
          {reservasFiltradas.length} resultado{reservasFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {reservasFiltradas.length === 0 ? (
          <div className="py-12 text-center">
            <IconReservas size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Sin resultados para «{busqueda}»</p>
          </div>
        ) : (
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
                {reservasPagina.map((reserva) => (
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
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <Pagination
            pagina={paginaActual}
            setPagina={setPagina}
            total={reservasFiltradas.length}
            porPagina={POR_PAGINA}
            color="blue"
            itemLabel="reserva"
          />
        )}
      </div>
    </div>
  );
}
