// ═══════════════════════════════════════════════════════════
// HotelFlux — Mock Data (datos simulados para demo)
// Se usan cuando la API no está disponible
// Funciones puras: siempre retornan el mismo conjunto de datos
// ═══════════════════════════════════════════════════════════

import type {
  Usuario,
  Habitacion,
  Reserva,
  Huesped,
  Producto,
  TareaLimpieza,
  MetricasDashboard,
  EventoDominio,
  AuthResponse,
} from '../domain/types';

// ── Timestamp compartido ──

const now = new Date().toISOString();

// ── Usuarios demo ──

export const MOCK_USUARIOS: Record<string, { password: string; usuario: Usuario }> = {
  'admin@hotelflux.com': {
    password: 'Admin123!',
    usuario: {
      id: 'usr-001',
      email: 'admin@hotelflux.com',
      nombre: 'Carlos Admin',
      rol: 'admin',
      activo: true,
      inserted_at: now,
    },
  },
  'recepcion@hotelflux.com': {
    password: 'Recepcion123!',
    usuario: {
      id: 'usr-002',
      email: 'recepcion@hotelflux.com',
      nombre: 'María Recepción',
      rol: 'recepcionista',
      activo: true,
      inserted_at: now,
    },
  },
  'limpieza1@hotelflux.com': {
    password: 'Limpieza123!',
    usuario: {
      id: 'usr-004',
      email: 'limpieza1@hotelflux.com',
      nombre: 'Ana Limpieza',
      rol: 'limpieza',
      activo: true,
      inserted_at: now,
    },
  },
  'mantenimiento@hotelflux.com': {
    password: 'Mant123!',
    usuario: {
      id: 'usr-005',
      email: 'mantenimiento@hotelflux.com',
      nombre: 'Pedro Mantenimiento',
      rol: 'mantenimiento',
      activo: true,
      inserted_at: now,
    },
  },
};

// ── Función pura: autenticación mock ──

export function mockLogin(email: string, password: string): AuthResponse | null {
  const entry = MOCK_USUARIOS[email];
  if (!entry || entry.password !== password) return null;
  return {
    token: `mock-jwt-${entry.usuario.rol}-${Date.now()}`,
    usuario: entry.usuario,
  };
}

// ── Habitaciones ──

