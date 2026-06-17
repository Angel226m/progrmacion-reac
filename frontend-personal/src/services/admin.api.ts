// ═══════════════════════════════════════════════════════════
// HotelFlux — Admin API Service
// Servicio para endpoints administrativos: personal, turnos,
// horarios, pisos, dashboard analítico, exportación CSV
// ═══════════════════════════════════════════════════════════

import { fromPromise } from '../domain/result';
import type { Result } from '../domain/result';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

async function adminFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${BASE_URL}/admin${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/** Safe variant that returns a Result monad — nunca lanza excepción. */
export async function safeAdminFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<Result<T, Error>> {
  return fromPromise(adminFetch<T>(endpoint, token, options), (e) =>
    e instanceof Error ? e : new Error(String(e)),
  );
}



// ── Tipos para Admin ──

export interface Piso {
  readonly id: string;
  readonly numero: number;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly activo: boolean;
}

export interface Turno {
  readonly id: string;
  readonly nombre: string;
  readonly hora_inicio: string;
  readonly hora_fin: string;
  readonly activo: boolean;
}

export interface Empleado {
  readonly id: string;
  readonly nombre: string;
  readonly email: string;
  readonly rol: string;
  readonly activo: boolean;
}

export interface Horario {
  readonly id: string;
  readonly fecha: string;
  readonly dia_semana: number;
  readonly estado: 'programado' | 'asistio' | 'falta' | 'permiso';
  readonly notas: string | null;
  readonly empleado: Empleado | null;
  readonly turno: Turno | null;
}

export interface MetricasAdmin {
  readonly ocupacion: {
    readonly porcentaje: number;
    readonly total: number;
    readonly ocupadas: number;
    readonly disponibles: number;
  };
  readonly ingresos: {
    readonly ingresos_reservas: string;
    readonly ingresos_consumos: string;
    readonly total: string;
  };
  readonly reservas: {
    readonly total: number;
    readonly confirmadas: number;
    readonly canceladas: number;
    readonly checked_in: number;
  };
  readonly limpieza: {
    readonly promedio_minutos: number;
    readonly completadas: number;
    readonly pendientes: number;
  };
  readonly productos_populares: Array<{
    readonly nombre: string;
    readonly total_vendido: number;
    readonly ingresos: string;
  }>;
}

export type Periodo = 'dia' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'anual';

// ── Pisos ──

export const pisos = {
  listar: (token: string) =>
    adminFetch<{ data: Piso[] }>('/pisos', token),

  crear: (data: Partial<Piso>, token: string) =>
    adminFetch<{ ok: boolean; piso: Piso }>('/pisos', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizar: (id: string, data: Partial<Piso>, token: string) =>
    adminFetch<{ ok: boolean; piso: Piso }>(`/pisos/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  eliminar: (id: string, token: string) =>
    adminFetch<{ ok: boolean }>(`/pisos/${id}`, token, { method: 'DELETE' }),
} as const;

// ── Personal ──

export const personal = {
  listar: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return adminFetch<{ data: Empleado[] }>(`/personal${query}`, token);
  },

  crear: (data: Record<string, unknown>, token: string) =>
    adminFetch<{ ok: boolean; usuario: Empleado }>('/personal', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizar: (id: string, data: Record<string, unknown>, token: string) =>
    adminFetch<{ ok: boolean; usuario: Empleado }>(`/personal/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  eliminar: (id: string, token: string) =>
    adminFetch<{ ok: boolean }>(`/personal/${id}`, token, { method: 'DELETE' }),

  conteo: (token: string) =>
    adminFetch<{ data: Record<string, number> }>('/personal/conteo', token),
} as const;

// ── Turnos y Horarios ──

export const horarios = {
  listarTurnos: (token: string) =>
    adminFetch<{ data: Turno[] }>('/turnos', token),

  asignar: (data: Record<string, unknown>, token: string) =>
    adminFetch<{ ok: boolean; horario: Horario }>('/horarios', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generarSemana: (data: { empleado_id: string; turno_id: string; fecha_inicio: string; dias: number[] }, token: string) =>
    adminFetch<{ ok: boolean; total_creados: number; horarios: Horario[] }>('/horarios/semana', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  semanaActual: (token: string) =>
    adminFetch<{ data: Horario[] }>('/horarios/semana', token),

  porEmpleado: (id: string, token: string, desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const query = params.toString() ? `?${params.toString()}` : '';
    return adminFetch<{ data: Horario[] }>(`/horarios/empleado/${id}${query}`, token);
  },

  actualizarAsistencia: (id: string, estado: string, token: string) =>
    adminFetch<{ ok: boolean; horario: Horario }>(`/horarios/${id}/estado`, token, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    }),
} as const;

// ── Dashboard Analítico ──

export const dashboard = {
  metricas: (token: string, periodo: Periodo = 'dia') =>
    adminFetch<{ data: MetricasAdmin; fuente: string }>(`/dashboard?periodo=${periodo}`, token),

  reservas: (token: string, periodo: Periodo = 'mes') =>
    adminFetch<{ data: Array<Record<string, unknown>> }>(`/analitica/reservas?periodo=${periodo}`, token),

  ingresos: (token: string, periodo: Periodo = 'mes') =>
    adminFetch<{ data: { diario: Array<Record<string, unknown>>; resumen: Record<string, string> } }>(`/analitica/ingresos?periodo=${periodo}`, token),

  productos: (token: string, periodo: Periodo = 'mes') =>
    adminFetch<{ data: { top_productos: Array<Record<string, unknown>>; por_categoria: Array<Record<string, unknown>> } }>(`/analitica/productos?periodo=${periodo}`, token),
} as const;

// ── Exportación CSV ──

export const exportar = {
  reservas: async (token: string, periodo: Periodo = 'mes') => {
    const response = await fetch(`${BASE_URL}/admin/exportar/reservas?periodo=${periodo}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    descargarBlob(blob, `reservas_${periodo}.csv`);
  },

  ingresos: async (token: string, periodo: Periodo = 'mes') => {
    const response = await fetch(`${BASE_URL}/admin/exportar/ingresos?periodo=${periodo}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    descargarBlob(blob, `ingresos_${periodo}.csv`);
  },

  personal: async (token: string) => {
    const response = await fetch(`${BASE_URL}/admin/exportar/personal`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    descargarBlob(blob, 'personal_hotelflux.csv');
  },
} as const;

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
