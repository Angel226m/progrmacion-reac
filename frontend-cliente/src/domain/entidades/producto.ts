// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Producto
// ═══════════════════════════════════════════════════════════

export type CategoriaProducto =
  | 'minibar'
  | 'room_service'
  | 'spa'
  | 'lavanderia'
  | 'tour'
  | 'estacionamiento';

export interface Producto {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: CategoriaProducto;
  readonly precio: string;
  readonly stock: number;
  readonly descripcion: string | null;
  readonly activo: boolean;
  readonly inserted_at: string;
}
