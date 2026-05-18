// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Consumo
// ═══════════════════════════════════════════════════════════

import type { Producto } from './producto';

export interface Consumo {
  readonly id: string;
  readonly reserva_id: string;
  readonly producto_id: string;
  readonly cantidad: number;
  readonly precio_unitario: string;
  readonly total: string;
  readonly estado: string;
  readonly producto?: Producto;
  readonly inserted_at: string;
}
