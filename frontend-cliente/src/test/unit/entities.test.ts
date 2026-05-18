// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Entidades del Dominio (Unit)
// Validaciones puras sin renderizado ni side-effects
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type {
  Habitacion,
  Reserva,
  Producto,
  Usuario,
  RolUsuario,
  EstadoHabitacion,
  TipoHabitacion,
  EstadoReserva,
  CategoriaProducto,
} from '../../domain/types';

describe('Unit / Entidades del Dominio', () => {
  // ── Habitación ──
  describe('Habitacion', () => {
    const estados: EstadoHabitacion[] = ['disponible', 'reservada', 'ocupada', 'en_limpieza', 'en_mantenimiento', 'bloqueada'];
    const tipos: TipoHabitacion[] = ['simple', 'doble', 'suite', 'presidencial'];

    it('acepta los 6 estados válidos', () => {
      expect(estados).toHaveLength(6);
      estados.forEach((e) => expect(typeof e).toBe('string'));
    });

    it('acepta los 4 tipos válidos', () => {
      expect(tipos).toHaveLength(4);
      tipos.forEach((t) => expect(typeof t).toBe('string'));
    });

    it('construye una habitación completa', () => {
      const hab: Habitacion = {
        id: 'h1',
        numero: '101',
        tipo: 'suite',
        piso: 1,
        capacidad: 2,
        estado: 'disponible',
        precio_noche: '250.00',
        amenidades: ['wifi', 'minibar'],
        notas: null,
        clasificacion: 'premium',
        caracteristicas: { jacuzzi: true, vista: 'mar' },
        inserted_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      expect(hab.numero).toBe('101');
      expect(hab.amenidades).toContain('wifi');
      expect(hab.clasificacion).toBe('premium');
    });

    it('permite clasificacion y caracteristicas nulas', () => {
      const hab: Habitacion = {
        id: 'h2', numero: '102', tipo: 'simple', piso: 1,
        capacidad: 1, estado: 'disponible', precio_noche: '80.00', amenidades: [],
        notas: null, clasificacion: null, caracteristicas: null,
        inserted_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      };
      expect(hab.clasificacion).toBeNull();
      expect(hab.caracteristicas).toBeNull();
    });
  });

  // ── Reserva ──
  describe('Reserva', () => {
    const estados: EstadoReserva[] = ['confirmada', 'checked_in', 'checked_out', 'cancelada'];

    it('tiene 4 estados', () => {
      expect(estados).toHaveLength(4);
    });

    it('construye una reserva válida', () => {
      const r: Reserva = {
        id: 'r1',
        huesped_id: 'hu1',
        habitacion_id: 'h1',
        fecha_entrada: '2025-07-15',
        fecha_salida: '2025-07-18',
        estado: 'confirmada',
        total: '750.00',
        notas: 'Late check-in',
        inserted_at: '2025-01-01T00:00:00Z',
      };
      expect(r.estado).toBe('confirmada');
      expect(r.notas).toBeTruthy();
    });
  });

  // ── Usuario ──
  describe('Usuario', () => {
    const roles: RolUsuario[] = ['admin', 'recepcionista', 'limpieza', 'mantenimiento'];

    it('tiene exactamente 4 roles', () => {
      expect(roles).toHaveLength(4);
    });

    it('construye un usuario válido', () => {
      const u: Usuario = {
        id: 'u1',
        email: 'admin@hotelflux.com',
        nombre: 'Admin Principal',
        rol: 'admin',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      };
      expect(u.activo).toBe(true);
      expect(u.inserted_at).toBeTruthy();
    });
  });

  // ── Producto ──
  describe('Producto', () => {
    const categorias: CategoriaProducto[] = ['minibar', 'room_service', 'spa', 'lavanderia', 'tour', 'estacionamiento'];

    it('tiene 6 categorías', () => {
      expect(categorias).toHaveLength(6);
    });

    it('precio en formato decimal string', () => {
      const p: Producto = {
        id: 'p1',
        nombre: 'Cerveza Artesanal',
        descripcion: 'IPA local',
        precio: '8.50',
        categoria: 'minibar',
        stock: 50,
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      };
      expect(parseFloat(p.precio)).toBeGreaterThan(0);
      expect(p.stock).toBeGreaterThanOrEqual(0);
      expect(p.inserted_at).toBeTruthy();
    });
  });
});
