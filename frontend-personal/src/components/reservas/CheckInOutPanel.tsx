// ═══════════════════════════════════════════════════════════
// HotelFlux — CheckInOutPanel (Check-In y Check-Out)
// Componentes funcionales puros para operaciones de recepción
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { comandos } from '../../services/api';
import type { Reserva } from '../../domain/types';
import { IconKey, IconDoor } from '../shared/Icons';
import { fromPromise, fold } from '../../domain/result';

interface CheckInOutPanelProps {
  readonly reservas: readonly Reserva[];
  readonly onSuccess?: () => void;
}

const MESSAGE_STYLES = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
} as const;

export default function CheckInOutPanel({ reservas, onSuccess }: CheckInOutPanelProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Funciones puras: filtrar reservas por estado
  const paraCheckin = reservas.filter((r) => r.estado === 'confirmada');
  const paraCheckout = reservas.filter((r) => r.estado === 'checked_in');

  const handleCheckin = useCallback(
    async (reservaId: string) => {
      if (!token) return;
      setLoading(reservaId);
      setMessage(null);
      const result = await fromPromise(
        comandos.checkin({ reserva_id: reservaId }, token),
        (e): Error => e instanceof Error ? e : new Error(String(e)),
      );
      fold(
        () => {
          setMessage({ type: 'success', text: 'Check-In realizado — Habitación ahora ocupada' });
          onSuccess?.();
        },
        (err: Error) => setMessage({ type: 'error', text: err.message }),
      )(result);
      setLoading(null);
    },
    [token, onSuccess],
  );

  const handleCheckout = useCallback(
    async (reservaId: string) => {
      if (!token) return;
      setLoading(reservaId);
      setMessage(null);
      const result = await fromPromise(
        comandos.checkout({ reserva_id: reservaId }, token),
        (e): Error => e instanceof Error ? e : new Error(String(e)),
      );
      fold(
        () => {
          setMessage({ type: 'success', text: 'Check-Out realizado — Tarea de limpieza creada automáticamente' });
          onSuccess?.();
        },
        (err: Error) => setMessage({ type: 'error', text: err.message }),
      )(result);
      setLoading(null);
    },
    [token, onSuccess],
  );

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`animate-fade-in rounded-lg px-4 py-3 text-sm ring-1 ${MESSAGE_STYLES[message.type]}`}
        >
          {message.text}
        </div>
      )}

      {/* Check-In */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <IconKey size={16} /> Check-In ({paraCheckin.length} pendientes)
        </h3>
        {paraCheckin.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">Sin check-ins pendientes</p>
        ) : (
          <div className="space-y-2">
            {paraCheckin.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {r.huesped ? `${r.huesped.nombre} ${r.huesped.apellido}` : 'Huésped'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hab. {r.habitacion?.numero ?? '—'} | {r.fecha_entrada} → {r.fecha_salida}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckin(r.id)}
                  disabled={loading === r.id}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                  {loading === r.id ? '...' : 'Check-In'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check-Out */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
          <IconDoor size={16} /> Check-Out ({paraCheckout.length} activos)
        </h3>
        {paraCheckout.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">Sin check-outs pendientes</p>
        ) : (
          <div className="space-y-2">
            {paraCheckout.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {r.huesped ? `${r.huesped.nombre} ${r.huesped.apellido}` : 'Huésped'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hab. {r.habitacion?.numero ?? '—'} | Total: ${r.total}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckout(r.id)}
                  disabled={loading === r.id}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading === r.id ? '...' : 'Check-Out'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
