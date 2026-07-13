// ═══════════════════════════════════════════════════════════
// HotelFlux — LimpiezaPage (gestión de tareas de limpieza)
// Vista para personal de limpieza y administradores.
// Muestra tareas en vivo con inicio y finalización de limpieza
// ═══════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { comandos } from '../services/api';
import { useLimpiezaStream } from '../hooks/useLimpiezaStream';
import ListaTareas from '../components/limpieza/ListaTareas';
import { IconLimpieza, IconLive } from '../components/shared/Icons';
import { fromPromise, fold, err, toError } from '../domain/result';

export default function LimpiezaPage() {
  const { token, usuario } = useAuth();
  const esLimpieza = usuario?.rol === 'limpieza';
  const { tareas, conteo } = useLimpiezaStream(esLimpieza);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleActualizarEstado = useCallback(
    async (tareaId: string, nuevoEstado: string) => {
      const result = await (token
        ? fromPromise(comandos.actualizarEstadoTarea(tareaId, nuevoEstado, token), toError)
        : Promise.resolve(err(new Error('No autorizado')))
      );
      fold(
        () => setFeedback({
          type: 'success',
          text: nuevoEstado === 'en_proceso'
            ? 'Limpieza iniciada — vía WebSocket reactivo'
            : 'Limpieza completada — habitación disponible automáticamente',
        }),
        (error: Error) => setFeedback({ type: 'error', text: error.message }),
      )(result);
      result.ok && setTimeout(() => setFeedback(null), 4000);
    },
    [token],
  );

  const handleIniciar = useCallback(
    (tareaId: string) => handleActualizarEstado(tareaId, 'en_proceso'),
    [handleActualizarEstado],
  );

  const handleCompletar = useCallback(
    (tareaId: string) => handleActualizarEstado(tareaId, 'completada'),
    [handleActualizarEstado],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/25">
            <IconLimpieza size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Limpieza</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {esLimpieza
                ? `Mis tareas asignadas — ${usuario?.nombre ?? ''}`
                : 'Vista general de todas las tareas de limpieza'}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <IconLive size={12} className="text-emerald-500" />
          En vivo
        </span>
      </div>

      {feedback && (
        <div
          className={`mb-4 animate-fade-in rounded-lg px-4 py-3 text-sm ring-1 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <ListaTareas
        tareas={tareas}
        conteo={conteo}
        onIniciar={handleIniciar}
        onCompletar={handleCompletar}
      />
    </div>
  );
}
