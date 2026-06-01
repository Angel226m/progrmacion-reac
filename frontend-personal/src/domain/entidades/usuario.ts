// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Usuario
// ═══════════════════════════════════════════════════════════

export type RolUsuario = 'admin' | 'recepcionista' | 'limpieza' | 'mantenimiento' | 'huesped';

export type MetodoPago = 'tarjeta' | 'efectivo' | 'transferencia';

export interface Usuario {
  readonly id: string;
  readonly email: string;
  readonly nombre: string;
  readonly rol: RolUsuario;
  readonly activo: boolean;
  readonly inserted_at?: string;
}
