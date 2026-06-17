// ═══════════════════════════════════════════════════════════
// HotelFlux — Servicio API Público (Clientes)
// Sin autenticación — Endpoints para huéspedes
// ═══════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

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
  metodo_pago?: string;
  servicios_extra?: { id: string; nombre: string; precio: string; cantidad: number }[];
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

// ═══════════════════════════════════════════════════════════
// CLIENTE AUTENTICADO
// ═══════════════════════════════════════════════════════════

export interface ReservaClienteReal {
  id: string;
  codigo: string;
  habitacion: string;
  tipo: string;
  piso: number | null;
  fecha_entrada: string;
  fecha_salida: string;
  estado: 'confirmada' | 'checked_in' | 'checked_out' | 'cancelada' | 'pendiente';
  total: string;
  notas: string | null;
  inserted_at: string;
}

export interface ConsumoReserva {
  id: string;
  producto: string;
  cantidad: number;
  precio_unitario: string;
  total: string;
  estado: string;
  inserted_at: string;
}

export interface ReservaDetalle extends ReservaClienteReal {
  habitacion_id: string;
  clasificacion: string | null;
  amenidades: string[];
  caracteristicas: string | null;
  noches: number;
  precio_noche: string;
  metodo_pago: string | null;
  updated_at: string;
  huesped: HuespedPerfil | null;
  consumos: ConsumoReserva[];
}

export interface HuespedPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  documento: string | null;
  nacionalidad: string | null;
  inserted_at: string;
}

export interface MisReservasResponse {
  data: ReservaClienteReal[];
  huesped: HuespedPerfil | null;
}

type TokenRefresher = () => Promise<string | null>;

async function clienteFetch<T>(path: string, token: string, options?: RequestInit, onRefresh?: TokenRefresher): Promise<T> {
  const url = `${API_BASE}${path}`;
  const makeRequest = async (t: string) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
        ...(options?.headers as Record<string, string>),
      },
    });

  let res = await makeRequest(token);

  // On 401, try to refresh once
  if (res.status === 401 && onRefresh) {
    const newToken = await onRefresh();
    if (newToken) {
      res = await makeRequest(newToken);
    }
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    const body = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error((body as { error?: string }).error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Obtener reservas del cliente autenticado */
export async function obtenerMisReservas(token: string, onRefresh?: TokenRefresher): Promise<MisReservasResponse> {
  return clienteFetch<MisReservasResponse>('/cliente/reservas', token, undefined, onRefresh);
}

/** Obtener detalle completo de una reserva */
export async function obtenerDetalleReserva(id: string, token: string, onRefresh?: TokenRefresher): Promise<ReservaDetalle> {
  const res = await clienteFetch<{ data: ReservaDetalle }>(`/cliente/reservas/${id}`, token, undefined, onRefresh);
  return res.data;
}

/** Cancelar una reserva propia (solo confirmada/pendiente) */
export async function cancelarMiReserva(id: string, token: string, onRefresh?: TokenRefresher): Promise<void> {
  await clienteFetch<{ ok: boolean }>(`/cliente/reservas/${id}/cancelar`, token, { method: 'PUT' }, onRefresh);
}
