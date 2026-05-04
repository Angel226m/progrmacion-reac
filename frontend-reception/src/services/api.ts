// ═══════════════════════════════════════════════════════════
// HotelFlux — API Client con Fallback + CRUD completo
// Funcional: intenta API real, si falla usa mock store
// Patrón: graceful degradation + CQRS
// ═══════════════════════════════════════════════════════════

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
import { mockLogin, MOCK_METRICAS } from './mock-data';
import {
  habitacionStore,
  huespedStore,
  productoStore,
  reservaStore,
  tareaStore,
  type CrearHabitacionDTO,
  type ActualizarHabitacionDTO,
  type CrearHuespedDTO,
  type CrearProductoDTO,
  type CrearReservaDirectaDTO,
} from './mock-store';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Flag global: modo offline ──

let _offlineMode = false;
export function isOfflineMode(): boolean { return _offlineMode; }

// ── Helper funcional: fetch con tipado ──

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
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Helper: intenta API, si falla retorna fallback ──

async function withFallback<T>(
  apiFn: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    const result = await apiFn();
    _offlineMode = false;
    return result;
  } catch {
    _offlineMode = true;
    return fallback();
  }
}

// ── Auth ──

export const auth = {
  login: async (dto: LoginDTO): Promise<AuthResponse> => {
    return withFallback(
      () => apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
      () => {
        const result = mockLogin(dto.email, dto.password);
        if (!result) throw new Error('Credenciales inválidas');
        return result;
      },
    );
  },

  registro: (datos: LoginDTO & { nombre: string; rol?: string }) =>
    apiFetch<AuthResponse>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
} as const;

// ═══════════════════════════════════════════════════════════
// COMANDOS CQRS (escritura)
// ═══════════════════════════════════════════════════════════

