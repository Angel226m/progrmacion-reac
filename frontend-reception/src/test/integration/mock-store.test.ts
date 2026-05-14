import { describe, it, expect } from 'vitest';
import {
  habitacionStore,
  huespedStore,
  productoStore,
  reservaStore,
  tareaStore,
} from '../../services/mock-store';
import type { TipoHabitacion, EstadoHabitacion } from '../../domain/types';

describe('Integration / Mock Store', () => {
  describe('habitacionStore', () => {

    it('listar retorna array de habitaciones', () => {
      const habitaciones = habitacionStore.listar();
      expect(Array.isArray(habitaciones)).toBe(true);
      expect(habitaciones.length).toBeGreaterThan(0);
    });

    it('obtener retorna habitación por id', () => {
      const habitaciones = habitacionStore.listar();
      const primera = habitaciones[0];
      expect(primera).toBeDefined();
      const encontrada = habitacionStore.obtener(primera!.id);
      expect(encontrada).toBeDefined();
      expect(encontrada!.id).toBe(primera!.id);
    });

    it('obtener retorna undefined para id inexistente', () => {
      const result = habitacionStore.obtener('inexistente');
      expect(result).toBeUndefined();
    });

    it('crear agrega nueva habitación', () => {
      const countBefore = habitacionStore.listar().length;
      const nueva = habitacionStore.crear({
        numero: 'TEST-001',
        tipo: 'simple' as TipoHabitacion,
        piso: 99,
        capacidad: 1,
        precio_noche: '50.00',
        amenidades: ['wifi'],
      });
      const countAfter = habitacionStore.listar().length;
      expect(nueva.id).toBeTruthy();
      expect(nueva.numero).toBe('TEST-001');
      expect(nueva.estado).toBe('disponible');
      expect(countAfter).toBe(countBefore + 1);
    });

    it('actualizar modifica habitación existente', () => {
      const habitaciones = habitacionStore.listar();
      const hab = habitaciones[0]!;
      const actualizada = habitacionStore.actualizar(hab.id, {
        estado: 'en_mantenimiento' as EstadoHabitacion,
        notas: 'Test nota',
      });
      expect(actualizada).toBeDefined();
      expect(actualizada!.estado).toBe('en_mantenimiento');
      expect(actualizada!.notas).toBe('Test nota');
    });

    it('actualizar retorna null para id inexistente', () => {
      const result = habitacionStore.actualizar('inexistente', { estado: 'disponible' });
      expect(result).toBeNull();
    });

    it('eliminar remove habitación', () => {
      const countBefore = habitacionStore.listar().length;
      const nueva = habitacionStore.crear({
        numero: 'TEST-DEL',
        tipo: 'simple' as TipoHabitacion,
        piso: 1,
        capacidad: 1,
        precio_noche: '50.00',
        amenidades: [],
      });
      const deleted = habitacionStore.eliminar(nueva.id);
      const countAfter = habitacionStore.listar().length;
      expect(deleted).toBe(true);
      expect(countAfter).toBe(countBefore);
    });

    it('obtenerPisos retorna pisos únicos', () => {
      const pisos = habitacionStore.obtenerPisos();
      expect(Array.isArray(pisos)).toBe(true);
      expect(pisos.length).toBeGreaterThan(0);
    });

    it('habitacionesPorPiso filtra correctamente', () => {
      const habitaciones = habitacionStore.listar();
      if (habitaciones.length > 0) {
        const piso = habitaciones[0]!.piso;
        const dePiso = habitacionStore.habitacionesPorPiso(piso);
        expect(dePiso.every(h => h.piso === piso)).toBe(true);
      }
    });

    it('generarHabitacionesPiso crea múltiples habitaciones', () => {
      const nuevas = habitacionStore.generarHabitacionesPiso(99, 5, 'simple');
      expect(nuevas).toHaveLength(5);
      expect(nuevas.every(h => h.piso === 99)).toBe(true);
      expect(nuevas.every(h => h.tipo === 'simple')).toBe(true);
      expect(nuevas.every(h => h.estado === 'disponible')).toBe(true);
    });
  });

  describe('huespedStore', () => {
    it('listar retorna array de huéspedes', () => {
      const huespedes = huespedStore.listar();
      expect(Array.isArray(huespedes)).toBe(true);
    });

    it('crear agrega nuevo huésped', () => {
      const countBefore = huespedStore.listar().length;
      const nuevo = huespedStore.crear({
        nombre: 'Test',
        apellido: 'Usuario',
        email: 'test@hotel.com',
        telefono: '123456789',
        documento_identidad: '12345678',
      });
      const countAfter = huespedStore.listar().length;
      expect(nuevo.id).toBeTruthy();
      expect(nuevo.nombre).toBe('Test');
      expect(countAfter).toBe(countBefore + 1);
    });

    it('actualizar modifica huésped existente', () => {
      const huespedes = huespedStore.listar();
      const huesped = huespedes[0]!;
      const actualizado = huespedStore.actualizar(huesped.id, {
        telefono: '999999999',
      });
      expect(actualizado).toBeDefined();
      expect(actualizado!.telefono).toBe('999999999');
    });

    it('eliminar remove huésped', () => {
      const countBefore = huespedStore.listar().length;
      const nuevo = huespedStore.crear({
        nombre: 'Delete',
        apellido: 'Test',
        email: 'delete@test.com',
      });
      const deleted = huespedStore.eliminar(nuevo.id);
      const countAfter = huespedStore.listar().length;
      expect(deleted).toBe(true);
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('productoStore', () => {
    it('listar retorna array de productos', () => {
      const productos = productoStore.listar();
      expect(Array.isArray(productos)).toBe(true);
    });

    it('crear agrega nuevo producto', () => {
      const countBefore = productoStore.listar().length;
      const nuevo = productoStore.crear({
        nombre: 'Test Producto',
        categoria: 'minibar',
        precio: '10.00',
        stock: 100,
        descripcion: 'Producto de test',
      });
      const countAfter = productoStore.listar().length;
      expect(nuevo.id).toBeTruthy();
      expect(nuevo.activo).toBe(true);
      expect(countAfter).toBe(countBefore + 1);
    });

    it('actualizar modifica producto existente', () => {
      const productos = productoStore.listar();
      const producto = productos[0]!;
      const actualizado = productoStore.actualizar(producto.id, {
        stock: 999,
        activo: false,
      });
      expect(actualizado).toBeDefined();
      expect(actualizado!.stock).toBe(999);
      expect(actualizado!.activo).toBe(false);
    });

    it('eliminar remove producto', () => {
      const countBefore = productoStore.listar().length;
      const nuevo = productoStore.crear({
        nombre: 'Delete Prod',
        categoria: 'minibar',
        precio: '5.00',
        stock: 10,
      });
      const deleted = productoStore.eliminar(nuevo.id);
      const countAfter = productoStore.listar().length;
      expect(deleted).toBe(true);
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('reservaStore', () => {
    it('listar retorna array de reservas', () => {
      const reservas = reservaStore.listar();
      expect(Array.isArray(reservas)).toBe(true);
    });

    it('activas filtra reservas activas', () => {
      const activas = reservaStore.activas();
      expect(Array.isArray(activas));
      const estadosValidos = ['confirmada', 'checked_in'];
      expect(activas.every(r => estadosValidos.includes(r.estado))).toBe(true);
    });

    it('crearDirecta crea reserva y huésped', () => {
      const habitaciones = habitacionStore.listar();
      const habitacion = habitaciones.find(h => h.estado === 'disponible')!;
      const countBefore = reservaStore.listar().length;

      const { reserva, huesped } = reservaStore.crearDirecta({
        habitacion_id: habitacion.id,
        nombre: 'Huésped',
        apellido: 'Test',
        email: 'huesped@test.com',
        telefono: '123456789',
        fecha_entrada: '2025-06-01',
        fecha_salida: '2025-06-03',
        metodo_pago: 'efectivo',
      });

      const countAfter = reservaStore.listar().length;
      expect(reserva.id).toBeTruthy();
      expect(reserva.estado).toBe('confirmada');
      expect(huesped.nombre).toBe('Huésped');
      expect(countAfter).toBe(countBefore + 1);
    });

    it('crearDirecta con huésped existente', () => {
      const habitaciones = habitacionStore.listar();
      const habitacion = habitaciones.find(h => h.estado === 'disponible')!;
      const huespedes = huespedStore.listar();
      const huesped = huespedes[0]!;

      const { reserva } = reservaStore.crearDirecta({
        habitacion_id: habitacion.id,
        huesped_id: huesped.id,
        fecha_entrada: '2025-07-01',
        fecha_salida: '2025-07-02',
        metodo_pago: 'tarjeta',
      });

      expect(reserva.huesped_id).toBe(huesped.id);
    });

    it('cancelar cambia estado de reserva', () => {
      const reservas = reservaStore.listar();
      const reserva = reservas.find(r => r.estado === 'confirmada')!;

      const cancelada = reservaStore.cancelar(reserva.id);
      expect(cancelada).toBeDefined();
      expect(cancelada!.estado).toBe('cancelada');
    });

    it('checkin cambia estado de reserva y habitación', () => {
      const reservas = reservaStore.listar();
      const reserva = reservas.find(r => r.estado === 'confirmada')!;

      const checkinada = reservaStore.checkin(reserva.id);
      expect(checkinada).toBeDefined();
      expect(checkinada!.estado).toBe('checked_in');

      const habitacion = habitacionStore.obtener(reserva.habitacion_id);
      expect(habitacion!.estado).toBe('ocupada');
    });

    it('checkout cambia estado de reserva y habitación a limpieza', () => {
      const reservas = reservaStore.listar();
      const reserva = reservas.find(r => r.estado === 'checked_in')!;

      const salida = reservaStore.checkout(reserva.id);
      expect(salida).toBeDefined();
      expect(salida!.estado).toBe('checked_out');

      const habitacion = habitacionStore.obtener(reserva.habitacion_id);
      expect(habitacion!.estado).toBe('en_limpieza');
    });
  });

  describe('tareaStore', () => {
    it('listar retorna array de tareas', () => {
      const tareas = tareaStore.listar();
      expect(Array.isArray(tareas)).toBe(true);
    });

    it('iniciar cambia estado a en_progreso', () => {
      const tareas = tareaStore.listar();
      const tarea = tareas.find(t => t.estado === 'pendiente')!;

      const iniciada = tareaStore.iniciar(tarea.id);
      expect(iniciada).toBeDefined();
      expect(iniciada!.estado).toBe('en_proceso');
      expect(iniciada!.iniciada_at).toBeTruthy();
    });

    it('completar cambia estado a completada y libera habitación', () => {
      const tareas = tareaStore.listar();
      const tarea = tareas.find(t => t.estado === 'en_proceso')!;
      const habitacionId = tarea.habitacion_id;

      const completada = tareaStore.completar(tarea.id);
      expect(completada).toBeDefined();
      expect(completada!.estado).toBe('completada');
      expect(completada!.completada_at).toBeTruthy();

      if (habitacionId) {
        const habitacion = habitacionStore.obtener(habitacionId);
        expect(habitacion!.estado).toBe('disponible');
      }
    });

    it('iniciar retorna null para tarea inexistente', () => {
      const result = tareaStore.iniciar('inexistente');
      expect(result).toBeNull();
    });

    it('completar retorna null para tarea inexistente', () => {
      const result = tareaStore.completar('inexistente');
      expect(result).toBeNull();
    });
  });
});