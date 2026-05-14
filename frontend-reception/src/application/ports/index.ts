// ═══════════════════════════════════════════════════════════
// HotelFlux — Capa de Aplicación: Contratos (Ports)
//
// Interfaces que define la capa de aplicación.
// La infraestructura implementa estos contratos.
// Los casos de uso dependen de estas abstracciones.
//
// Clean Architecture: domain → application → infrastructure
// El dominio no conoce a la infraestructura.
//
// ── Observable Repository Pattern ──
// Cada repositorio expone dos capas de API:
//   1. Métodos imperativos (Promise) — para comandos puntuales
//   2. Streams reactivos (Observable$) — para queries continuas
//      El stream emite el estado inicial Y cada cambio posterior.
//      Nunca completa; el consumidor se suscribe y recibe actualizaciones push.
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
// Observable Repository Pattern:
//   listar$() → Observable que emite estado inicial (API) y cada
//   actualización posterior vía WebSocket/PubSub. No completa jamás.
// ──────────────────────────────────────────────────────────

export interface IHabitacionRepository {
  /** Obtiene todas las habitaciones con filtros opcionales (comando puntual) */
  listar(filtros?: Partial<{ estado: string; piso: number }>): Promise<Result<readonly Habitacion[]>>;
  /** Obtiene una habitación por ID (comando puntual) */
  obtener(id: string): Promise<Result<Habitacion>>;
  /** Cambia el estado de una habitación (comando de escritura) */
  cambiarEstado(id: string, nuevoEstado: string): Promise<Result<Habitacion>>;

  // ── Observable Repository: stream continuo ──
  /** Stream que emite la lista completa al suscribir y re-emite con cada cambio.
   *  Implementa Observer sobre la capa de datos: la infraestructura decide cuándo
   *  notificar (WebSocket push desde el servidor). */
  listar$(filtros?: Partial<{ piso: number }>): Observable<Result<readonly Habitacion[]>>;
  /** Stream de una habitación específica — re-emite al cambiar */
  obtener$(id: string): Observable<Result<Habitacion>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Reservas
// Observable Repository: reservas$ emite siempre que el backend
// notifica (nueva reserva, cambio de estado, saga completada).
// ──────────────────────────────────────────────────────────

export interface IReservaRepository {
  listar(filtros?: Partial<{ estado: string }>): Promise<Result<readonly Reserva[]>>;
  obtener(id: string): Promise<Result<Reserva>>;
  crear(params: CrearReservaParams): Promise<Result<Reserva>>;
  actualizar(id: string, params: Partial<Reserva>): Promise<Result<Reserva>>;
  listarActivas(): Promise<Result<readonly Reserva[]>>;

  // ── Observable Repository ──
  /** Stream continuo de todas las reservas. Re-emite al crearse/actualizarse. */
  listar$(filtros?: Partial<{ estado: string }>): Observable<Result<readonly Reserva[]>>;
  /** Stream de reservas activas en tiempo real */
  activas$(): Observable<Result<readonly Reserva[]>>;
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

  // ── Observable Repository ──
  listar$(): Observable<Result<readonly Huesped[]>>;
}

// ──────────────────────────────────────────────────────────
// PUERTO: Repositorio de Tareas
// ──────────────────────────────────────────────────────────

export interface ITareaRepository {
  listar(filtros?: Partial<{ estado: string; personal_id: string }>): Promise<Result<readonly TareaLimpieza[]>>;
  actualizarEstado(id: string, estado: string): Promise<Result<TareaLimpieza>>;

  // ── Observable Repository ──
  /** Stream de tareas — re-emite con cada asignación o cambio de estado */
  listar$(filtros?: Partial<{ estado: string; personal_id: string }>): Observable<Result<readonly TareaLimpieza[]>>;
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
  /** Stream reactivo de métricas en tiempo real (Observable Repository) */
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
