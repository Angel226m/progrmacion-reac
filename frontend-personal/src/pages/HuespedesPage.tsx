// ═══════════════════════════════════════════════════════════
// HotelFlux — HuespedesPage (CRUD completo de huéspedes)
// Rol: admin, recepcionista
// Admin/recepcionista: crear, editar, eliminar
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

interface HuespedFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento_identidad: string;
  nacionalidad: string;
}

const emptyForm: HuespedFormData = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  documento_identidad: '',
  nacionalidad: '',
};

export default function HuespedesPage() {
  const { token, usuario } = useAuth();
  const [huespedes, setHuespedes] = useState<readonly Huesped[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

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
    try {
      const res = await queries.listarHuespedes(token);
      setHuespedes(res.huespedes);
    } catch (err) {
      console.error('Error cargando huéspedes:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargarHuespedes(); }, [cargarHuespedes]);

  // Filtrado
  const huespedesFiltrados = huespedes.filter((h) => {
    const t = busqueda.toLowerCase();
    return (
      (h.nombre ?? '').toLowerCase().includes(t) ||
      (h.apellido ?? '').toLowerCase().includes(t) ||
      (h.email ?? '').toLowerCase().includes(t) ||
      (h.documento_identidad?.toLowerCase().includes(t) ?? false)
    );
  });

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
      documento_identidad: h.documento_identidad ?? '',
      nacionalidad: h.nacionalidad ?? '',
    });
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await comandos.actualizarHuesped(editingId, {
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono || null,
          documento_identidad: form.documento_identidad || null,
          nacionalidad: form.nacionalidad || null,
        }, token);
        setMessage({ type: 'success', text: 'Huésped actualizado exitosamente' });
      } else {
        await comandos.crearHuesped({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono || null,
          documento_identidad: form.documento_identidad || null,
          nacionalidad: form.nacionalidad || null,
        }, token);
        setMessage({ type: 'success', text: 'Huésped creado exitosamente' });
      }
      setShowModal(false);
      cargarHuespedes();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    try {
      await comandos.eliminarHuesped(deleteId, token);
      setMessage({ type: 'success', text: 'Huésped eliminado' });
      setDeleteId(null);
      cargarHuespedes();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar' });
    }
  };

  const updateField = (key: keyof HuespedFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
            <IconHuespedes size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Huéspedes</h1>
            <p className="text-sm text-slate-500">
              Directorio de huéspedes — {huespedes.length} registrados
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl"
          >
            <IconPlus size={16} />
            Nuevo Huésped
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
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
        <IconSearch size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="text-slate-400 hover:text-slate-600">
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        </div>
      ) : huespedesFiltrados.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
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
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3.5 font-semibold text-slate-600">Nombre</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-600">Teléfono</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-600">Documento</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-600">País</th>
                  {canEdit && <th className="px-4 py-3.5 font-semibold text-slate-600">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {huespedesFiltrados.map((h) => (
                  <tr key={h.id} className="group transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-violet-600">
                          {h.nombre.charAt(0)}{h.apellido.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{h.nombre} {h.apellido}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{h.email}</td>
                    <td className="px-4 py-3.5 text-slate-600">{h.telefono ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{h.documento_identidad ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{h.nacionalidad ?? '—'}</td>
                    {canEdit && (
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Huésped' : 'Nuevo Huésped'}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
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
                <FormField icon={<IconDocument size={14} />} label="Documento" value={form.documento_identidad} onChange={(v) => updateField('documento_identidad', v)} />
                <FormField icon={<IconGlobe size={14} />} label="Nacionalidad" value={form.nacionalidad} onChange={(v) => updateField('nacionalidad', v)} />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.apellido || !form.email}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <IconWarning size={20} />
              </div>
              <h3 className="text-lg font-bold">Eliminar huésped</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar este huésped? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      />
    </div>
  );
}
