// ═══════════════════════════════════════════════════════════
// HotelFlux — FormReserva (formulario de nueva reserva)
// Dispara la Saga de reserva en el backend
// Componente controlado funcional + side-effect en submit
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { comandos } from '../../services/api';
import type { Habitacion, Huesped, CrearReservaDTO } from '../../domain/types';
import { IconDocument, IconCheck, IconClose } from '../shared/Icons';
import { fromPromise, fold } from '../../domain/result';

interface FormReservaProps {
  readonly habitaciones: readonly Habitacion[];
  readonly huespedes: readonly Huesped[];
  readonly onSuccess?: () => void;
  readonly onSagaProgress?: (paso: number, descripcion: string) => void;
}

export default function FormReserva({
  habitaciones,
  huespedes,
  onSuccess,
}: FormReservaProps) {
  const { token } = useAuth();
  const [form, setForm] = useState<CrearReservaDTO>({
    huesped_id: '',
    habitacion_id: '',
    fecha_entrada: '',
    fecha_salida: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Funciones puras: filtrar solo disponibles
  const habitacionesDisponibles = habitaciones.filter(
    (h) => h.estado === 'disponible',
  );

  const handleChange = useCallback(
    (field: keyof CrearReservaDTO, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setError(null);
      setSuccess(false);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!token) return;

      // Validación pura
      if (!form.huesped_id || !form.habitacion_id || !form.fecha_entrada || !form.fecha_salida) {
        setError('Todos los campos son obligatorios');
        return;
      }

      if (form.fecha_entrada >= form.fecha_salida) {
        setError('La fecha de salida debe ser posterior a la entrada');
        return;
      }

      setLoading(true);
      setError(null);

      const result = await fromPromise(
        comandos.crearReserva(form, token),
        (e): Error => e instanceof Error ? e : new Error(String(e)),
      );
      fold(
        () => {
          setSuccess(true);
          setForm({ huesped_id: '', habitacion_id: '', fecha_entrada: '', fecha_salida: '' });
          onSuccess?.();
        },
        (err: Error) => setError(err.message),
      )(result);
      setLoading(false);
    },
    [form, token, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
        <IconDocument size={20} /> Nueva Reserva <span className="text-xs font-normal text-slate-400">(Saga Pattern)</span>
      </h3>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 animate-fade-in">
          <IconClose size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 animate-fade-in">
          <IconCheck size={14} /> Reserva creada exitosamente (Saga completada: 5/5 pasos)
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Huésped */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Huésped
          </label>
          <select
            value={form.huesped_id}
            onChange={(e) => handleChange('huesped_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          >
            <option value="">Seleccionar huésped...</option>
            {huespedes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre} {h.apellido} — {h.email}
              </option>
            ))}
          </select>
        </div>

        {/* Habitación */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Habitación
          </label>
          <select
            value={form.habitacion_id}
            onChange={(e) => handleChange('habitacion_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          >
            <option value="">Seleccionar habitación...</option>
            {habitacionesDisponibles.map((h) => (
              <option key={h.id} value={h.id}>
                {h.numero} — {h.tipo} (${h.precio_noche}/noche)
              </option>
            ))}
          </select>
        </div>

        {/* Fecha Entrada */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Fecha de Entrada
          </label>
          <input
            type="date"
            value={form.fecha_entrada}
            onChange={(e) => handleChange('fecha_entrada', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>

        {/* Fecha Salida */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Fecha de Salida
          </label>
          <input
            type="date"
            value={form.fecha_salida}
            onChange={(e) => handleChange('fecha_salida', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Ejecutando Saga...
          </span>
        ) : (
          'Crear Reserva (Saga)'
        )}
      </button>
    </form>
  );
}
