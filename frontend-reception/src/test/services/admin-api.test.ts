import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { pisos, personal, horarios, dashboard } from '../../services/admin.api';

describe('services/admin-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pisos', () => {
    const token = 'test-token';

    it('listar pisos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'p1', numero: 1, nombre: 'Piso 1', descripcion: null, activo: true }] }),
      });

      const result = await pisos.listar(token);
      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/pisos'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${token}` }) }),
      );
    });

    it('crear piso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, piso: { id: 'p1', numero: 2, nombre: 'Piso 2', descripcion: 'Nuevo', activo: true } }),
      });

      const result = await pisos.crear({ numero: 2, nombre: 'Piso 2' }, token);
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/pisos'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('actualizar piso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, piso: { id: 'p1', numero: 1, nombre: 'Piso Actualizado' } }),
      });

      const result = await pisos.actualizar('p1', { nombre: 'Piso Actualizado' }, token);
      expect(result.ok).toBe(true);
    });

    it('eliminar piso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await pisos.eliminar('p1', token);
      expect(result.ok).toBe(true);
    });
  });

  describe('personal', () => {
    const token = 'test-token';

    it('listar personal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'u1', nombre: 'Carlos', email: 'carlos@test.com', rol: 'recepcionista', activo: true }] }),
      });

      const result = await personal.listar(token);
      expect(result.data).toHaveLength(1);
    });

    it('listar personal con filtros', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await personal.listar(token, { rol: 'admin', activo: 'true' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('rol=admin'),
        expect.any(Object),
      );
    });

    it('crear empleado', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, usuario: { id: 'u1', nombre: 'Nuevo', email: 'nuevo@test.com', rol: 'recepcionista', activo: true } }),
      });

      const result = await personal.crear({ nombre: 'Nuevo', email: 'nuevo@test.com', rol: 'recepcionista' }, token);
      expect(result.ok).toBe(true);
    });

    it('conteo personal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { admin: 2, recepcionista: 5, limpieza: 3 } }),
      });

      const result = await personal.conteo(token);
      expect(result.data.admin).toBe(2);
    });
  });

  describe('horarios', () => {
    const token = 'test-token';

    it('listar turnos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 't1', nombre: 'Mañana', hora_inicio: '08:00', hora_fin: '16:00', activo: true }] }),
      });

      const result = await horarios.listarTurnos(token);
      expect(result.data).toHaveLength(1);
    });

    it('asignar horario', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, horario: { id: 'h1', fecha: '2025-08-01', dia_semana: 5, estado: 'programado', notas: null, empleado: null, turno: null } }),
      });

      const result = await horarios.asignar({ empleado_id: 'u1', turno_id: 't1', fecha: '2025-08-01' }, token);
      expect(result.ok).toBe(true);
    });

    it('generar semana de horarios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, total_creados: 5, horarios: [] }),
      });

      const result = await horarios.generarSemana({ empleado_id: 'u1', turno_id: 't1', fecha_inicio: '2025-08-01', dias: [1, 2, 3, 4, 5] }, token);
      expect(result.ok).toBe(true);
      expect(result.total_creados).toBe(5);
    });

    it('obtener semana actual', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'h1', fecha: '2025-08-01' }] }),
      });

      const result = await horarios.semanaActual(token);
      expect(result.data).toHaveLength(1);
    });

    it('actualizar asistencia', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, horario: { id: 'h1', estado: 'asistio' } }),
      });

      const result = await horarios.actualizarAsistencia('h1', 'asistio', token);
      expect(result.ok).toBe(true);
    });
  });

  describe('dashboard', () => {
    const token = 'test-token';

    it('obtener metricas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            ocupacion: { porcentaje: 75, total: 20, ocupadas: 15, disponibles: 5 },
            ingresos: { ingresos_reservas: '30000', ingresos_consumos: '5000', total: '35000' },
            reservas: { total: 10, confirmadas: 5, canceladas: 1, checked_in: 3 },
            limpieza: { promedio_minutos: 30, completadas: 8, pendientes: 2 },
            productos_populares: [],
          },
          fuente: 'cache',
        }),
      });

      const result = await dashboard.metricas(token, 'mes');
      expect(result.data.ocupacion.porcentaje).toBe(75);
      expect(result.fuente).toBe('cache');
    });

    it('obtener reservas por periodo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ fecha: '2025-08-01', total: 5 }] }),
      });

      const result = await dashboard.reservas(token, 'semana');
      expect(result.data).toHaveLength(1);
    });

    it('obtener ingresos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { diario: [], resumen: { total: '50000' } } }),
      });

      const result = await dashboard.ingresos(token, 'mes');
      expect(result.data.resumen.total).toBe('50000');
    });

    it('obtener productos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { top_productos: [], por_categoria: [] } }),
      });

      const result = await dashboard.productos(token, 'trimestre');
      expect(result.data).toBeDefined();
    });
  });
});