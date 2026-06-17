// ═══════════════════════════════════════════════════════════
// HotelFlux — Re-exportación centralizada de tipos del dominio
// Arquitectura Limpia: cada entidad vive en src/domain/entidades/
// Este archivo mantiene retrocompatibilidad con imports existentes
// ═══════════════════════════════════════════════════════════

export type {
  EstadoHabitacion,
  TipoHabitacion,
  Habitacion,
} from './entidades/habitacion';
export { COLOR_ESTADO, CLASE_ESTADO, LABEL_ESTADO } from './entidades/habitacion';

export type { Huesped } from './entidades/huesped';

export type { EstadoReserva, Reserva } from './entidades/reserva';

export type { EstadoTarea, TareaLimpieza } from './entidades/tarea-limpieza';

export type { CategoriaProducto, Producto } from './entidades/producto';

export type { Consumo } from './entidades/consumo';
export type { ServicioPorDia, ServicioReservaItem } from './entidades/reserva-servicio';

export type { RolUsuario, MetodoPago, Usuario } from './entidades/usuario';

export type { MetricasDashboard, ConteoEstados } from './entidades/metricas';

export type {
  EventoDominio,
  CrearReservaDTO,
  CheckInDTO,
  CheckOutDTO,
  VentaProductoDTO,
  LoginDTO,
  AuthResponse,
  SagaProgressEvent,
} from './entidades/dtos';