export const comandos = {
  // ── Reservas ──
  crearReserva: (dto: CrearReservaDTO, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva }>('/reservas', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const { reserva } = reservaStore.crearDirecta({
          huesped_id: dto.huesped_id,
          habitacion_id: dto.habitacion_id,
          fecha_entrada: dto.fecha_entrada,
          fecha_salida: dto.fecha_salida,
          metodo_pago: 'efectivo',
        });
        return { reserva };
      },
    ),

  crearReservaDirecta: (dto: CrearReservaDirectaDTO, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva; huesped: Huesped }>('/reservas/directa', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => reservaStore.crearDirecta(dto),
    ),

  cancelarReserva: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva }>(`/reservas/${id}/cancelar`, { method: 'PUT' }, token),
      () => {
        const reserva = reservaStore.cancelar(id);
        if (!reserva) throw new Error('Reserva no encontrada');
        return { reserva };
      },
    ),

  checkin: (dto: CheckInDTO, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva }>('/checkin', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const reserva = reservaStore.checkin(dto.reserva_id);
        if (!reserva) throw new Error('Reserva no encontrada');
        return { reserva };
      },
    ),

  checkout: (dto: CheckOutDTO, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva }>('/checkout', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const reserva = reservaStore.checkout(dto.reserva_id);
        if (!reserva) throw new Error('Reserva no encontrada');
        return { reserva };
      },
    ),

  venderProducto: (dto: VentaProductoDTO, token: string) =>
    withFallback(
      () => apiFetch<{ consumo: Record<string, unknown> }>('/productos/vender', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => ({ consumo: { id: `con-${Date.now()}`, ...dto } }),
    ),

  // ── Habitaciones CRUD ──
  crearHabitacion: (dto: CrearHabitacionDTO, token: string) =>
    withFallback(
      () => apiFetch<{ habitacion: Habitacion }>('/habitaciones', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => ({ habitacion: habitacionStore.crear(dto) }),
    ),

  actualizarHabitacion: (id: string, dto: ActualizarHabitacionDTO, token: string) =>
    withFallback(
      () => apiFetch<{ habitacion: Habitacion }>(`/habitaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const habitacion = habitacionStore.actualizar(id, dto);
        if (!habitacion) throw new Error('Habitación no encontrada');
        return { habitacion };
      },
    ),

  eliminarHabitacion: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/habitaciones/${id}`, { method: 'DELETE' }, token),
      () => ({ ok: habitacionStore.eliminar(id) }),
    ),

  generarHabitacionesPiso: (piso: number, cantidad: number, tipo: string, token: string) =>
    withFallback(
      () => apiFetch<{ habitaciones: Habitacion[] }>('/habitaciones/generar', {
        method: 'POST',
        body: JSON.stringify({ piso, cantidad, tipo }),
      }, token),
      () => ({ habitaciones: habitacionStore.generarHabitacionesPiso(piso, cantidad, tipo as 'simple' | 'doble' | 'suite' | 'presidencial') }),
    ),

  // ── Huéspedes CRUD ──
  crearHuesped: (dto: CrearHuespedDTO, token: string) =>
    withFallback(
      () => apiFetch<{ huesped: Huesped }>('/huespedes', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => ({ huesped: huespedStore.crear(dto) }),
    ),

  actualizarHuesped: (id: string, dto: Partial<CrearHuespedDTO>, token: string) =>
    withFallback(
      () => apiFetch<{ huesped: Huesped }>(`/huespedes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const huesped = huespedStore.actualizar(id, dto);
        if (!huesped) throw new Error('Huésped no encontrado');
        return { huesped };
      },
    ),

  eliminarHuesped: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/huespedes/${id}`, { method: 'DELETE' }, token),
      () => ({ ok: huespedStore.eliminar(id) }),
    ),

  // ── Productos CRUD ──
  crearProducto: (dto: CrearProductoDTO, token: string) =>
    withFallback(
      () => apiFetch<{ producto: Producto }>('/productos', {
        method: 'POST',
        body: JSON.stringify(dto),
      }, token),
      () => ({ producto: productoStore.crear(dto) }),
    ),

  actualizarProducto: (id: string, dto: Partial<CrearProductoDTO> & { activo?: boolean }, token: string) =>
    withFallback(
      () => apiFetch<{ producto: Producto }>(`/productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }, token),
      () => {
        const producto = productoStore.actualizar(id, dto);
        if (!producto) throw new Error('Producto no encontrado');
        return { producto };
      },
    ),

  eliminarProducto: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/productos/${id}`, { method: 'DELETE' }, token),
      () => ({ ok: productoStore.eliminar(id) }),
    ),
} as const;

// ═══════════════════════════════════════════════════════════
// QUERIES CQRS (lectura) — usan el store mutable
// ═══════════════════════════════════════════════════════════

export const queries = {
  listarHabitaciones: (token: string) =>
    withFallback(
      () => apiFetch<{ habitaciones: Habitacion[] }>('/query/habitaciones', {}, token),
      () => ({ habitaciones: habitacionStore.listar() }),
    ),

  obtenerHabitacion: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ habitacion: Habitacion }>(`/query/habitaciones/${id}`, {}, token),
      () => {
        const habitacion = habitacionStore.obtener(id);
        if (!habitacion) throw new Error('No encontrada');
        return { habitacion };
      },
    ),

  listarReservas: (token: string) =>
    withFallback(
      () => apiFetch<{ reservas: Reserva[] }>('/query/reservas', {}, token),
      () => ({ reservas: reservaStore.listar() }),
    ),

  obtenerReserva: (id: string, token: string) =>
    withFallback(
      () => apiFetch<{ reserva: Reserva }>(`/query/reservas/${id}`, {}, token),
      () => {
        const reserva = reservaStore.obtener(id);
        if (!reserva) throw new Error('No encontrada');
        return { reserva };
      },
    ),

  reservasActivas: (token: string) =>
    withFallback(
      () => apiFetch<{ reservas: Reserva[] }>('/query/reservas/activas', {}, token),
      () => ({ reservas: reservaStore.activas() }),
    ),

  listarHuespedes: (token: string) =>
    withFallback(
      () => apiFetch<{ huespedes: Huesped[] }>('/query/huespedes', {}, token),
      () => ({ huespedes: huespedStore.listar() }),
    ),

  listarProductos: (token: string) =>
    withFallback(
      () => apiFetch<{ productos: Producto[] }>('/query/productos', {}, token),
      () => ({ productos: productoStore.listar() }),
    ),

  listarTareas: (token: string) =>
    withFallback(
      () => apiFetch<{ tareas: TareaLimpieza[] }>('/query/tareas', {}, token),
      () => ({ tareas: tareaStore.listar() }),
    ),

  metricasDashboard: (token: string) =>
    withFallback(
      () => apiFetch<MetricasDashboard>('/query/dashboard/metricas', {}, token),
      () => {
        const habs = habitacionStore.listar();
        const total = habs.length;
        const disponibles = habs.filter((h) => h.estado === 'disponible').length;
        const ocupadas = habs.filter((h) => h.estado === 'ocupada').length;
        const en_limpieza = habs.filter((h) => h.estado === 'en_limpieza').length;
        const en_mantenimiento = habs.filter((h) => h.estado === 'en_mantenimiento').length;
        const reservadas = habs.filter((h) => h.estado === 'reservada').length;
        return {
          ...MOCK_METRICAS,
          total_habitaciones: total,
          disponibles,
          ocupadas,
          en_limpieza,
          en_mantenimiento,
          reservadas,
          porcentaje_ocupacion: total > 0 ? Math.round((ocupadas / total) * 1000) / 10 : 0,
        };
      },
    ),
} as const;