export const MOCK_HABITACIONES: readonly Habitacion[] = [
  { id: 'hab-101', numero: '101', tipo: 'simple', piso: 1, capacidad: 1, precio_noche: '85.00', estado: 'disponible', amenidades: ['WiFi', 'TV', 'Aire Acondicionado'], clasificacion: 'estandar', caracteristicas: null, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-102', numero: '102', tipo: 'simple', piso: 1, capacidad: 1, precio_noche: '85.00', estado: 'ocupada', amenidades: ['WiFi', 'TV'], clasificacion: 'estandar', caracteristicas: null, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-103', numero: '103', tipo: 'doble', piso: 1, capacidad: 2, precio_noche: '120.00', estado: 'reservada', amenidades: ['WiFi', 'TV', 'Minibar', 'Aire Acondicionado'], clasificacion: 'superior', caracteristicas: { cama: 'king' }, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-104', numero: '104', tipo: 'doble', piso: 1, capacidad: 2, precio_noche: '120.00', estado: 'en_limpieza', amenidades: ['WiFi', 'TV', 'Minibar'], clasificacion: 'superior', caracteristicas: null, notas: 'Limpieza profunda solicitada', inserted_at: now, updated_at: now },
  { id: 'hab-201', numero: '201', tipo: 'doble', piso: 2, capacidad: 2, precio_noche: '130.00', estado: 'disponible', amenidades: ['WiFi', 'TV', 'Minibar', 'Vista Ciudad'], clasificacion: 'superior', caracteristicas: { vista: 'ciudad' }, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-202', numero: '202', tipo: 'suite', piso: 2, capacidad: 3, precio_noche: '220.00', estado: 'ocupada', amenidades: ['WiFi', 'TV', 'Minibar', 'Jacuzzi', 'Terraza'], clasificacion: 'premium', caracteristicas: { jacuzzi: true, terraza: true }, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-203', numero: '203', tipo: 'doble', piso: 2, capacidad: 2, precio_noche: '130.00', estado: 'disponible', amenidades: ['WiFi', 'TV', 'Aire Acondicionado'], clasificacion: 'estandar', caracteristicas: null, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-204', numero: '204', tipo: 'simple', piso: 2, capacidad: 1, precio_noche: '95.00', estado: 'en_mantenimiento', amenidades: ['WiFi', 'TV'], clasificacion: 'estandar', caracteristicas: null, notas: 'Reparación de A/C', inserted_at: now, updated_at: now },
  { id: 'hab-301', numero: '301', tipo: 'suite', piso: 3, capacidad: 3, precio_noche: '250.00', estado: 'disponible', amenidades: ['WiFi', 'TV', 'Minibar', 'Jacuzzi', 'Vista Mar'], clasificacion: 'premium', caracteristicas: { jacuzzi: true, vista: 'mar' }, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-302', numero: '302', tipo: 'presidencial', piso: 3, capacidad: 4, precio_noche: '450.00', estado: 'ocupada', amenidades: ['WiFi', 'TV', 'Minibar', 'Jacuzzi', 'Terraza', 'Butler'], clasificacion: 'premium', caracteristicas: { jacuzzi: true, terraza: true, butler: true }, notas: 'VIP Guest', inserted_at: now, updated_at: now },
  { id: 'hab-303', numero: '303', tipo: 'suite', piso: 3, capacidad: 3, precio_noche: '240.00', estado: 'reservada', amenidades: ['WiFi', 'TV', 'Minibar', 'Vista Mar'], clasificacion: 'premium', caracteristicas: { vista: 'mar' }, notas: null, inserted_at: now, updated_at: now },
  { id: 'hab-304', numero: '304', tipo: 'doble', piso: 3, capacidad: 2, precio_noche: '140.00', estado: 'bloqueada', amenidades: ['WiFi', 'TV'], clasificacion: 'estandar', caracteristicas: null, notas: 'Renovación', inserted_at: now, updated_at: now },
];

// ── Huéspedes ──

export const MOCK_HUESPEDES: readonly Huesped[] = [
  { id: 'hue-001', nombre: 'Juan', apellido: 'Pérez García', email: 'juan@email.com', telefono: '+52 555 1234567', documento: 'INE-12345', nacionalidad: 'México', inserted_at: now },
  { id: 'hue-002', nombre: 'María', apellido: 'López Hernández', email: 'maria@email.com', telefono: '+52 555 2345678', documento: 'PAS-MX-001', nacionalidad: 'México', inserted_at: now },
  { id: 'hue-003', nombre: 'John', apellido: 'Smith', email: 'john@email.com', telefono: '+1 555 3456789', documento: 'PAS-US-002', nacionalidad: 'Estados Unidos', inserted_at: now },
  { id: 'hue-004', nombre: 'Ana', apellido: 'Martínez Ruiz', email: 'ana@email.com', telefono: '+52 555 4567890', documento: 'INE-67890', nacionalidad: 'México', inserted_at: now },
  { id: 'hue-005', nombre: 'Pierre', apellido: 'Dubois', email: 'pierre@email.com', telefono: '+33 6 12345678', documento: 'PAS-FR-003', nacionalidad: 'Francia', inserted_at: now },
  { id: 'hue-006', nombre: 'Sakura', apellido: 'Tanaka', email: 'sakura@email.com', telefono: '+81 90 12345678', documento: 'PAS-JP-004', nacionalidad: 'Japón', inserted_at: now },
];

// ── Reservas ──

const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;
const hoy = new Date().toISOString().split('T')[0]!;
const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
const pasado = new Date(Date.now() + 172800000).toISOString().split('T')[0]!;
const enTresDias = new Date(Date.now() + 259200000).toISOString().split('T')[0]!;

export const MOCK_RESERVAS: readonly Reserva[] = [
  { id: 'res-001', huesped_id: 'hue-001', habitacion_id: 'hab-102', fecha_entrada: ayer!, fecha_salida: manana!, estado: 'checked_in', total: '170.00', notas: null, huesped: MOCK_HUESPEDES[0], habitacion: MOCK_HABITACIONES[1], inserted_at: now },
  { id: 'res-002', huesped_id: 'hue-002', habitacion_id: 'hab-103', fecha_entrada: hoy!, fecha_salida: pasado!, estado: 'confirmada', total: '240.00', notas: 'Llegada tarde', huesped: MOCK_HUESPEDES[1], habitacion: MOCK_HABITACIONES[2], inserted_at: now },
  { id: 'res-003', huesped_id: 'hue-003', habitacion_id: 'hab-202', fecha_entrada: ayer!, fecha_salida: enTresDias!, estado: 'checked_in', total: '880.00', notas: 'VIP treatment', huesped: MOCK_HUESPEDES[2], habitacion: MOCK_HABITACIONES[5], inserted_at: now },
  { id: 'res-004', huesped_id: 'hue-005', habitacion_id: 'hab-302', fecha_entrada: ayer!, fecha_salida: pasado!, estado: 'checked_in', total: '1350.00', notas: 'Penthouse — VIP', huesped: MOCK_HUESPEDES[4], habitacion: MOCK_HABITACIONES[9], inserted_at: now },
  { id: 'res-005', huesped_id: 'hue-006', habitacion_id: 'hab-303', fecha_entrada: manana!, fecha_salida: enTresDias!, estado: 'confirmada', total: '720.00', notas: null, huesped: MOCK_HUESPEDES[5], habitacion: MOCK_HABITACIONES[10], inserted_at: now },
  { id: 'res-006', huesped_id: 'hue-004', habitacion_id: 'hab-201', fecha_entrada: hoy!, fecha_salida: manana!, estado: 'cancelada', total: '130.00', notas: 'Cancelado por cliente', huesped: MOCK_HUESPEDES[3], habitacion: MOCK_HABITACIONES[4], inserted_at: now },
];

// ── Productos ──

export const MOCK_PRODUCTOS: readonly Producto[] = [
  { id: 'prod-001', nombre: 'Agua mineral', categoria: 'minibar', precio: '3.50', stock: 120, descripcion: 'Agua mineral 500ml', activo: true, inserted_at: now },
  { id: 'prod-002', nombre: 'Coca-Cola', categoria: 'minibar', precio: '4.00', stock: 80, descripcion: 'Coca-Cola 355ml', activo: true, inserted_at: now },
  { id: 'prod-003', nombre: 'Cerveza artesanal', categoria: 'minibar', precio: '8.50', stock: 45, descripcion: 'Cerveza local IPA', activo: true, inserted_at: now },
  { id: 'prod-004', nombre: 'Vino tinto', categoria: 'minibar', precio: '25.00', stock: 20, descripcion: 'Vino tinto reserva', activo: true, inserted_at: now },
  { id: 'prod-005', nombre: 'Club Sandwich', categoria: 'room_service', precio: '15.00', stock: 50, descripcion: 'Sandwich club con papas', activo: true, inserted_at: now },
  { id: 'prod-006', nombre: 'Hamburguesa premium', categoria: 'room_service', precio: '18.00', stock: 30, descripcion: 'Hamburguesa angus 200g', activo: true, inserted_at: now },
  { id: 'prod-007', nombre: 'Ensalada César', categoria: 'room_service', precio: '12.00', stock: 40, descripcion: 'Ensalada César con pollo', activo: true, inserted_at: now },
  { id: 'prod-008', nombre: 'Masaje relajante', categoria: 'spa', precio: '80.00', stock: 10, descripcion: 'Masaje 60 minutos', activo: true, inserted_at: now },
  { id: 'prod-009', nombre: 'Facial premium', categoria: 'spa', precio: '65.00', stock: 8, descripcion: 'Tratamiento facial 45 min', activo: true, inserted_at: now },
  { id: 'prod-010', nombre: 'Lavado express', categoria: 'lavanderia', precio: '12.00', stock: 100, descripcion: 'Lavado mismo día', activo: true, inserted_at: now },
  { id: 'prod-011', nombre: 'Tour ciudad', categoria: 'tour', precio: '45.00', stock: 15, descripcion: 'Tour guiado 3 horas', activo: true, inserted_at: now },
  { id: 'prod-012', nombre: 'Estacionamiento/día', categoria: 'estacionamiento', precio: '15.00', stock: 30, descripcion: 'Estacionamiento cubierto', activo: true, inserted_at: now },
];

// ── Tareas de limpieza ──

export const MOCK_TAREAS: readonly TareaLimpieza[] = [
  { id: 'tar-001', habitacion_id: 'hab-104', empleado_id: 'usr-004', estado: 'en_proceso', prioridad: 3, notas: 'Limpieza profunda', iniciada_at: new Date(Date.now() - 1800000).toISOString(), completada_at: null, habitacion: MOCK_HABITACIONES[3], inserted_at: now },
  { id: 'tar-002', habitacion_id: 'hab-101', empleado_id: 'usr-004', estado: 'pendiente', prioridad: 2, notas: null, iniciada_at: null, completada_at: null, habitacion: MOCK_HABITACIONES[0], inserted_at: now },
  { id: 'tar-003', habitacion_id: 'hab-201', empleado_id: 'usr-004', estado: 'pendiente', prioridad: 1, notas: 'Cambio de sábanas', iniciada_at: null, completada_at: null, habitacion: MOCK_HABITACIONES[4], inserted_at: now },
  { id: 'tar-004', habitacion_id: 'hab-203', empleado_id: null, estado: 'pendiente', prioridad: 1, notas: null, iniciada_at: null, completada_at: null, habitacion: MOCK_HABITACIONES[6], inserted_at: now },
  { id: 'tar-005', habitacion_id: 'hab-301', empleado_id: 'usr-004', estado: 'completada', prioridad: 2, notas: null, iniciada_at: new Date(Date.now() - 7200000).toISOString(), completada_at: new Date(Date.now() - 3600000).toISOString(), habitacion: MOCK_HABITACIONES[8], inserted_at: now },
];

// ── Métricas dashboard ──

export const MOCK_METRICAS: MetricasDashboard = {
  total_habitaciones: 12,
  disponibles: 4,
  ocupadas: 3,
  en_limpieza: 1,
  en_mantenimiento: 1,
  reservadas: 2,
  porcentaje_ocupacion: 58.3,
  ingresos_hoy: '3420.00',
  checkins_hoy: 2,
  checkouts_hoy: 1,
  promedio_limpieza_min: 35,
};

// ── Eventos dominio (Event Sourcing) ──

export const MOCK_EVENTOS: readonly EventoDominio[] = [
  { tipo: 'reserva_creada', datos: { huesped: 'Sakura Tanaka', habitacion: '303' }, timestamp: new Date(Date.now() - 300000).toISOString(), origen: 'sistema' },
  { tipo: 'checkin_realizado', datos: { huesped: 'Pierre Dubois', habitacion: '302' }, timestamp: new Date(Date.now() - 1200000).toISOString(), origen: 'recepcion' },
  { tipo: 'tarea_iniciada', datos: { habitacion: '104', empleado: 'Ana Limpieza' }, timestamp: new Date(Date.now() - 1800000).toISOString(), origen: 'limpieza' },
  { tipo: 'venta_registrada', datos: { producto: 'Masaje relajante', monto: '$80.00' }, timestamp: new Date(Date.now() - 3600000).toISOString(), origen: 'spa' },
  { tipo: 'tarea_completada', datos: { habitacion: '301', duracion: '45 min' }, timestamp: new Date(Date.now() - 5400000).toISOString(), origen: 'limpieza' },
  { tipo: 'checkout_realizado', datos: { huesped: 'Ana Martínez', habitacion: '201' }, timestamp: new Date(Date.now() - 7200000).toISOString(), origen: 'recepcion' },
  { tipo: 'reserva_cancelada', datos: { huesped: 'Ana Martínez', motivo: 'Cancelado por cliente' }, timestamp: new Date(Date.now() - 9000000).toISOString(), origen: 'sistema' },
  { tipo: 'habitacion_bloqueada', datos: { habitacion: '304', motivo: 'Renovación' }, timestamp: new Date(Date.now() - 14400000).toISOString(), origen: 'mantenimiento' },
];

// ── Historial para gráficas ──

export function generarHistorialMock() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.now() - (11 - i) * 300000);
    return {
      timestamp: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      ocupacion: 45 + Math.round(Math.random() * 25),
      disponibles: 3 + Math.round(Math.random() * 3),
      ingresos: 2800 + Math.round(Math.random() * 1200),
    };
  });
}
