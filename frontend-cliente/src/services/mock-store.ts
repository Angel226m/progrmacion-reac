// ═══════════════════════════════════════════════════════════
// HotelFlux — Mock Store (almacén mutable para CRUD en demo)
// Envuelve los datos mock en un store con operaciones CRUD
// Patrón: Store funcional con mutación controlada
// ═══════════════════════════════════════════════════════════

import type {
  Habitacion,
  Huesped,
  Reserva,
  Producto,
  TareaLimpieza,
  TipoHabitacion,
  EstadoHabitacion,
  CategoriaProducto,
  MetodoPago,
} from '../domain/types';
import {
  MOCK_HABITACIONES,
  MOCK_HUESPEDES,
  MOCK_RESERVAS,
  MOCK_PRODUCTOS,
  MOCK_TAREAS,
} from './mock-data';

// ── Store mutable (copias de los arrays inmutables) ──

let habitaciones: Habitacion[] = [...MOCK_HABITACIONES];
let huespedes: Huesped[] = [...MOCK_HUESPEDES];
let reservas: Reserva[] = [...MOCK_RESERVAS];
let productos: Producto[] = [...MOCK_PRODUCTOS];
let tareas: TareaLimpieza[] = [...MOCK_TAREAS];

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ═══════════════════════════════════════════════════════════
// HABITACIONES CRUD
// ═══════════════════════════════════════════════════════════

export interface CrearHabitacionDTO {
  numero: string;
  tipo: TipoHabitacion;
  piso: number;
  capacidad: number;
  precio_noche: string;
  amenidades: string[];
  notas?: string | null;
}

export interface ActualizarHabitacionDTO extends Partial<CrearHabitacionDTO> {
  estado?: EstadoHabitacion;
}

export const habitacionStore = {
  listar: (): Habitacion[] => [...habitaciones],

  obtener: (id: string): Habitacion | undefined =>
    habitaciones.find((h) => h.id === id),

  crear: (dto: CrearHabitacionDTO): Habitacion => {
    const nueva: Habitacion = {
      id: uid('hab'),
      numero: dto.numero,
      tipo: dto.tipo,
      piso: dto.piso,
      capacidad: dto.capacidad,
      precio_noche: dto.precio_noche,
      estado: 'disponible',
      amenidades: [...dto.amenidades],
      clasificacion: null,
      caracteristicas: null,
      notas: dto.notas ?? null,
      inserted_at: now(),
      updated_at: now(),
    };
    habitaciones = [...habitaciones, nueva];
    return nueva;
  },

  actualizar: (id: string, dto: ActualizarHabitacionDTO): Habitacion | null => {
    const actual = habitaciones.find((h) => h.id === id);
    return !actual
      ? null
      : (() => {
          const actualizada: Habitacion = {
            ...actual,
            ...(dto.numero !== undefined && { numero: dto.numero }),
            ...(dto.tipo !== undefined && { tipo: dto.tipo }),
            ...(dto.piso !== undefined && { piso: dto.piso }),
            ...(dto.capacidad !== undefined && { capacidad: dto.capacidad }),
            ...(dto.precio_noche !== undefined && { precio_noche: dto.precio_noche }),
            ...(dto.estado !== undefined && { estado: dto.estado }),
            ...(dto.amenidades !== undefined && { amenidades: [...dto.amenidades] }),
            ...(dto.notas !== undefined && { notas: dto.notas }),
            updated_at: now(),
          };
          habitaciones = habitaciones.map((h) => h.id === id ? actualizada : h);
          return actualizada;
        })();
  },

  eliminar: (id: string): boolean => {
    const len = habitaciones.length;
    habitaciones = habitaciones.filter((h) => h.id !== id);
    return habitaciones.length < len;
  },

  // Configuración de pisos
  obtenerPisos: (): number[] => {
    return [...new Set(habitaciones.map((h) => h.piso))].sort((a, b) => a - b);
  },

  habitacionesPorPiso: (piso: number): Habitacion[] => {
    return habitaciones.filter((h) => h.piso === piso);
  },

  // Generar habitaciones para un piso
  generarHabitacionesPiso: (piso: number, cantidad: number, tipo: TipoHabitacion = 'simple'): Habitacion[] => {
    const existentes = habitaciones.filter((h) => h.piso === piso);
    const inicio = existentes.length + 1;
    let nuevas: Habitacion[] = [];
    const precioBase: Record<TipoHabitacion, string> = {
      simple: '85.00',
      doble: '120.00',
      suite: '250.00',
      presidencial: '450.00',
    };
    const capacidadBase: Record<TipoHabitacion, number> = {
      simple: 1,
      doble: 2,
      suite: 3,
      presidencial: 4,
    };

    for (let i = 0; i < cantidad; i++) {
      const num = `${piso}${String(inicio + i).padStart(2, '0')}`;
      const nueva: Habitacion = {
        id: uid('hab'),
        numero: num,
        tipo,
        piso,
        capacidad: capacidadBase[tipo],
        precio_noche: precioBase[tipo],
        estado: 'disponible',
        amenidades: ['WiFi', 'TV', 'Aire Acondicionado'],
        clasificacion: null,
        caracteristicas: null,
        notas: null,
        inserted_at: now(),
        updated_at: now(),
      };
      nuevas = [...nuevas, nueva];
    }

    habitaciones = [...habitaciones, ...nuevas];
    return nuevas;
  },
} as const;

