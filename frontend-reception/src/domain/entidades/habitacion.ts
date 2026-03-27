// ═══════════════════════════════════════════════════════════
// HotelFlux — Entidad: Habitación
// ═══════════════════════════════════════════════════════════

export type EstadoHabitacion =
  | 'disponible'
  | 'reservada'
  | 'ocupada'
  | 'en_limpieza'
  | 'en_mantenimiento'
  | 'bloqueada';

export type TipoHabitacion = 'simple' | 'doble' | 'suite' | 'penthouse';

export interface Habitacion {
  readonly id: string;
  readonly numero: string;
  readonly tipo: TipoHabitacion;
  readonly piso: number;
  readonly capacidad: number;
  readonly precio_noche: string;
  readonly estado: EstadoHabitacion;
  readonly amenidades: readonly string[];
  readonly clasificacion: string | null;
  readonly caracteristicas: Record<string, unknown> | null;
  readonly notas: string | null;
  readonly inserted_at: string;
  readonly updated_at: string;
}

export const COLOR_ESTADO: Readonly<Record<EstadoHabitacion, string>> = {
  disponible: '#10b981',
  reservada: '#3b82f6',
  ocupada: '#ef4444',
  en_limpieza: '#f59e0b',
  en_mantenimiento: '#8b5cf6',
  bloqueada: '#6b7280',
} as const;

export const LABEL_ESTADO: Readonly<Record<EstadoHabitacion, string>> = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  ocupada: 'Ocupada',
  en_limpieza: 'En Limpieza',
  en_mantenimiento: 'Mantenimiento',
  bloqueada: 'Bloqueada',
} as const;
