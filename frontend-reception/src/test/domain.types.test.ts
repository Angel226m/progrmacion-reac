// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests del Dominio (tipos y validaciones puras)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type {
  Habitacion,
  Reserva,
  Producto,
  Usuario,
  RolUsuario,
  EstadoHabitacion,
  EstadoReserva,
  TipoHabitacion,
  CategoriaProducto,
} from '../domain/types';

describe('Tipos del Dominio — Validaciones', () => {
  describe('Habitacion', () => {
    it('debe aceptar todos los estados válidos', () => {
      const estados: EstadoHabitacion[] = [
        'disponible', 'reservada', 'ocupada', 'en_limpieza', 'en_mantenimiento', 'bloqueada',
      ];
      expect(estados).toHaveLength(6);
      estados.forEach((e) => expect(typeof e).toBe('string'));
    });

    it('debe aceptar todos los tipos de habitación', () => {
      const tipos: TipoHabitacion[] = ['simple', 'doble', 'suite', 'presidencial'];
      expect(tipos).toHaveLength(4);
    });

    it('debe crear una habitación válida con campos readonly', () => {
      const hab: Habitacion = {
        id: 'uuid-1',
        numero: '101',
        tipo: 'doble',
        piso: 1,
        capacidad: 2,
        precio_noche: '150.00',
        estado: 'disponible',
        amenidades: ['wifi', 'tv'],
        clasificacion: null,
        caracteristicas: null,
        notas: null,
        inserted_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(hab.numero).toBe('101');
      expect(hab.amenidades).toEqual(['wifi', 'tv']);
      expect(hab.notas).toBeNull();
    });
  });

  describe('Reserva', () => {
    it('debe aceptar todos los estados válidos', () => {
      const estados: EstadoReserva[] = ['confirmada', 'checked_in', 'checked_out', 'cancelada'];
      expect(estados).toHaveLength(4);
    });

    it('puede incluir huesped y habitacion como relaciones opcionales', () => {
      const reserva: Reserva = {
        id: 'uuid-2',
        huesped_id: 'h-1',
        habitacion_id: 'hab-1',
        fecha_entrada: '2025-06-01',
        fecha_salida: '2025-06-05',
        estado: 'confirmada',
        total: '600.00',
        notas: null,
        inserted_at: '2025-01-01T00:00:00Z',
      };

      expect(reserva.huesped).toBeUndefined();
      expect(reserva.habitacion).toBeUndefined();
    });
  });

  describe('Roles de Usuario', () => {
    it('debe tener exactamente 4 roles', () => {
      const roles: RolUsuario[] = ['admin', 'recepcionista', 'limpieza', 'mantenimiento'];
      expect(roles).toHaveLength(4);
    });

    it('cada rol debe ser un string no vacío', () => {
      const roles: RolUsuario[] = ['admin', 'recepcionista', 'limpieza', 'mantenimiento'];
      roles.forEach((r) => {
        expect(r.length).toBeGreaterThan(0);
        expect(typeof r).toBe('string');
      });
    });
  });

  describe('Categorías de Producto', () => {
    it('debe tener exactamente 6 categorías', () => {
      const cats: CategoriaProducto[] = [
        'minibar', 'room_service', 'spa', 'lavanderia', 'tour', 'estacionamiento',
      ];
      expect(cats).toHaveLength(6);
    });
  });

  describe('Usuario', () => {
    it('debe crear usuario con campos requeridos', () => {
      const user: Usuario = {
        id: 'u-1',
        nombre: 'Admin',
        email: 'admin@hotelflux.com',
        rol: 'admin',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      };

      expect(user.rol).toBe('admin');
      expect(user.email).toContain('@');
    });
  });

  describe('Producto', () => {
    it('precio debe ser string decimal', () => {
      const prod: Producto = {
        id: 'p-1',
        nombre: 'Cerveza',
        categoria: 'minibar',
        precio: '5.50',
        stock: 20,
        descripcion: null,
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      };

      expect(prod.precio).toMatch(/^\d+\.\d{2}$/);
      expect(prod.stock).toBeGreaterThanOrEqual(0);
    });
  });
});
