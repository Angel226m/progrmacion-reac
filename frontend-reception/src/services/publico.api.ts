// ═══════════════════════════════════════════════════════════
// HotelFlux — Servicio API Público (Clientes)
// Sin autenticación — Endpoints para huéspedes
// ═══════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

async function publicoFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/publico${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(body.error || `Error ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════

export interface InfoHotel {
  nombre: string;
  descripcion: string;
  pisos: { id: string; numero: number; nombre: string; descripcion: string | null }[];
  tipos_habitacion: { tipo: string; descripcion: string; capacidad: number; icono: string }[];
  servicios: { nombre: string; icono: string }[];
  contacto: { telefono: string; email: string; direccion: string };
}

export interface HabitacionPublica {
  id: string;
  numero: number;
  tipo: string;
  piso: number;
  precio_noche: string | null;
  clasificacion: string | null;
  caracteristicas: string | null;
  amenidades: string[];
}

export interface DisponibilidadResult {
  habitaciones: HabitacionPublica[];
  total: number;
  fecha_entrada: string;
  fecha_salida: string;
  noches: number;
}

export interface TipoHabitacionInfo {
  tipo: string;
  cantidad_total: number;
  disponibles: number;
  precio_desde: string | null;
  precio_hasta: string | null;
}

export interface ReservaCreada {
  id: string;
  estado: string;
  habitacion_numero: number;
  habitacion_tipo: string;
  fecha_entrada: string;
  fecha_salida: string;
  total: string;
  codigo_confirmacion: string;
}

export interface SeccionLegal {
  titulo: string;
  contenido: string;
}

export interface DocumentoLegal {
  titulo: string;
  version: string;
  fecha_actualizacion: string;
  ley_aplicable?: string;
  reglamento?: string;
  secciones: SeccionLegal[];
}

export interface ServicioCategoria {
  categoria: string;
  productos: {
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: string;
  }[];
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/** Información general del hotel */
export async function obtenerInfoHotel(): Promise<InfoHotel> {
  const res = await publicoFetch<{ data: InfoHotel }>('/info');
  return res.data;
}

/** Buscar habitaciones disponibles por rango de fechas */
export async function buscarDisponibilidad(params: {
  fecha_entrada: string;
  fecha_salida: string;
  tipo?: string;
  capacidad?: number;
}): Promise<DisponibilidadResult> {
  const query = new URLSearchParams();
  query.set('fecha_entrada', params.fecha_entrada);
  query.set('fecha_salida', params.fecha_salida);
  if (params.tipo) query.set('tipo', params.tipo);
  if (params.capacidad) query.set('capacidad', String(params.capacidad));

  const res = await publicoFetch<{ data: DisponibilidadResult }>(`/disponibilidad?${query}`);
  return res.data;
}

/** Obtener tipos de habitación con precios */
export async function obtenerTiposHabitacion(): Promise<TipoHabitacionInfo[]> {
  const res = await publicoFetch<{ data: TipoHabitacionInfo[] }>('/habitaciones/tipos');
  return res.data;
}

/** Crear una reserva como huésped */
export async function crearReservaPublica(datos: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  documento_tipo?: string;
  nacionalidad?: string;
  habitacion_id: string;
  fecha_entrada: string;
  fecha_salida: string;
  notas?: string;
}): Promise<ReservaCreada> {
  const res = await publicoFetch<{ ok: boolean; reserva: ReservaCreada }>('/reservar', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return res.reserva;
}

/** Consultar estado de una reserva */
export async function consultarReserva(id: string): Promise<{
  id: string;
  estado: string;
  fecha_entrada: string;
  fecha_salida: string;
  total: string | null;
  noches: number | null;
}> {
  const res = await publicoFetch<{ data: ReturnType<typeof consultarReserva> extends Promise<infer T> ? T : never }>(`/reserva/${id}`);
  return res.data as Awaited<ReturnType<typeof consultarReserva>>;
}

/** Obtener servicios y productos del hotel */
export async function obtenerServicios(): Promise<ServicioCategoria[]> {
  const res = await publicoFetch<{ data: ServicioCategoria[] }>('/servicios');
  return res.data;
}

/** Obtener política de privacidad */
export async function obtenerPoliticaPrivacidad(): Promise<DocumentoLegal> {
  const res = await publicoFetch<{ data: DocumentoLegal }>('/legal/privacidad');
  return res.data;
}

/** Obtener términos y condiciones */
export async function obtenerTerminos(): Promise<DocumentoLegal> {
  const res = await publicoFetch<{ data: DocumentoLegal }>('/legal/terminos');
  return res.data;
}

/** Obtener política de cookies */
export async function obtenerPoliticaCookies(): Promise<DocumentoLegal> {
  const res = await publicoFetch<{ data: DocumentoLegal }>('/legal/cookies');
  return res.data;
}
