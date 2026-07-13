// ═══════════════════════════════════════════════════════════
// HotelFlux — ConfiguracionPage (gestión de pisos y habitaciones)
// CRUD de pisos y habitaciones con edición inline, generación por lote
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { queries, comandos } from '../services/api';
import type { Habitacion, TipoHabitacion, EstadoHabitacion } from '../domain/types';
import { CLASE_ESTADO, LABEL_ESTADO } from '../domain/types';
import {
  IconTools,
  IconFloor,
  IconPlus,
  IconTrash,
  IconEdit,
  IconClose,
  IconBed,
  IconBedDouble,
  IconStar,
  IconCrown,
  IconCheck,
  IconWarning,
  IconDoor,
  IconRefresh,
} from '../components/shared/Icons';
import clsx from 'clsx';
import Pagination from '../components/shared/Pagination';
import { fromPromise, fold, err, toError } from '../domain/result';

const POR_PAGINA_HAB = 6;

interface PisoConfig {
  piso: number;
  habitaciones: Habitacion[];
}

interface GenerarForm {
  piso: number;
  cantidad: number;
  tipo: TipoHabitacion;
}

interface EditarHabForm {
  numero: string;
  tipo: TipoHabitacion;
  capacidad: number;
  precio_noche: string;
  estado: EstadoHabitacion;
  amenidades: string;
  notas: string;
}

const PRECIOS_BASE: Record<TipoHabitacion, string> = {
  simple: '85.00',
  individual: '90.00',
  doble: '120.00',
  suite: '250.00',
  familiar: '180.00',
  presidencial: '450.00',
};

const CAPACIDAD_BASE: Record<TipoHabitacion, number> = {
  simple: 1,
  individual: 1,
  doble: 2,
  suite: 3,
  familiar: 4,
  presidencial: 4,
};

const ICONO_TIPO: Record<TipoHabitacion, (size: number) => React.ReactNode> = {
  simple: (size) => <IconBed size={size} />,
  individual: (size) => <IconBed size={size} />,
  doble: (size) => <IconBedDouble size={size} />,
  suite: (size) => <IconStar size={size} />,
  familiar: (size) => <IconBedDouble size={size} />,
  presidencial: (size) => <IconCrown size={size} />,
};

function IconTipo({ tipo, size = 16 }: { tipo: TipoHabitacion; size?: number }) {
  return (ICONO_TIPO[tipo] ?? (() => null))(size);
}

