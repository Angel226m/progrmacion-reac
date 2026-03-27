import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { personal, horarios, exportar, type Empleado, type Turno, type Horario } from '../services/admin.api';

// ═══════════════════════════════════════════════════════════
// PersonalPage — Gestión de empleados, turnos y horarios
// Solo admin/gerente
// ═══════════════════════════════════════════════════════════

const ROLES = ['admin', 'gerente', 'recepcionista', 'limpieza', 'mantenimiento'] as const;
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COLOR_ROL: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  gerente: 'bg-purple-100 text-purple-800',
  recepcionista: 'bg-blue-100 text-blue-800',
  limpieza: 'bg-green-100 text-green-800',
  mantenimiento: 'bg-yellow-100 text-yellow-800',
};
const ESTADO_ASISTENCIA: Record<string, { color: string; label: string }> = {
  programado: { color: 'bg-gray-100 text-gray-700', label: 'Programado' },
  asistio: { color: 'bg-green-100 text-green-700', label: 'Asistió' },
  falta: { color: 'bg-red-100 text-red-700', label: 'Falta' },
  permiso: { color: 'bg-yellow-100 text-yellow-700', label: 'Permiso' },
};

export default function PersonalPage() {
  const { token } = useAuth();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [horariosSemana, setHorariosSemana] = useState<Horario[]>([]);
  const [tab, setTab] = useState<'personal' | 'horarios'>('personal');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [empleadoEditar, setEmpleadoEditar] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pRes, tRes, hRes] = await Promise.all([
        personal.listar(token, filtroRol ? { rol: filtroRol } : undefined),
        horarios.listarTurnos(token),
        horarios.semanaActual(token),
      ]);
      setEmpleados(pRes.data);
      setTurnos(tRes.data);
      setHorariosSemana(hRes.data);
    } catch {
      // Modo offline — usar datos vacíos
    } finally {
      setLoading(false);
    }
  }, [token, filtroRol]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const eliminarEmpleado = async (id: string) => {
    if (!token || !confirm('¿Eliminar este empleado?')) return;
    try {
      await personal.eliminar(id, token);
      setMensaje({ tipo: 'ok', texto: 'Empleado eliminado correctamente' });
      cargarDatos();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: String(err) });
    }
  };

  const actualizarAsistencia = async (horarioId: string, estado: string) => {
    if (!token) return;
    try {
      await horarios.actualizarAsistencia(horarioId, estado, token);
      cargarDatos();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: String(err) });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
            <p className="text-sm text-gray-500 mt-1">Empleados, turnos y horarios del hotel</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportar.personal(token!)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={() => { setEmpleadoEditar(null); setShowModal(true); }}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['personal', 'horarios'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'personal' ? '👥 Personal' : '📅 Horarios'}
            </button>
          ))}
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
          mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {mensaje.texto}
          <button onClick={() => setMensaje(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="p-6">
        {tab === 'personal' ? (
          <PersonalTab
            empleados={empleados}
            filtroRol={filtroRol}
            setFiltroRol={setFiltroRol}
            onEditar={(e) => { setEmpleadoEditar(e); setShowModal(true); }}
            onEliminar={eliminarEmpleado}
            loading={loading}
          />
        ) : (
          <HorariosTab
            horarios={horariosSemana}
            turnos={turnos}
            empleados={empleados}
            onActualizarAsistencia={actualizarAsistencia}
            loading={loading}
          />
        )}
      </div>

      {/* Modal nuevo/editar empleado */}
      {showModal && (
        <EmpleadoModal
          empleado={empleadoEditar}
          token={token!}
          onClose={() => setShowModal(false)}
          onGuardado={() => { setShowModal(false); cargarDatos(); setMensaje({ tipo: 'ok', texto: 'Empleado guardado' }); }}
        />
      )}
    </div>
  );
}

// ── Tab Personal ──

function PersonalTab({ empleados, filtroRol, setFiltroRol, onEditar, onEliminar, loading }: {
  empleados: Empleado[];
  filtroRol: string;
  setFiltroRol: (r: string) => void;
  onEditar: (e: Empleado) => void;
  onEliminar: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div>
      {/* Filtro por rol */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFiltroRol('')}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
            !filtroRol ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setFiltroRol(r)}
            className={`px-3 py-1.5 text-xs rounded-full capitalize transition-colors ${
              filtroRol === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando personal...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {e.nombre.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${COLOR_ROL[e.rol] || 'bg-gray-100'}`}>
                      {e.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 rounded-full inline-block mr-2 ${e.activo ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm">{e.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onEditar(e)} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => onEliminar(e.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin empleados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab Horarios ──

function HorariosTab({ horarios: horariosData, turnos, onActualizarAsistencia, loading }: {
  horarios: Horario[];
  turnos: Turno[];
  empleados: Empleado[];
  onActualizarAsistencia: (id: string, estado: string) => void;
  loading: boolean;
}) {
  // Agrupar horarios por empleado
  const porEmpleado = horariosData.reduce((acc, h) => {
    const nombre = h.empleado?.nombre || 'Sin asignar';
    if (!acc[nombre]) acc[nombre] = [];
    acc[nombre].push(h);
    return acc;
  }, {} as Record<string, Horario[]>);

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando horarios...</div>;

  return (
    <div>
      {/* Leyenda de turnos */}
      <div className="flex gap-4 mb-4">
        {turnos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-indigo-400" />
            <span className="text-gray-600">{t.nombre}: {t.hora_inicio} - {t.hora_fin}</span>
          </div>
        ))}
      </div>

      {/* Grilla semanal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Empleado</th>
              {DIAS_SEMANA.map((d) => (
                <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(porEmpleado).map(([nombre, hs]) => (
              <tr key={nombre} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{nombre}</td>
                {DIAS_SEMANA.map((_, i) => {
                  const h = hs.find((x) => x.dia_semana === i + 1);
                  if (!h) return <td key={i} className="px-3 py-3 text-center text-gray-300">—</td>;
                  const est = ESTADO_ASISTENCIA[h.estado] ?? ESTADO_ASISTENCIA['programado']!;
                  return (
                    <td key={i} className="px-3 py-3 text-center">
                      <select
                        value={h.estado}
                        onChange={(e) => onActualizarAsistencia(h.id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded-lg border-0 cursor-pointer ${est.color}`}
                      >
                        <option value="programado">Programado</option>
                        <option value="asistio">Asistió</option>
                        <option value="falta">Falta</option>
                        <option value="permiso">Permiso</option>
                      </select>
                      {h.turno && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{h.turno.nombre}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {Object.keys(porEmpleado).length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sin horarios esta semana</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Modal Empleado ──

function EmpleadoModal({ empleado, token, onClose, onGuardado }: {
  empleado: Empleado | null;
  token: string;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    nombre: empleado?.nombre || '',
    email: empleado?.email || '',
    password: '',
    rol: empleado?.rol || 'recepcionista',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setSaving(true);
    setError('');
    try {
      if (empleado) {
        const data: Record<string, unknown> = { nombre: form.nombre, email: form.email, rol: form.rol };
        if (form.password) data.password = form.password;
        await personal.actualizar(empleado.id, data, token);
      } else {
        await personal.crear({ ...form }, token);
      }
      onGuardado();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h2>

        {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="password"
            placeholder={empleado ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña (min. 8 chars, 1 mayúsc., 1 núm.)'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving || !form.nombre || !form.email || (!empleado && !form.password)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
