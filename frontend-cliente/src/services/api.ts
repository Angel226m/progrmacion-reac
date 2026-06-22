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
} from '../domain/types';
import type { Result } from '../domain/result';
import { fromPromise } from '../domain/result';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function isOfflineMode(): boolean {
  return !navigator.onLine;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function safeApiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<Result<T>> {
  return fromPromise(apiFetch<T>(endpoint, options, token), (e): Error =>
    e instanceof Error ? e : new Error(String(e)),
  );
}

export const auth = {
  login: (dto: LoginDTO): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  registro: (datos: LoginDTO & { nombre: string; rol?: string }) =>
    apiFetch<AuthResponse>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
} as const;

export const comandos = {
  crearReserva: (dto: CrearReservaDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/reservas', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  crearReservaDirecta: (dto: unknown, token: string) =>
    apiFetch<{ reserva: Reserva; huesped: Huesped }>('/reservas/directa', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  cancelarReserva: (id: string, token: string) =>
    apiFetch<{ reserva: Reserva }>(`/reservas/${id}/cancelar`, { method: 'PUT' }, token),

  checkin: (dto: CheckInDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/checkin', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  checkout: (dto: CheckOutDTO, token: string) =>
    apiFetch<{ reserva: Reserva }>('/checkout', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  venderProducto: (dto: VentaProductoDTO, token: string) =>
    apiFetch<{ consumo: Record<string, unknown> }>('/productos/venta', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  crearHabitacion: (dto: unknown, token: string) =>
    apiFetch<{ habitacion: Habitacion }>('/habitaciones', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  actualizarHabitacion: (id: string, dto: unknown, token: string) =>
    apiFetch<{ habitacion: Habitacion }>(`/habitaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }, token),

  eliminarHabitacion: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/habitaciones/${id}`, { method: 'DELETE' }, token),

  generarHabitacionesPiso: (piso: number, cantidad: number, tipo: string, token: string) =>
    apiFetch<{ habitaciones: Habitacion[] }>('/habitaciones/generar', {
      method: 'POST',
      body: JSON.stringify({ piso, cantidad, tipo }),
    }, token),

  crearHuesped: (dto: unknown, token: string) =>
    apiFetch<{ huesped: Huesped }>('/huespedes', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  actualizarHuesped: (id: string, dto: unknown, token: string) =>
    apiFetch<{ huesped: Huesped }>(`/huespedes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }, token),

  eliminarHuesped: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/huespedes/${id}`, { method: 'DELETE' }, token),

  crearProducto: (dto: unknown, token: string) =>
    apiFetch<{ producto: Producto }>('/productos', {
      method: 'POST',
      body: JSON.stringify(dto),
    }, token),

  actualizarProducto: (id: string, dto: unknown, token: string) =>
    apiFetch<{ producto: Producto }>(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }, token),

  eliminarProducto: (id: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/productos/${id}`, { method: 'DELETE' }, token),
} as const;

export const queries = {
  listarHabitaciones: (token: string) =>
    apiFetch<{ habitaciones: Habitacion[] }>('/query/habitaciones', {}, token),

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
} as const;