// ═══════════════════════════════════════════════════════════
// HotelFlux — SagaProgress (visualización de pasos de la Saga)
// Componente funcional puro: muestra el progreso de la Saga
// de reserva en tiempo real (5 pasos con compensación)
// ═══════════════════════════════════════════════════════════

import type { SagaProgressEvent } from '../../domain/types';
import { IconCheck, IconClose, IconRefresh, IconWarning } from '../shared/Icons';
import clsx from 'clsx';

interface SagaProgressProps {
  readonly eventos: readonly SagaProgressEvent[];
  readonly visible: boolean;
}

// Función pura: pasos de la Saga
const PASOS_SAGA = [
  { paso: 1, label: 'Verificar disponibilidad' },
  { paso: 2, label: 'Bloquear habitación (Redis)' },
  { paso: 3, label: 'Procesar pago' },
  { paso: 4, label: 'Crear reserva (BD)' },
  { paso: 5, label: 'Enviar confirmación' },
] as const;

const iconosPaso: Readonly<Record<string, { icon: React.FC<{ size?: number; className?: string }>; className: string }>> = {
  completado: { icon: IconCheck, className: 'text-emerald-600' },
  en_proceso: { icon: IconRefresh, className: 'animate-spin text-blue-600' },
  error: { icon: IconClose, className: 'text-red-600' },
};

function IconPaso({ estado }: { estado?: string }) {
  const paso = estado ? iconosPaso[estado] : undefined;
  return paso
    ? <paso.icon size={14} className={paso.className} />
    : <span className="inline-block h-3.5 w-3.5 rounded bg-slate-200" />;
}

const coloresPaso: Readonly<Record<string, string>> = {
  completado: 'bg-emerald-500',
  en_proceso: 'bg-blue-500 animate-pulse',
  error: 'bg-red-500',
};

function colorPaso(estado?: string): string {
  return coloresPaso[estado ?? ''] ?? 'bg-slate-300';
}

export default function SagaProgress({ eventos, visible }: SagaProgressProps) {
  if (!visible) return null;

  // Mapear eventos a pasos
  const estadoPorPaso = new Map(
    eventos.map((e) => [e.paso, e.estado]),
  );

  return (
    <div className="animate-fade-in rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <IconRefresh size={16} className="text-blue-600" /> Saga de Reserva — Progreso
      </h3>

      <div className="space-y-3">
        {PASOS_SAGA.map(({ paso, label }) => {
          const estado = estadoPorPaso.get(paso);
          return (
            <div key={paso} className="flex items-center gap-3">
              {/* Indicador */}
              <div className={clsx('h-3 w-3 rounded-full transition-all duration-300', colorPaso(estado))} />

              {/* Línea conectora */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={clsx('flex items-center gap-1.5 text-sm', estado === 'completado' ? 'text-emerald-700 font-medium' : 'text-slate-600')}>
                    <IconPaso estado={estado} /> Paso {paso}: {label}
                  </span>
                  {estado && (
                    <span className="text-xs text-slate-400">{estado}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compensación detectada */}
      {eventos.some((e) => e.estado === 'error') && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-200">
          <IconWarning size={14} /> Saga compensada: los pasos completados fueron revertidos automáticamente
        </div>
      )}
    </div>
  );
}