// ═══════════════════════════════════════════════════════════
// HUÉSPEDES CRUD
// ═══════════════════════════════════════════════════════════

export interface CrearHuespedDTO {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  documento?: string | null;
  nacionalidad?: string | null;
}

export const huespedStore = {
  listar: (): Huesped[] => [...huespedes],

  obtener: (id: string): Huesped | undefined =>
    huespedes.find((h) => h.id === id),

  crear: (dto: CrearHuespedDTO): Huesped => {
    const nuevo: Huesped = {
      id: uid('hue'),
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      telefono: dto.telefono ?? null,
      documento: dto.documento ?? null,
      nacionalidad: dto.nacionalidad ?? null,
      inserted_at: now(),
    };
    huespedes = [...huespedes, nuevo];
    return nuevo;
  },

  actualizar: (id: string, dto: Partial<CrearHuespedDTO>): Huesped | null => {
    const actual = huespedes.find((h) => h.id === id);
    return !actual
      ? null
      : (() => {
          const actualizado: Huesped = {
            ...actual,
            ...(dto.nombre !== undefined && { nombre: dto.nombre }),
            ...(dto.apellido !== undefined && { apellido: dto.apellido }),
            ...(dto.email !== undefined && { email: dto.email }),
            ...(dto.telefono !== undefined && { telefono: dto.telefono }),
            ...(dto.documento !== undefined && { documento: dto.documento }),
            ...(dto.nacionalidad !== undefined && { nacionalidad: dto.nacionalidad }),
          };
          huespedes = huespedes.map((h) => h.id === id ? actualizado : h);
          return actualizado;
        })();
  },

  eliminar: (id: string): boolean => {
    const len = huespedes.length;
    huespedes = huespedes.filter((h) => h.id !== id);
    return huespedes.length < len;
  },
} as const;

// ═══════════════════════════════════════════════════════════
// PRODUCTOS CRUD
// ═══════════════════════════════════════════════════════════

export interface CrearProductoDTO {
  nombre: string;
  categoria: CategoriaProducto;
  precio: string;
  stock: number;
  descripcion?: string | null;
}

export const productoStore = {
  listar: (): Producto[] => [...productos],

  obtener: (id: string): Producto | undefined =>
    productos.find((p) => p.id === id),

  crear: (dto: CrearProductoDTO): Producto => {
    const nuevo: Producto = {
      id: uid('prod'),
      nombre: dto.nombre,
      categoria: dto.categoria,
      precio: dto.precio,
      stock: dto.stock,
      descripcion: dto.descripcion ?? null,
      disponible: true,
      inserted_at: now(),
    };
    productos = [...productos, nuevo];
    return nuevo;
  },

  actualizar: (id: string, dto: Partial<CrearProductoDTO> & { disponible?: boolean }): Producto | null => {
    const actual = productos.find((p) => p.id === id);
    return !actual
      ? null
      : (() => {
          const actualizado: Producto = {
            ...actual,
            ...(dto.nombre !== undefined && { nombre: dto.nombre }),
            ...(dto.categoria !== undefined && { categoria: dto.categoria }),
            ...(dto.precio !== undefined && { precio: dto.precio }),
            ...(dto.stock !== undefined && { stock: dto.stock }),
            ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
            ...(dto.disponible !== undefined && { disponible: dto.disponible }),
          };
          productos = productos.map((p) => p.id === id ? actualizado : p);
          return actualizado;
        })();
  },

  eliminar: (id: string): boolean => {
    const len = productos.length;
    productos = productos.filter((p) => p.id !== id);
    return productos.length < len;
  },
} as const;

// ═══════════════════════════════════════════════════════════
// RESERVAS CRUD (+ crear desde recepción)
// ═══════════════════════════════════════════════════════════

