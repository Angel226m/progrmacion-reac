import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { personal, horarios, exportar, type Empleado, type Turno, type Horario } from '../services/admin.api';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconClose,
  IconCheck,
  IconSave,
  IconPersonal,
} from '../components/shared/Icons';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// PersonalPage — Gestión de empleados, turnos y horarios
// Solo admin/gerente
// ═══════════════════════════════════════════════════════════

const ROLES = ['admin', 'gerente', 'recepcionista', 'limpieza', 'mantenimiento'] as const;
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const ROL_CONFIG: Record<string, { badge: string; dot: string }> = {
  admin:         { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',         dot: 'bg-red-500' },
  gerente:       { badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500' },
  recepcionista: { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       dot: 'bg-blue-500' },
  limpieza:      { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  mantenimiento: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',    dot: 'bg-amber-500' },
};

const ESTADO_ASISTENCIA: Record<string, { color: string; label: string }> = {
  programado: { color: 'bg-slate-100 text-slate-700',    label: 'Programado' },
  asistio:    { color: 'bg-emerald-50 text-emerald-700', label: 'Asistió' },
  falta:      { color: 'bg-red-50 text-red-700',         label: 'Falta' },
  permiso:    { color: 'bg-amber-50 text-amber-700',     label: 'Permiso' },
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ─── HERO HEADER ─── */}
      <div className="bg-gradient-to-br from-[#0c1d3d] to-[#1a3a6e] pb-16 pt-8 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c5a255]/20 ring-1 ring-[#c5a255]/40">
                <IconPersonal size={22} className="text-[#c5a255]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white sm:text-2xl">Gestión de Personal</h1>
                <p className="text-sm text-slate-400">Empleados, turnos y horarios del hotel</p>
              </div>
            </div>

            {/* Stats rápidas */}
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center backdrop-blur-sm">
                <p className="text-xl font-extrabold text-[#c5a255]">{empleados.length}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Empleados</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center backdrop-blur-sm">
                <p className="text-xl font-extrabold text-emerald-400">{empleados.filter((e) => e.activo).length}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Activos</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center backdrop-blur-sm">
                <p className="text-xl font-extrabold text-blue-300">{turnos.length}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Turnos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="mx-auto max-w-6xl -mt-8 px-4 pb-16 sm:px-6">
        {/* Barra de controles */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-3 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
          {/* Tabs */}
          <div className="flex gap-1">
            {(['personal', 'horarios'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  tab === t
                    ? 'bg-[#0c1d3d] text-[#c5a255] shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                )}
              >
                {t === 'personal' ? '👥 Personal' : '📅 Horarios'}
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => exportar.personal(token!)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span>📥</span> Exportar CSV
            </button>
            <button
              onClick={() => { setEmpleadoEditar(null); setShowModal(true); }}
              className="flex items-center gap-1.5 rounded-xl bg-[#c5a255] px-4 py-2 text-xs font-bold text-[#0c1d3d] shadow-sm transition-all hover:bg-[#d4b568]"
            >
              <IconPlus size={14} /> Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div className={clsx(
            'mb-4 flex items-center justify-between gap-2 rounded-xl p-3 text-sm font-medium',
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200',
          )}>
            <span className="flex items-center gap-2">
              {mensaje.tipo === 'ok' ? <IconCheck size={16} /> : '⚠'}
              {mensaje.texto}
            </span>
            <button onClick={() => setMensaje(null)} className="rounded-full p-0.5 hover:bg-black/10">
              <IconClose size={14} />
            </button>
          </div>
        )}

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
  const [busqueda, setBusqueda] = useState('');

  const filtrados = empleados.filter((e) => {
    const pasaRol = !filtroRol || e.rol === filtroRol;
    const pasaBusqueda = !busqueda ||
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.email.toLowerCase().includes(busqueda.toLowerCase());
    return pasaRol && pasaBusqueda;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroRol('')}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              !filtroRol ? 'bg-[#0c1d3d] text-[#c5a255]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            Todos ({empleados.length})
          </button>
          {ROLES.map((r) => {
            const cfg = ROL_CONFIG[r];
            const count = empleados.filter((e) => e.rol === r).length;
            return (
              <button
                key={r}
                onClick={() => setFiltroRol(r)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all',
                  filtroRol === r ? 'bg-[#0c1d3d] text-[#c5a255]' : `${cfg?.badge ?? 'bg-slate-100 text-slate-600'} hover:opacity-80`,
                )}
              >
                {r} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-56">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-[#0c1d3d] focus:outline-none focus:ring-1 focus:ring-[#0c1d3d]"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Empleado</th>
                <th className="hidden px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Email</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((e) => {
                const rolCfg = ROL_CONFIG[e.rol];
                const iniciales = e.nombre.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
                return (
                  <tr key={e.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0c1d3d]/5 text-sm font-bold text-[#0c1d3d]">
                          {iniciales}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{e.nombre}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-sm text-slate-500 sm:table-cell">{e.email}</td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                        rolCfg?.badge ?? 'bg-slate-100 text-slate-600',
                      )}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', rolCfg?.dot ?? 'bg-slate-400')} />
                        {e.rol}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        e.activo
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
                      )}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', e.activo ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onEditar(e)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-[#0c1d3d] hover:bg-[#0c1d3d] hover:text-white"
                        >
                          <IconEdit size={12} /> Editar
                        </button>
                        <button
                          onClick={() => onEliminar(e.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        >
                          <IconTrash size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-slate-400">
                      {empleados.length === 0 ? 'No hay empleados registrados' : 'Sin resultados para este filtro'}
                    </p>
                  </td>
                </tr>
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
  const porEmpleado = useMemo(
    () =>
      horariosData.reduce<Record<string, Horario[]>>((acc, h) => {
        const nombre = h.empleado?.nombre || 'Sin asignar';
        const existentes = acc[nombre] ?? [];
        return { ...acc, [nombre]: [...existentes, h] };
      }, {}),
    [horariosData],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Leyenda de turnos */}
      {turnos.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Turnos:</span>
          {turnos.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0c1d3d]" />
              <span className="font-medium">{t.nombre}</span>
              <span className="text-slate-400">{t.hora_inicio}–{t.hora_fin}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grilla semanal */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Empleado</th>
              {DIAS_SEMANA.map((d) => (
                <th key={d} className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.entries(porEmpleado).map(([nombre, hs]) => (
              <tr key={nombre} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{nombre}</td>
                {DIAS_SEMANA.map((_, i) => {
                  const h = hs.find((x) => x.dia_semana === i + 1);
                  if (!h) return (
                    <td key={i} className="px-3 py-3.5 text-center text-slate-200 text-xs">—</td>
                  );
                  const est = ESTADO_ASISTENCIA[h.estado] ?? ESTADO_ASISTENCIA['programado']!;
                  return (
                    <td key={i} className="px-3 py-3.5 text-center">
                      <select
                        value={h.estado}
                        onChange={(e) => onActualizarAsistencia(h.id, e.target.value)}
                        className={clsx(
                          'rounded-lg border-0 px-2 py-1 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-[#0c1d3d]',
                          est.color,
                        )}
                      >
                        <option value="programado">Programado</option>
                        <option value="asistio">Asistió</option>
                        <option value="falta">Falta</option>
                        <option value="permiso">Permiso</option>
                      </select>
                      {h.turno && (
                        <p className="mt-0.5 text-[10px] text-slate-400">{h.turno.nombre}</p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {Object.keys(porEmpleado).length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  Sin horarios registrados esta semana
                </td>
              </tr>
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

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0c1d3d] focus:outline-none focus:ring-1 focus:ring-[#0c1d3d]';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              {empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {empleado ? `Modificando datos de ${empleado.nombre}` : 'Completa los datos del nuevo miembro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
            ⚠ {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Nombre completo</label>
            <input
              type="text"
              placeholder="Ej: María García"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Correo electrónico</label>
            <input
              type="email"
              placeholder="correo@hotel.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {empleado ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <input
              type="password"
              placeholder={empleado ? 'Dejar vacío para mantener actual' : 'Mín. 8 caracteres, 1 mayúsc., 1 núm.'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Rol</label>
            <select
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving || !form.nombre || !form.email || (!empleado && !form.password)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0c1d3d] py-2.5 text-sm font-bold text-[#c5a255] transition-all hover:bg-[#1a3a6e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5a255]/30 border-t-[#c5a255]" />
                Guardando...
              </span>
            ) : (
              <><IconSave size={14} /> {empleado ? 'Guardar cambios' : 'Crear empleado'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
