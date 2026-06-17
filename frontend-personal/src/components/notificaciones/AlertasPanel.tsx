// ═══════════════════════════════════════════════════════════
// HotelFlux — AlertasPanel (panel de notificaciones)
// Componente funcional puro: renderiza alertas del stream
// ═══════════════════════════════════════════════════════════

import type { Notificacion, TipoNotificacion } from '../../streams/notificacion.stream';
import { IconInfo, IconCheck, IconWarning, IconClose, IconNotification } from '../shared/Icons';
import clsx from 'clsx';

interface AlertasPanelProps {
  readonly notificaciones: readonly Notificacion[];
  readonly onMarcarLeida?: (id: string) => void;
  readonly onMarcarTodas?: () => void;
}

const iconosNotificacion: Readonly<Record<TipoNotificacion, React.FC<{ size?: number; className?: string }>>> = {
  info: IconInfo,
  success: IconCheck,
  warning: IconWarning,
  error: IconClose,
};

// Función pura: estilo por tipo
function IconTipo({ tipo }: { tipo: TipoNotificacion }) {
  const Icono = iconosNotificacion[tipo];
  return <Icono size={14} className={`text-${tipo === 'info' ? 'blue' : tipo === 'success' ? 'emerald' : tipo === 'warning' ? 'amber' : 'red'}-600`} />;
}

const ESTILOS_TIPO: Readonly<Record<TipoNotificacion, { bg: string }>> = {
  info:    { bg: 'bg-blue-50 ring-blue-200' },
  success: { bg: 'bg-emerald-50 ring-emerald-200' },
  warning: { bg: 'bg-amber-50 ring-amber-200' },
  error:   { bg: 'bg-red-50 ring-red-200' },
};

function tiempoRelativo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AlertasPanel({
  notificaciones,
  onMarcarLeida,
  onMarcarTodas,
}: AlertasPanelProps) {
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <IconNotification size={16} /> Alertas
          {noLeidas > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {noLeidas}
            </span>
          )}
        </h3>
        {noLeidas > 0 && onMarcarTodas && (
          <button
            onClick={onMarcarTodas}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">Sin notificaciones</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {notificaciones.slice(0, 20).map((n) => {
            const estilo = ESTILOS_TIPO[n.tipo];
            return (
              <div
                key={n.id}
                onClick={() => !n.leida && onMarcarLeida?.(n.id)}
                className={clsx(
                  'cursor-pointer rounded-lg p-3 text-xs ring-1 transition-opacity animate-fade-in',
                  estilo.bg,
                  n.leida && 'opacity-50',
                )}
              >
                <div className="flex items-start gap-2">
                  <IconTipo tipo={n.tipo} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{n.titulo}</p>
                    <p className="text-slate-600">{n.mensaje}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {tiempoRelativo(n.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
