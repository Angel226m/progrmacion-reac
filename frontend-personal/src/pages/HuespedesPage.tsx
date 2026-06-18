// ═══════════════════════════════════════════════════════════
// HotelFlux — HuespedesPage (CRUD completo de huéspedes)
// Rol: admin, recepcionista
// Admin/recepcionista: crear, editar, eliminar
// Responsive: skeleton loader + cards (móvil) / tabla (≥sm)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { queries, comandos } from '../services/api';
import type { Huesped } from '../domain/types';
import {
  IconHuespedes,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconClose,
  IconSave,
  IconUser,
  IconMail,
  IconPhone,
  IconDocument,
  IconGlobe,
  IconWarning,
} from '../components/shared/Icons';
import clsx from 'clsx';
import Pagination from '../components/shared/Pagination';
import { fromPromise } from '../domain/result';

const POR_PAGINA = 10;

interface HuespedFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  nacionalidad: string;
}

const emptyForm: HuespedFormData = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  documento: '',
  nacionalidad: '',
};

// ── Skeleton loader (reemplaza al spinner: líneas que anticipan el contenido) ──

function HuespedesSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:block">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3.5">
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-40" />
                <div className="skeleton h-3 w-28" />
              </div>
              <div className="skeleton hidden h-3 w-32 sm:block" />
              <div className="skeleton hidden h-3 w-24 md:block" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 sm:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-32" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HuespedesPage() {
  const { token, usuario } = useAuth();
  const [huespedes, setHuespedes] = useState<readonly Huesped[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HuespedFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = usuario?.rol === 'admin' || usuario?.rol === 'recepcionista';

  const cargarHuespedes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const result = await fromPromise(
      queries.listarHuespedes(token),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
    if (result.ok) {
      setHuespedes(result.value.huespedes);
    } else {
      console.error('Error cargando huéspedes:', result.error);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { cargarHuespedes(); }, [cargarHuespedes]);

  // Filtrado
  const huespedesFiltrados = huespedes.filter((h) => {
    const t = busqueda.toLowerCase();
    return (
      (h.nombre ?? '').toLowerCase().includes(t) ||
      (h.apellido ?? '').toLowerCase().includes(t) ||
      (h.email ?? '').toLowerCase().includes(t) ||
      (h.documento?.toLowerCase().includes(t) ?? false)
    );
  });

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => { setPagina(1); }, [busqueda]);

  // Paginación sobre el resultado filtrado
  const totalPaginas = Math.max(1, Math.ceil(huespedesFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const huespedesPagina = huespedesFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
    setMessage(null);
  };

  const openEdit = (h: Huesped) => {
    setEditingId(h.id);
    setForm({
      nombre: h.nombre,
      apellido: h.apellido,
      email: h.email,
      telefono: h.telefono ?? '',
      documento: h.documento ?? '',
      nacionalidad: h.nacionalidad ?? '',
    });
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    const huespedData = {
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      telefono: form.telefono || null,
      documento: form.documento || null,
      nacionalidad: form.nacionalidad || null,
    };
    const result = await fromPromise(
      editingId
        ? comandos.actualizarHuesped(editingId, huespedData, token)
        : comandos.crearHuesped(huespedData, token),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
    if (result.ok) {
      setMessage({ type: 'success', text: editingId ? 'Huésped actualizado exitosamente' : 'Huésped creado exitosamente' });
      setShowModal(false);
      cargarHuespedes();
    } else {
      setMessage({ type: 'error', text: result.error.message });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    const result = await fromPromise(
      comandos.eliminarHuesped(deleteId, token),
      (e) => e instanceof Error ? e : new Error(String(e)),
    );
    if (result.ok) {
      setMessage({ type: 'success', text: 'Huésped eliminado' });
      setDeleteId(null);
      cargarHuespedes();
    } else {
      setMessage({ type: 'error', text: result.error.message });
    }
  };

  const updateField = (key: keyof HuespedFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header — apilado en móvil, horizontal en ≥sm */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 sm:h-12 sm:w-12">
            <IconHuespedes size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-slate-800 sm:text-2xl">Huéspedes</h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Directorio de huéspedes — {huespedes.length} registrados
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl active:scale-[0.98] sm:w-auto"
          >
            <IconPlus size={16} />
            <span>Nuevo Huésped</span>
          </button>
        )}
      </div>

      {/* Message */}
      {message && !showModal && (
        <div className={clsx(
          'mb-4 animate-fade-in rounded-lg px-4 py-3 text-sm ring-1',
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200',
        )}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 sm:px-4">
        <IconSearch size={18} className="flex-shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* Content: skeleton / vacío / tabla (≥sm) + cards (<sm) */}
      {loading ? (
        <HuespedesSkeleton />
      ) : huespedesFiltrados.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-slate-200 sm:py-16">
          <IconHuespedes size={48} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {busqueda ? 'Sin resultados para la búsqueda' : 'No hay huéspedes registrados'}
          </p>
          {canEdit && !busqueda && (
            <button onClick={openCreate} className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-700">
              + Agregar primer huésped
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Tabla: solo en ≥sm ── */}
          <div className="hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3.5 font-semibold text-slate-600">Nombre</th>
                    <th className="px-4 py-3.5 font-semibold text-slate-600">Email</th>
                    <th className="hidden px-4 py-3.5 font-semibold text-slate-600 md:table-cell">Teléfono</th>
                    <th className="hidden px-4 py-3.5 font-semibold text-slate-600 md:table-cell">Documento</th>
                    <th className="hidden px-4 py-3.5 font-semibold text-slate-600 lg:table-cell">País</th>
                    {canEdit && <th className="px-4 py-3.5 text-right font-semibold text-slate-600">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {huespedesPagina.map((h, idx) => (
                    <tr
                      key={h.id}
                      style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
                      className="group animate-fade-in-up transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-violet-600">
                            {h.nombre.charAt(0)}{h.apellido.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">{h.nombre} {h.apellido}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="line-clamp-1">{h.email}</span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">{h.telefono ?? '—'}</td>
                      <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">{h.documento ?? '—'}</td>
                      <td className="hidden px-4 py-3.5 text-slate-600 lg:table-cell">{h.nacionalidad ?? '—'}</td>
                      {canEdit && (
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEdit(h)}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Editar"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(h.id)}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Eliminar"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {huespedesFiltrados.length > POR_PAGINA && (
              <Pagination
                pagina={paginaActual}
                setPagina={setPagina}
                total={huespedesFiltrados.length}
                porPagina={POR_PAGINA}
                color="violet"
                itemLabel="huésped"
              />
            )}
          </div>

          {/* ── Cards: solo en móvil (<sm) ── */}
          <div className="space-y-3 sm:hidden">
            {huespedesPagina.map((h, idx) => (
              <div
                key={h.id}
                style={{ animationDelay: `${Math.min(idx * 30, 360)}ms` }}
                className="animate-fade-in-up rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-sm font-bold text-white">
                    {h.nombre.charAt(0)}{h.apellido.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{h.nombre} {h.apellido}</p>
                    <p className="truncate text-xs text-slate-500">{h.email}</p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(h)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(h.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                  {h.telefono && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <IconPhone size={12} className="text-slate-400" />
                      <span className="truncate">{h.telefono}</span>
                    </div>
                  )}
                  {h.documento && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <IconDocument size={12} className="text-slate-400" />
                      <span className="truncate">{h.documento}</span>
                    </div>
                  )}
                  {h.nacionalidad && (
                    <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                      <IconGlobe size={12} className="text-slate-400" />
                      <span className="truncate">{h.nacionalidad}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {huespedesFiltrados.length > POR_PAGINA && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <Pagination
                  pagina={paginaActual}
                  setPagina={setPagina}
                  total={huespedesFiltrados.length}
                  porPagina={POR_PAGINA}
                  color="violet"
                  itemLabel="huésped"
                  compacta
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="animate-scale-in w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold text-slate-800 sm:text-lg">
                {editingId ? 'Editar Huésped' : 'Nuevo Huésped'}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5 sm:max-h-[75vh] sm:px-6">
              {message && showModal && (
                <div className={clsx(
                  'rounded-lg px-4 py-3 text-sm ring-1',
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200',
                )}>
                  {message.text}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField icon={<IconUser size={14} />} label="Nombre *" value={form.nombre} onChange={(v) => updateField('nombre', v)} />
                <FormField icon={<IconUser size={14} />} label="Apellido *" value={form.apellido} onChange={(v) => updateField('apellido', v)} />
                <FormField icon={<IconMail size={14} />} label="Email *" value={form.email} onChange={(v) => updateField('email', v)} type="email" />
                <FormField icon={<IconPhone size={14} />} label="Teléfono" value={form.telefono} onChange={(v) => updateField('telefono', v)} />
                <FormField icon={<IconDocument size={14} />} label="Documento" value={form.documento} onChange={(v) => updateField('documento', v)} />
                <FormField icon={<IconGlobe size={14} />} label="Nacionalidad" value={form.nacionalidad} onChange={(v) => updateField('nacionalidad', v)} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.apellido || !form.email}
                className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-50 sm:py-2"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <IconSave size={16} />
                )}
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <IconWarning size={20} />
              </div>
              <h3 className="text-base font-bold sm:text-lg">Eliminar huésped</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar este huésped? Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 sm:py-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FormField reutilizable ──

function FormField({
  icon,
  label,
  value,
  onChange,
  type = 'text',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label.replace(' *', '')}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:py-2"
      />
    </div>
  );
}
