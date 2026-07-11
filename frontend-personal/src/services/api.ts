import { Observable, from, of, merge } from 'rxjs';
import { switchMap, map, catchError, filter } from 'rxjs/operators';
import type {
  AuthResponse,
  LoginDTO,
  CrearReservaDTO,
  CheckInDTO,
  CheckOutDTO,
  VentaProductoDTO,
  Reserva,
  Habitacion,
  Huesped,
  Producto,
  TareaLimpieza,
  MetricasDashboard,
  ServicioPorDia,
} from '../domain/types';
import type { Result } from '../domain/result';
import { ok, err, fromPromise, fold, toError } from '../domain/result';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function isOfflineMode(): boolean {
  return !navigator.onLine;
}

/** Construye headers comunes */
function buildHeaders(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Versión observable de apiFetch — FRP puro.
 * En lugar de if/throw, usa filter para éxito y catchError para error.
 */
function apiFetch$<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Observable<Result<T>> {
  return from(
    fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...buildHeaders(token), ...(options.headers as Record<string, string>) },
      credentials: 'include',
    }),
  ).pipe(
    switchMap((response) =>
      merge(
        of(response).pipe(
          filter((r) => r.ok),
          switchMap((r) =>
            from(r.json()).pipe(map((data) => ok(data as T))),
          ),
        ),
        of(response).pipe(
          filter((r) => !r.ok),
          switchMap((r) =>
            from(r.json()).pipe(
              map((data) =>
                err(new Error((data as { error?: string }).error || `HTTP ${r.status}`)),
              ),
              catchError(() =>
                of(err(new Error('Error desconocido'))),
              ),
            ),
          ),
        ),
      ),
    ),
    catchError((e: unknown) => of(err(e instanceof Error ? e : new Error(String(e))))),
  );
}

/**
 * Versión Promise<T> — compatibilidad con código legacy.
 * Internamente usa safeApiFetch (FRP puro) y unwraps el Result.
 */
const apiFetch = <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> =>
  safeApiFetch<T>(endpoint, options, token).then(
    (result) => result.ok ? result.value : Promise.reject(result.error) as never,
  );

/** Versión FRP: Promise<Result<T>> — envuelve el observable apiFetch$ */
export const safeApiFetch = <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<Result<T>> =>
  fromPromise(
    new Promise<T>((resolve, reject) =>
      apiFetch$<T>(endpoint, options, token).subscribe({
        next: (result: Result<T>) =>
          fold<T, Error, void>(
            (v) => resolve(v),
            (e) => reject(e),
          )(result),
        error: (e: unknown) => reject(e),
      }),
    ),
    toError,
  );

export const auth = {
  login: (dto: LoginDTO): Promise<AuthResponse> =>
    new Promise<AuthResponse>((resolve, reject) =>
      apiFetch$<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      }      ).subscribe((r: Result<AuthResponse>) =>
        fold<AuthResponse, Error, void>(
          (v) => resolve(v),
          (e) => reject(e),
        )(r),
      ),
    ),

  registro: (datos: LoginDTO & { nombre: string; rol?: string }) =>
    new Promise<AuthResponse>((resolve, reject) =>
      apiFetch$<AuthResponse>('/auth/registro', {
        method: 'POST',
        body: JSON.stringify(datos),
      }).subscribe((r: Result<AuthResponse>) =>
        fold<AuthResponse, Error, void>(
          (v) => resolve(v),
          (e) => reject(e),
        )(r),
      ),
    ),
} as const;

