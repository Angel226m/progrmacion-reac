// ═══════════════════════════════════════════════════════════
// HotelFlux — ReservasPage (gestión de reservas + Saga)
// Compone: FormReserva + ListaReservas + CheckInOutPanel
// Rol: admin, recepcionista
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useHabitacionStream } from '../hooks/useHabitacionStream';
import { queries, comandos } from '../services/api';
import FormReserva from '../components/reservas/FormReserva';
import ListaReservas from '../components/reservas/ListaReservas';
import CheckInOutPanel from '../components/reservas/CheckInOutPanel';
import type { Reserva, Huesped } from '../domain/types';
import {
  IconReservas,
  IconPlus,
  IconDocument,
  IconKey,
} from '../components/shared/Icons';
import { fromPromise, fold, toError } from '../domain/result';

type VistActiva = 'lista' | 'nueva' | 'checkinout';

export default function ReservasPage() {
  const { token } = useAuth();
  const { habitaciones } = useHabitacionStream();
  const [vista, setVista] = useState<VistActiva>('lista');
  const [reservas, setReservas] = useState<readonly Reserva[]>([]);
  const [huespedes, setHuespedes] = useState<readonly Huesped[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const result = await fromPromise(
      Promise.all([
        queries.listarReservas(token),
        queries.listarHuespedes(token),
      ]),
      toError,
    );
    fold(
      ([resReservas, resHuespedes]: [{ reservas: Reserva[] }, { huespedes: Huesped[] }]) => {
        setReservas(resReservas.reservas);
        setHuespedes(resHuespedes.huespedes);
      },
      (error: Error) => console.error('Error cargando datos:', error),
    )(result);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCheckin = useCallback(
    async (reservaId: string) => {
      if (!token) return;
      const result = await fromPromise(
        comandos.checkin({ reserva_id: reservaId }, token),
        toError,
      );
      fold(
        () => { cargarDatos(); },
        (error: Error) => console.error('Error en check-in:', error),
      )(result);
    },
    [token, cargarDatos],
  );

  const handleCheckout = useCallback(
    async (reservaId: string) => {
      if (!token) return;
      const result = await fromPromise(
        comandos.checkout({ reserva_id: reservaId }, token),
        toError,
      );
      fold(
        () => { cargarDatos(); },
        (error: Error) => console.error('Error en check-out:', error),
      )(result);
    },
    [token, cargarDatos],
  );

  const handleCancelar = useCallback(
    async (reservaId: string) => {
      if (!token) return;
      const result = await fromPromise(
        comandos.cancelarReserva(reservaId, token),
        toError,
      );
      fold(
        () => { cargarDatos(); },
        (error: Error) => console.error('Error cancelando:', error),
      )(result);
    },
    [token, cargarDatos],
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
            <IconReservas size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Reservas</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Gestión de reservas — Saga Pattern con compensación automática
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
        {([
          { key: 'lista', label: 'Lista', icon: <IconDocument size={15} /> },
          { key: 'nueva', label: 'Nueva Reserva', icon: <IconPlus size={15} /> },
          { key: 'checkinout', label: 'Check-In/Out', icon: <IconKey size={15} /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setVista(tab.key)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              vista === tab.key
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : (
        <>
          {vista === 'lista' && (
            <ListaReservas
              reservas={reservas}
              onCheckin={handleCheckin}
              onCheckout={handleCheckout}
              onCancelar={handleCancelar}
            />
          )}

          {vista === 'nueva' && (
            <FormReserva
              habitaciones={[...habitaciones]}
              huespedes={[...huespedes]}
              onSuccess={() => {
                cargarDatos();
                setVista('lista');
              }}
            />
          )}

          {vista === 'checkinout' && (
            <CheckInOutPanel reservas={reservas} onSuccess={cargarDatos} />
          )}
        </>
      )}
    </div>
  );
}
