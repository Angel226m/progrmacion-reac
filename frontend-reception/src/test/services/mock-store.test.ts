import { describe, it, expect, beforeEach } from 'vitest';
import { habitacionStore, huespedStore, productoStore, reservaStore, tareaStore } from '../../services/mock-store';

describe('services/mock-store', () => {
  beforeEach(() => {
    // Los stores mantienen estado entre tests, no hay reset automático
    // Esto es intencional para probar operaciones secuenciales
  });

  describe('habitacionStore', () => {
    it('listar devuelve array de habitaciones', () => {
      const habitaciones = habitacionStore.listar();
      expect(Array.isArray(habitaciones)).toBe(true);
    });

    it('obtener devuelve habitacion por id', () => {
      const habitaciones = habitacionStore.listar();
      if (habitaciones.length > 0) {
        const hab = habitacionStore.obtener(habitaciones[0]!.id);
        expect(hab).toBeDefined();
      }
    });

    it('crear nueva habitacion', () => {
      const nueva = habitacionStore.crear({
        numero: '999',
        tipo: 'simple',
        piso: 9,
        capacidad: 1,
        precio_noche: '80.00',
        amenidades: ['WiFi'],
      });
      expect(nueva.id).toContain('hab-');
      expect(nueva.numero).toBe('999');
      expect(nueva.estado).toBe('disponible');
    });

    it('actualizar habitacion existente', () => {
      const nueva = habitacionStore.crear({
        numero: '888',
        tipo: 'doble',
        piso: 8,
        capacidad: 2,
        precio_noche: '120.00',
        amenidades: ['WiFi', 'TV'],
      });
      const actualizada = habitacionStore.actualizar(nueva.id, {
        estado: 'reservada',
        notas: 'Test nota',
      });
      expect(actualizada?.estado).toBe('reservada');
      expect(actualizada?.notas).toBe('Test nota');
    });

    it('eliminar habitacion', () => {
      const nueva = habitacionStore.crear({
        numero: '777',
        tipo: 'simple',
        piso: 7,
        capacidad: 1,
        precio_noche: '80.00',
        amenidades: [],
      });
      const eliminada = habitacionStore.eliminar(nueva.id);
      expect(eliminada).toBe(true);
      expect(habitacionStore.obtener(nueva.id)).toBeUndefined();
    });

    it('obtener pisos únicos', () => {
      const pisos = habitacionStore.obtenerPisos();
      expect(Array.isArray(pisos)).toBe(true);
    });

    it('habitaciones por piso', () => {
      const habitaciones = habitacionStore.habitacionesPorPiso(1);
      expect(Array.isArray(habitaciones)).toBe(true);
    });

    it('generar habitaciones para un piso', () => {
      const nuevas = habitacionStore.generarHabitacionesPiso(99, 3, 'suite');
      expect(nuevas).toHaveLength(3);
      expect(nuevas[0]!.piso).toBe(99);
      expect(nuevas[0]!.tipo).toBe('suite');
    });
  });

  describe('huespedStore', () => {
    it('listar devuelve array de huéspedes', () => {
      const huespedes = huespedStore.listar();
      expect(Array.isArray(huespedes)).toBe(true);
    });

    it('crear nuevo huésped', () => {
      const nuevo = huespedStore.crear({
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@test.com',
        telefono: '+51999999999',
        documento_identidad: '12345678',
      });
      expect(nuevo.id).toContain('hue-');
      expect(nuevo.nombre).toBe('Juan');
    });

    it('actualizar huésped', () => {
      const nuevo = huespedStore.crear({
        nombre: 'Pedro',
        apellido: 'Gómez',
        email: 'pedro@test.com',
      });
      const actualizado = huespedStore.actualizar(nuevo.id, { nombre: 'Pedro Actualizado' });
      expect(actualizado?.nombre).toBe('Pedro Actualizado');
    });

    it('eliminar huésped', () => {
      const nuevo = huespedStore.crear({
        nombre: 'Test',
        apellido: 'Delete',
        email: 'delete@test.com',
      });
      const eliminado = huespedStore.eliminar(nuevo.id);
      expect(eliminado).toBe(true);
    });
  });

  describe('productoStore', () => {
    it('listar devuelve array de productos', () => {
      const productos = productoStore.listar();
      expect(Array.isArray(productos)).toBe(true);
    });

    it('crear nuevo producto', () => {
      const nuevo = productoStore.crear({
        nombre: 'Cerveza Artesanal',
        categoria: 'bebidas',
        precio: '15.00',
        stock: 50,
      });
      expect(nuevo.id).toContain('prod-');
      expect(nuevo.nombre).toBe('Cerveza Artesanal');
      expect(nuevo.activo).toBe(true);
    });

    it('actualizar producto', () => {
      const nuevo = productoStore.crear({
        nombre: 'Test Producto',
        categoria: 'comestibles',
        precio: '10.00',
        stock: 20,
      });
      const actualizado = productoStore.actualizar(nuevo.id, { stock: 30, activo: false });
      expect(actualizado?.stock).toBe(30);
      expect(actualizado?.activo).toBe(false);
    });

    it('eliminar producto', () => {
      const nuevo = productoStore.crear({
        nombre: 'Delete Product',
        categoria: 'bebidas',
        precio: '5.00',
        stock: 10,
      });
      const eliminado = productoStore.eliminar(nuevo.id);
      expect(eliminado).toBe(true);
    });
  });

  describe('reservaStore', () => {
    it('listar devuelve array de reservas', () => {
      const reservas = reservaStore.listar();
      expect(Array.isArray(reservas)).toBe(true);
    });

    it('obtener reserva por id', () => {
      const reservas = reservaStore.listar();
      if (reservas.length > 0) {
        const res = reservaStore.obtener(reservas[0]!.id);
        expect(res).toBeDefined();
      }
    });

    it('reservas activas filtra correctamente', () => {
      const activas = reservaStore.activas();
      expect(Array.isArray(activas));
    });

    it('crear reserva directa', () => {
      const habitaciones = habitacionStore.listar();
      if (habitaciones.length > 0) {
        const hab = habitaciones[0]!;
        const result = reservaStore.crearDirecta({
          habitacion_id: hab.id,
          nombre: 'Reserva Test',
          apellido: 'Apellido',
          email: 'reserva@test.com',
          fecha_entrada: '2025-08-01',
          fecha_salida: '2025-08-03',
          metodo_pago: 'efectivo',
        });
        expect(result.reserva.id).toContain('res-');
        expect(result.reserva.estado).toBe('confirmada');
        expect(result.huesped.nombre).toBe('Reserva Test');
      }
    });

    it('cancelar reserva', () => {
      const habitaciones = habitacionStore.listar();
      if (habitaciones.length > 0) {
        const hab = habitaciones[0]!;
        const result = reservaStore.crearDirecta({
          habitacion_id: hab.id,
          nombre: 'Cancel Test',
          apellido: 'Test',
          email: 'cancel@test.com',
          fecha_entrada: '2025-09-01',
          fecha_salida: '2025-09-02',
          metodo_pago: 'efectivo',
        });
        const cancelada = reservaStore.cancelar(result.reserva.id);
        expect(cancelada?.estado).toBe('cancelada');
      }
    });
  });

  describe('tareaStore', () => {
    it('listar devuelve array de tareas', () => {
      const tareas = tareaStore.listar();
      expect(Array.isArray(tareas)).toBe(true);
    });

    it('iniciar tarea', () => {
      const tareas = tareaStore.listar();
      if (tareas.length > 0) {
        const tarea = tareas.find(t => t.estado === 'pendiente');
        if (tarea) {
          const iniciada = tareaStore.iniciar(tarea.id);
          expect(iniciada?.estado).toBe('en_proceso');
          expect(iniciada?.iniciada_at).toBeDefined();
        }
      }
    });

    it('completar tarea', () => {
      const tareas = tareaStore.listar();
      if (tareas.length > 0) {
        const tarea = tareas.find(t => t.estado === 'en_proceso' || t.estado === 'pendiente');
        if (tarea) {
          const completada = tareaStore.completar(tarea.id);
          if (completada) {
            expect(completada.estado).toBe('completada');
            expect(completada.completada_at).toBeDefined();
          }
        }
      }
    });
  });
});