export const comandos = {
  crearReserva: (dto: CrearReservaDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/reservas', { method: 'POST', body: JSON.stringify(dto) }, token),

  crearReservaDirecta: (dto: unknown, token: string) =>
    apiFetch<{ reserva: Reserva; huesped: Huesped }>(
      '/reservas/directa', { method: 'POST', body: JSON.stringify(dto) }, token,
    ),

  cancelarReserva: (id: string, token: string) =>
    apiFetch<{ reserva: Reserva }>(`/reservas/${id}/cancelar`, { method: 'PUT' }, token),

  checkin: (dto: CheckInDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/checkin', { method: 'POST', body: JSON.stringify(dto) }, token),

  checkout: (dto: CheckOutDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/checkout', { method: 'POST', body: JSON.stringify(dto) }, token),

  venderProducto: (dto: VentaProductoDTO, token: string) =>
    apiFetch<{ consumo: Record<string, unknown> }>(
      '/productos/venta', { method: 'POST', body: JSON.stringify(dto) }, token,
    ),

  crearHabitacion: (dto: unknown, token: string) =>
    apiFetch<{ habitacion: Habitacion }>(
      '/habitaciones', { method: 'POST', body: JSON.stringify(dto) }, token,
    ),

  actualizarHabitacion: (id: string, dto: unknown, token: string) =>
    apiFetch<{ habitacion: Habitacion }>(
      `/habitaciones/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, token,
    ),

  eliminarHabitacion: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/habitaciones/${id}`, { method: 'DELETE' }, token),

  generarHabitacionesPiso: (piso: number, cantidad: number, tipo: string, token: string) =>
    apiFetch<{ habitaciones: Habitacion[] }>(
      '/habitaciones/generar', { method: 'POST', body: JSON.stringify({ piso, cantidad, tipo }) }, token,
    ),

  crearHuesped: (dto: unknown, token: string) =>
    apiFetch<{ huesped: Huesped }>('/huespedes', { method: 'POST', body: JSON.stringify(dto) }, token),

  actualizarHuesped: (id: string, dto: unknown, token: string) =>
    apiFetch<{ huesped: Huesped }>(
      `/huespedes/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, token,
    ),

  eliminarHuesped: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/huespedes/${id}`, { method: 'DELETE' }, token),

  crearProducto: (dto: unknown, token: string) =>
    apiFetch<{ producto: Producto }>('/productos', { method: 'POST', body: JSON.stringify(dto) }, token),

  actualizarProducto: (id: string, dto: unknown, token: string) =>
    apiFetch<{ producto: Producto }>(
      `/productos/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, token,
    ),

  eliminarProducto: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/productos/${id}`, { method: 'DELETE' }, token),

  actualizarEstadoTarea: (id: string, estado: string, token: string) =>
    apiFetch<{ ok: boolean; tarea: TareaLimpieza }>(
      `/tareas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }, token,
    ),
} as const;

export const queries = {
  listarHabitaciones: (token: string, fe?: string, fs?: string) =>
    apiFetch<{ habitaciones: Habitacion[] }>(
      fe && fs
        ? `/query/habitaciones?fecha_entrada=${fe}&fecha_salida=${fs}`
        : '/query/habitaciones',
      {}, token,
    ),

  obtenerHabitacion: (id: string, token: string) =>
    apiFetch<{ habitacion: Habitacion }>(`/query/habitaciones/${id}`, {}, token),

  listarReservas: (token: string) =>
    apiFetch<{ reservas: Reserva[] }>('/query/reservas', {}, token),

  obtenerReserva: (id: string, token: string) =>
    apiFetch<{ reserva: Reserva }>(`/query/reservas/${id}`, {}, token),

  reservasActivas: (token: string) =>
    apiFetch<{ reservas: Reserva[] }>('/query/reservas/activas', {}, token),

  listarHuespedes: (token: string) =>
    apiFetch<{ huespedes: Huesped[] }>('/query/huespedes', {}, token),

  listarProductos: (token: string) =>
    apiFetch<{ productos: Producto[] }>('/query/productos', {}, token),

  listarTareas: (token: string) =>
    apiFetch<{ tareas: TareaLimpieza[] }>('/query/tareas', {}, token),

  metricasDashboard: (token: string) =>
    apiFetch<MetricasDashboard>('/query/dashboard/metricas', {}, token),

  serviciosPorReserva: (reservaId: string, token: string) =>
    apiFetch<{ data: ServicioPorDia[] }>(`/query/reservas/${reservaId}/servicios`, {}, token),

  listarProductosServicios: (token: string) =>
    apiFetch<{
      data: { categoria: string; productos: { id: string; nombre: string; precio: string }[] }[]
    }>('/query/productos-servicios', {}, token),
} as const;

export const servicios = {
  agregar: (reservaId: string, dto: { producto_id: string; dia_numero: number; cantidad: number }, token: string) =>
    apiFetch<{ ok: boolean }>(
      `/reservas/${reservaId}/servicios`, { method: 'POST', body: JSON.stringify(dto) }, token,
    ),
} as const;
