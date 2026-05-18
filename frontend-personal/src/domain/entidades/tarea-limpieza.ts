// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Tarea de Limpieza
// ═══════════════════════════════════════════════════════════

import type { Habitacion } from './habitacion';

export type EstadoTarea = 'pendiente' | 'en_proceso' | 'completada' | 'con_problema';

export interface TareaLimpieza {
  readonly id: string;
  readonly habitacion_id: string;
  readonly empleado_id: string | null;
  readonly estado: EstadoTarea;
  readonly prioridad: number;
  readonly notas: string | null;
  readonly iniciada_at: string | null;
  readonly completada_at: string | null;
  readonly habitacion?: Habitacion;
  readonly inserted_at: string;
}
