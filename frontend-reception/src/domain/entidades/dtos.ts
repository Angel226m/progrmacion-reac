// ═══════════════════════════════════════════════════════════
// HotelFlux — Tipos: DTOs y Eventos
// ═══════════════════════════════════════════════════════════

import type { Usuario } from './usuario';

// ── Eventos del dominio (Event Sourcing) ──

export interface EventoDominio {
  readonly tipo: string;
  readonly datos: Record<string, unknown>;
  readonly timestamp: string;
  readonly origen: string;
}

// ── DTOs para formularios ──

export interface CrearReservaDTO {
  readonly huesped_id: string;
  readonly habitacion_id: string;
  readonly fecha_entrada: string;
  readonly fecha_salida: string;
}

export interface CheckInDTO {
  readonly reserva_id: string;
}

export interface CheckOutDTO {
  readonly reserva_id: string;
}

export interface VentaProductoDTO {
  readonly reserva_id: string;
  readonly producto_id: string;
  readonly cantidad: number;
}

export interface LoginDTO {
  readonly email: string;
  readonly password: string;
  readonly remember_me?: boolean;
}

// ── Respuestas de la API ──

export interface AuthResponse {
  readonly token: string;
  readonly usuario: Usuario;
}

export interface SagaProgressEvent {
  readonly paso: number;
  readonly total: number;
  readonly descripcion: string;
  readonly estado: 'en_proceso' | 'completado' | 'error';
  readonly timestamp: string;
}