export default function ConfiguracionPage() {
  const { token } = useAuth();
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showGenerar, setShowGenerar] = useState(false);
  const [generarForm, setGenerarForm] = useState<GenerarForm>({ piso: 1, cantidad: 4, tipo: 'simple' });
  const [generando, setGenerando] = useState(false);

  const [showNuevoPiso, setShowNuevoPiso] = useState(false);
  const [nuevoPisoNum, setNuevoPisoNum] = useState(1);

  const [editingHab, setEditingHab] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditarHabForm>({
    numero: '', tipo: 'simple', capacidad: 1, precio_noche: '85.00', estado: 'disponible', amenidades: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [paginasPorPiso, setPaginasPorPiso] = useState<Record<number, number>>({});

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const result = await (token
      ? fromPromise(queries.listarHabitaciones(token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      (value: { habitaciones: Habitacion[] }) => setHabitaciones(value.habitaciones),
      (error: Error) => error.message !== 'No autorizado' && console.error('Error cargando habitaciones:', error),
    )(result);
    setLoading(false);
  }, [token]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const pisos: PisoConfig[] = useMemo(
    () =>
      [...new Set(habitaciones.map((h) => h.piso))]
        .sort((a, b) => a - b)
        .map((piso) => ({
          piso,
          habitaciones: [...habitaciones.filter((h) => h.piso === piso)].sort((a, b) =>
            a.numero.localeCompare(b.numero),
          ),
        })),
    [habitaciones],
  );

  const pisosExistentes = pisos.map((p) => p.piso);

  const handleGenerar = async () => {
    setGenerando(true);
    setMessage(null);
    const result = await (token
      ? fromPromise(comandos.generarHabitacionesPiso(generarForm.piso, generarForm.cantidad, generarForm.tipo, token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: `Se generaron ${generarForm.cantidad} habitaciones en el piso ${generarForm.piso}` });
        setShowGenerar(false);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
    setGenerando(false);
  };

  const handleNuevoPiso = () => {
    setGenerarForm({ piso: nuevoPisoNum, cantidad: 4, tipo: 'simple' });
    setShowNuevoPiso(false);
    setShowGenerar(true);
  };

  const openEdit = (hab: Habitacion) => {
    setEditingHab(hab.id);
    setEditForm({
      numero: hab.numero,
      tipo: hab.tipo,
      capacidad: hab.capacidad,
      precio_noche: hab.precio_noche,
      estado: hab.estado,
      amenidades: (hab.amenidades ?? []).join(', '),
      notas: hab.notas ?? '',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setMessage(null);
    const result = await (token && editingHab
      ? fromPromise(comandos.actualizarHabitacion(editingHab, {
          numero: editForm.numero,
          tipo: editForm.tipo,
          capacidad: editForm.capacidad,
          precio_noche: editForm.precio_noche,
          estado: editForm.estado,
          amenidades: editForm.amenidades.split(',').map((a) => a.trim()).filter(Boolean),
          notas: editForm.notas || null,
        }, token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: `Habitación ${editForm.numero} actualizada` });
        setEditingHab(null);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
    setSaving(false);
  };

  const handleDelete = async () => {
    const result = await (token && deleteId
      ? fromPromise(comandos.eliminarHabitacion(deleteId, token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: 'Habitación eliminada' });
        setDeleteId(null);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
  };

  const stats = {
    totalPisos: pisos.length,
    totalHabs: habitaciones.length,
    disponibles: habitaciones.filter((h) => h.estado === 'disponible').length,
    ocupadas: habitaciones.filter((h) => h.estado === 'ocupada').length,
  };

  return loading ? (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
        <p className="mt-4 text-sm text-slate-500">Cargando configuración...</p>
      </div>
    </div>
  ) : (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25">
            <IconTools size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Configuración</h1>
            <p className="text-sm text-slate-500">
              Administrar pisos y habitaciones del hotel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <IconRefresh size={16} />
            Actualizar
          </button>
          <button
            onClick={() => { setShowNuevoPiso(true); setNuevoPisoNum(Math.max(...pisosExistentes, 0) + 1); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
          >
            <IconPlus size={16} />
            Nuevo Piso
          </button>
        </div>
      </div>

      {message && (
        <div className={clsx(
          'mb-4 animate-fade-in rounded-xl px-4 py-3 text-sm ring-1',
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200',
        )}>
          {message.text}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pisos', value: stats.totalPisos, color: 'bg-purple-50 text-purple-700' },
          { label: 'Total Habitaciones', value: stats.totalHabs, color: 'bg-blue-50 text-blue-700' },
          { label: 'Disponibles', value: stats.disponibles, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Ocupadas', value: stats.ocupadas, color: 'bg-red-50 text-red-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={clsx('mt-1 text-2xl font-bold', color.split(' ')[1])}>{value}</p>
          </div>
        ))}
      </div>

      {pisos.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
          <IconFloor size={48} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No hay pisos configurados</p>
          <button
            onClick={() => { setShowNuevoPiso(true); setNuevoPisoNum(1); }}
            className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            + Configurar primer piso
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {pisos.map(({ piso, habitaciones: habs }) => (
            <div key={piso} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                    <IconFloor size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Piso {piso}</h3>
                    <p className="text-xs text-slate-500">
                      {habs.length} habitaciones · {habs.filter((h) => h.estado === 'disponible').length} disponibles
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setGenerarForm({ piso, cantidad: 2, tipo: 'simple' }); setShowGenerar(true); }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50"
                >
                  <IconPlus size={14} />
                  Agregar habitaciones
                </button>
              </div>

              {(() => {
                const pag = paginasPorPiso[piso] ?? 1;
                const totalPag = Math.max(1, Math.ceil(habs.length / POR_PAGINA_HAB));
                const pagActual = Math.min(pag, totalPag);
                const habsPag = habs.slice((pagActual - 1) * POR_PAGINA_HAB, pagActual * POR_PAGINA_HAB);
                return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 font-semibold text-slate-600">N°</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Tipo</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Capacidad</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Precio/noche</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Estado</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Amenidades</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {habsPag.map((hab) => (
                      <tr key={hab.id} className="group transition-colors hover:bg-slate-50/50">
                        {editingHab === hab.id ? (
                          <>
                            <td className="px-5 py-3">
                              <input
                                value={editForm.numero}
                                onChange={(e) => setEditForm((f) => ({ ...f, numero: e.target.value }))}
                                className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <select
                                value={editForm.tipo}
                                onChange={(e) => {
                                  const tipo = e.target.value as TipoHabitacion;
                                  setEditForm((f) => ({
                                    ...f,
                                    tipo,
                                    capacidad: CAPACIDAD_BASE[tipo],
                                    precio_noche: PRECIOS_BASE[tipo],
                                  }));
                                }}
                                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                              >
                                {(['simple', 'doble', 'suite', 'presidencial'] as const).map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <input
                                type="number"
                                min={1}
                                max={8}
                                value={editForm.capacidad}
                                onChange={(e) => setEditForm((f) => ({ ...f, capacidad: parseInt(e.target.value) || 1 }))}
                                className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">$</span>
                                <input
                                  value={editForm.precio_noche}
                                  onChange={(e) => setEditForm((f) => ({ ...f, precio_noche: e.target.value }))}
                                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <select
                                value={editForm.estado}
                                onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value as EstadoHabitacion }))}
                                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
                              >
                                {Object.entries(LABEL_ESTADO).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <input
                                value={editForm.amenidades}
                                onChange={(e) => setEditForm((f) => ({ ...f, amenidades: e.target.value }))}
                                placeholder="WiFi, TV, Minibar..."
                                className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saving}
                                  className="rounded-lg bg-emerald-500 p-2 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                                  title="Guardar"
                                >
                                  {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <IconCheck size={14} />}
                                </button>
                                <button
                                  onClick={() => setEditingHab(null)}
                                  className="rounded-lg bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                                  title="Cancelar"
                                >
                                  <IconClose size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                  <IconDoor size={14} className="text-slate-500" />
                                </div>
                                <span className="font-bold text-slate-800">{hab.numero}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 capitalize">
                                <IconTipo tipo={hab.tipo} size={14} />
                                <span className="text-slate-700">{hab.tipo}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600">{hab.capacidad} pers.</td>
                            <td className="px-5 py-3 font-semibold text-slate-800">S/ {hab.precio_noche}</td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${CLASE_ESTADO[hab.estado]}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                                {LABEL_ESTADO[hab.estado]}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(hab.amenidades ?? []).slice(0, 3).map((a) => (
                                  <span key={a} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{a}</span>
                                ))}
                                {(hab.amenidades ?? []).length > 3 && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                    +{(hab.amenidades ?? []).length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => openEdit(hab)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                  title="Editar"
                                >
                                  <IconEdit size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteId(hab.id)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Eliminar"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                );
              })()}
              {habs.length > POR_PAGINA_HAB && (
                <Pagination
                  pagina={paginasPorPiso[piso] ?? 1}
                  setPagina={(n) => setPaginasPorPiso((prev) => ({ ...prev, [piso]: n }))}
                  total={habs.length}
                  porPagina={POR_PAGINA_HAB}
                  color="purple"
                  itemLabel="habitación"
                  compacta
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showGenerar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Generar Habitaciones</h2>
              <button onClick={() => setShowGenerar(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <IconFloor size={14} /> Piso
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={generarForm.piso}
                  onChange={(e) => setGenerarForm((f) => ({ ...f, piso: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <IconDoor size={14} /> Cantidad de habitaciones
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={generarForm.cantidad}
                  onChange={(e) => setGenerarForm((f) => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 text-sm font-medium text-slate-600">Tipo de habitación</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['simple', 'doble', 'suite', 'presidencial'] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setGenerarForm((f) => ({ ...f, tipo }))}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-xs font-medium transition-all',
                        generarForm.tipo === tipo
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <IconTipo tipo={tipo} size={20} />
                      <span className="capitalize">{tipo}</span>
                      <span className="text-[10px] opacity-60">S/ {PRECIOS_BASE[tipo]}/noche</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Se generarán</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {generarForm.cantidad} habitaciones tipo <span className="capitalize">{generarForm.tipo}</span> en el Piso {generarForm.piso}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Capacidad: {CAPACIDAD_BASE[generarForm.tipo]} pers. · S/ {PRECIOS_BASE[generarForm.tipo]}/noche
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowGenerar(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerar}
                disabled={generando || generarForm.cantidad < 1}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {generando ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <IconPlus size={16} />
                )}
                Generar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNuevoPiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Nuevo Piso</h2>
              <button onClick={() => setShowNuevoPiso(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <IconFloor size={14} /> Número de piso
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={nuevoPisoNum}
                onChange={(e) => setNuevoPisoNum(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              {pisosExistentes.includes(nuevoPisoNum) && (
                <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                  <IconWarning size={12} />
                  Este piso ya existe. Se agregarán habitaciones al piso existente.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowNuevoPiso(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={handleNuevoPiso}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600"
              >
                <IconCheck size={16} />
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <IconWarning size={20} />
              </div>
              <h3 className="text-lg font-bold">Eliminar habitación</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar esta habitación? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
