// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Reserva
// ═══════════════════════════════════════════════════════════

import type { Habitacion } from './habitacion';
import type { Huesped } from './huesped';

export type EstadoReserva = 'confirmada' | 'checked_in' | 'checked_out' | 'cancelada';

export interface Reserva {
  readonly id: string;
  readonly huesped_id: string;
  readonly habitacion_id: string;
  readonly fecha_entrada: string;
  readonly fecha_salida: string;
  readonly estado: EstadoReserva;
  readonly total: string;
  readonly notas: string | null;
  readonly huesped?: Huesped;
  readonly habitacion?: Habitacion;
  readonly inserted_at: string;
}
