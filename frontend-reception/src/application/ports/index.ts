// ═══════════════════════════════════════════════════════════
// HotelFlux — Capa de Aplicación: Contratos (Ports)
//
// Interfaces que define la capa de aplicación.
// La infraestructura implementa estos contratos.
// Los casos de uso dependen de estas abstracciones.
//
// Clean Architecture: domain → application → infrastructure
// El dominio no conoce a la infraestructura.
// ═══════════════════════════════════════════════════════════

import type { Observable } from 'rxjs';
// Clean Architecture: la capa de aplicación depende del dominio, nunca al revés.
// Los puertos definen los contratos (interfaces) que la infraestructura implementará.
import type { Result } from '../../domain/result';
import type { Habitacion } from '../../domain/entidades/habitacion';
import type { Reserva } from '../../domain/entidades/reserva';
import type { TareaLimpieza } from '../../domain/entidades/tarea-limpieza';
import type { Huesped } from '../../domain/entidades/huesped';
import type { MetricasDashboard } from '../../domain/entidades/metricas';
import type { AuthResponse, LoginDTO } from '../../domain/entidades/dtos';

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Habitaciones
// ──────────────────────────────────────────────────────────

export interface IHabitacionRepository {
  /** Obtiene todas las habitaciones con filtros opcionales */
  listar(filtros?: Partial<{ estado: string; piso: number }>): Promise<Result<readonly Habitacion[]>>;

  /** Obtiene una habitación por ID */
  obtener(id: string): Promise<Result<Habitacion>>;

  /** Cambia el estado de una habitación */
  cambiarEstado(id: string, nuevoEstado: string): Promise<Result<Habitacion>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Reservas
// ──────────────────────────────────────────────────────────

export interface IReservaRepository {
  listar(filtros?: Partial<{ estado: string }>): Promise<Result<readonly Reserva[]>>;
  obtener(id: string): Promise<Result<Reserva>>;
  crear(params: CrearReservaParams): Promise<Result<Reserva>>;
  actualizar(id: string, params: Partial<Reserva>): Promise<Result<Reserva>>;
  listarActivas(): Promise<Result<readonly Reserva[]>>;
}

export interface CrearReservaParams {
  readonly habitacion_id: string;
  readonly huesped_id: string;
  readonly fecha_entrada: string;
  readonly fecha_salida: string;
  readonly notas?: string;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Huéspedes
// ──────────────────────────────────────────────────────────

export interface IHuespedRepository {
  listar(): Promise<Result<readonly Huesped[]>>;
  obtener(id: string): Promise<Result<Huesped>>;
  buscarPorDocumento(documento: string): Promise<Result<Huesped | null>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Tareas
// ──────────────────────────────────────────────────────────

export interface ITareaRepository {
  listar(filtros?: Partial<{ estado: string; personal_id: string }>): Promise<Result<readonly TareaLimpieza[]>>;
  actualizarEstado(id: string, estado: string): Promise<Result<TareaLimpieza>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Servicio de Autenticación
// ──────────────────────────────────────────────────────────

export interface IAuthService {
  login(credentials: LoginDTO): Promise<Result<AuthResponse>>;
  logout(): Promise<Result<void>>;
  renovarToken(): Promise<Result<AuthResponse>>;
  obtenerPerfil(): Promise<Result<AuthResponse['usuario']>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Servicio de Métricas
// ──────────────────────────────────────────────────────────

export interface IMetricasService {
  obtenerDashboard(): Promise<Result<MetricasDashboard>>;
  /** Stream reactivo de métricas en tiempo real */
  metricas$: Observable<MetricasDashboard>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Caché Local
// ──────────────────────────────────────────────────────────

export interface ICacheLocal {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
}
