// ═══════════════════════════════════════════════════════════
// HotelFlux — Barrel Export de todas las entidades del dominio
// Arquitectura Limpia: cada entidad en su propio archivo
// ═══════════════════════════════════════════════════════════

export type {
  EstadoHabitacion,
  TipoHabitacion,
  Habitacion,
} from './habitacion';
export { COLOR_ESTADO, LABEL_ESTADO } from './habitacion';

export type { Huesped } from './huesped';

export type { EstadoReserva, Reserva } from './reserva';

export type { EstadoTarea, TareaLimpieza } from './tarea-limpieza';

export type { CategoriaProducto, Producto } from './producto';

export type { Consumo } from './consumo';

export type { RolUsuario, MetodoPago, Usuario } from './usuario';

export type { MetricasDashboard, ConteoEstados } from './metricas';

export type {
  EventoDominio,
  CrearReservaDTO,
  CheckInDTO,
  CheckOutDTO,
  VentaProductoDTO,
  LoginDTO,
  AuthResponse,
  SagaProgressEvent,
} from './dtos';
