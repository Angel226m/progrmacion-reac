// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Huésped
// ═══════════════════════════════════════════════════════════

export interface Huesped {
  readonly id: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly telefono: string | null;
  readonly documento_identidad: string | null;
  readonly nacionalidad: string | null;
  readonly inserted_at: string;
}