export interface CrearReservaDirectaDTO {
  // Datos del huésped (nuevo o existente)
  huesped_id?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  documento?: string;
  nacionalidad?: string;
  // Datos de la reserva
  habitacion_id: string;
  fecha_entrada: string;
  fecha_salida: string;
  metodo_pago: MetodoPago;
  notas?: string;
}

export const reservaStore = {
  listar: (): Reserva[] => [...reservas],

  obtener: (id: string): Reserva | undefined =>
    reservas.find((r) => r.id === id),

  activas: (): Reserva[] =>
    reservas.filter((r) => r.estado === 'confirmada' || r.estado === 'checked_in'),

  // Crear reserva directa desde recepción (crea huésped si no existe)
  crearDirecta: (dto: CrearReservaDirectaDTO): { reserva: Reserva; huesped: Huesped } => {
    const huesped: Huesped = dto.huesped_id
      ? huespedes.find((h) => h.id === dto.huesped_id) ?? (() => { throw new Error('Huésped no encontrado'); })()
      : huespedStore.crear({
          nombre: dto.nombre ?? '',
          apellido: dto.apellido ?? '',
          email: dto.email ?? '',
          telefono: dto.telefono,
          documento: dto.documento,
          nacionalidad: dto.nacionalidad,
        });

    const habitacion = habitaciones.find((h) => h.id === dto.habitacion_id)
      ?? (() => { throw new Error('Habitación no encontrada'); })();

    // Calcular total
    const dias = Math.max(1, Math.ceil(
      (new Date(dto.fecha_salida).getTime() - new Date(dto.fecha_entrada).getTime()) / 86400000,
    ));
    const total = (parseFloat(habitacion.precio_noche) * dias).toFixed(2);

    const reserva: Reserva = {
      id: uid('res'),
      huesped_id: huesped.id,
      habitacion_id: dto.habitacion_id,
      fecha_entrada: dto.fecha_entrada,
      fecha_salida: dto.fecha_salida,
      estado: 'confirmada',
      total,
      notas: dto.notas ?? null,
      huesped,
      habitacion,
      inserted_at: now(),
    };

    reservas = [...reservas, reserva];

    // Cambiar estado de la habitación a reservada
    habitacionStore.actualizar(dto.habitacion_id, { estado: 'reservada' });

    return { reserva, huesped };
  },

  cancelar: (id: string): Reserva | null => {
    const actual = reservas.find((r) => r.id === id);
    return !actual
      ? null
      : (() => {
          const cancelada: Reserva = { ...actual, estado: 'cancelada' };
          reservas = reservas.map((r) => r.id === id ? cancelada : r);
          habitacionStore.actualizar(actual.habitacion_id, { estado: 'disponible' });
          return cancelada;
        })();
  },

  checkin: (id: string): Reserva | null => {
    const actual = reservas.find((r) => r.id === id);
    return !actual
      ? null
      : (() => {
          const checkedin: Reserva = { ...actual, estado: 'checked_in' };
          reservas = reservas.map((r) => r.id === id ? checkedin : r);
          habitacionStore.actualizar(actual.habitacion_id, { estado: 'ocupada' });
          return checkedin;
        })();
  },

  checkout: (id: string): Reserva | null => {
    const actual = reservas.find((r) => r.id === id);
    return !actual
      ? null
      : (() => {
          const checkedout: Reserva = { ...actual, estado: 'checked_out' };
          reservas = reservas.map((r) => r.id === id ? checkedout : r);
          habitacionStore.actualizar(actual.habitacion_id, { estado: 'en_limpieza' });
          return checkedout;
        })();
  },
} as const;

// ═══════════════════════════════════════════════════════════
// TAREAS CRUD
// ═══════════════════════════════════════════════════════════

export const tareaStore = {
  listar: (): TareaLimpieza[] => [...tareas],

  iniciar: (id: string): TareaLimpieza | null => {
    const actual = tareas.find((t) => t.id === id);
    return !actual
      ? null
      : (() => {
          const iniciada: TareaLimpieza = { ...actual, estado: 'en_proceso', iniciada_at: now() };
          tareas = tareas.map((t) => t.id === id ? iniciada : t);
          return iniciada;
        })();
  },

  completar: (id: string): TareaLimpieza | null => {
    const actual = tareas.find((t) => t.id === id);
    return !actual
      ? null
      : (() => {
          const completada: TareaLimpieza = { ...actual, estado: 'completada', completada_at: now() };
          tareas = tareas.map((t) => t.id === id ? completada : t);
          actual.habitacion_id && habitacionStore.actualizar(actual.habitacion_id, { estado: 'disponible' });
          return completada;
        })();
  },
} as const;
