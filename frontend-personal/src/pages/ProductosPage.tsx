import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { queries, comandos } from '../services/api';
import type { Producto, Reserva, CategoriaProducto } from '../domain/types';
import {
  IconProductos,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconClose,
  IconSave,
  IconMinibar,
  IconRoomService,
  IconSpa,
  IconLaundry,
  IconTour,
  IconParking,
  IconTools,
  IconActivity,
  IconBuilding,
  IconWarning,
  IconFilter,
} from '../components/shared/Icons';
import clsx from 'clsx';
import Pagination from '../components/shared/Pagination';
import { fromPromise, fold, err, toError } from '../domain/result';

const POR_PAGINA = 12;

const LABEL_CATEGORIA: Readonly<Record<CategoriaProducto, string>> = {
  minibar: 'Minibar',
  room_service: 'Room Service',
  spa: 'Spa',
  lavanderia: 'Lavandería',
  tour: 'Tours',
  estacionamiento: 'Estacionamiento',
  gimnasio: 'Gimnasio',
  piscina: 'Piscina',
  conferencias: 'Conferencias',
};

const ICONO_CATEGORIA: Record<CategoriaProducto, (props: { size: number; className: string }) => React.ReactNode> = {
  minibar: (props) => <IconMinibar {...props} />,
  room_service: (props) => <IconRoomService {...props} />,
  spa: (props) => <IconSpa {...props} />,
  lavanderia: (props) => <IconLaundry {...props} />,
  tour: (props) => <IconTour {...props} />,
  estacionamiento: (props) => <IconParking {...props} />,
  gimnasio: (props) => <IconTools {...props} />,
  piscina: (props) => <IconActivity {...props} />,
  conferencias: (props) => <IconBuilding {...props} />,
};

function IconCategoria({ cat, size = 18 }: { cat: CategoriaProducto; size?: number }) {
  return (ICONO_CATEGORIA[cat] ?? (() => null))({ size, className: 'text-current' });
}

const COLOR_CATEGORIA: Readonly<Record<CategoriaProducto, string>> = {
  minibar: 'bg-amber-50 text-amber-600 ring-amber-200',
  room_service: 'bg-orange-50 text-orange-600 ring-orange-200',
  spa: 'bg-purple-50 text-purple-600 ring-purple-200',
  lavanderia: 'bg-blue-50 text-blue-600 ring-blue-200',
  tour: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  estacionamiento: 'bg-slate-50 text-slate-600 ring-slate-200',
  gimnasio: 'bg-rose-50 text-rose-600 ring-rose-200',
  piscina: 'bg-cyan-50 text-cyan-600 ring-cyan-200',
  conferencias: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
};

interface ProductoFormData {
  nombre: string;
  categoria: CategoriaProducto;
  precio: string;
  stock: string;
  descripcion: string;
}

const emptyForm: ProductoFormData = {
  nombre: '',
  categoria: 'minibar',
  precio: '',
  stock: '',
  descripcion: '',
};

const CATEGORIAS: CategoriaProducto[] = ['minibar', 'room_service', 'spa', 'lavanderia', 'tour', 'estacionamiento', 'gimnasio', 'piscina', 'conferencias'];

export default function ProductosPage() {
  const { token, usuario } = useAuth();
  const [productos, setProductos] = useState<readonly Producto[]>([]);
  const [reservasActivas, setReservasActivas] = useState<readonly Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaProducto | 'todas'>('todas');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductoFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [ventaProducto, setVentaProducto] = useState<Producto | null>(null);
  const [ventaReservaId, setVentaReservaId] = useState('');
  const [ventaCantidad, setVentaCantidad] = useState(1);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = usuario?.rol === 'admin';

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const result = await (token
      ? fromPromise(Promise.all([
          queries.listarProductos(token),
          queries.reservasActivas(token),
        ]), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      ([resProd, resRes]: [{ productos: readonly Producto[] }, { reservas: readonly Reserva[] }]) => {
        setProductos(resProd.productos);
        setReservasActivas(resRes.reservas);
      },
      (error: Error) => console.error('Error cargando productos:', error),
    )(result);
    setLoading(false);
  }, [token]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const productosFiltrados = productos.filter((p) => {
    const pasaCategoria = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;
    const pasaBusqueda = !busqueda || (p.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase());
    return pasaCategoria && pasaBusqueda;
  });

  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const productosPagina = productosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
    setMessage(null);
  };

  const openEdit = (p: Producto) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      stock: String(p.stock),
      descripcion: p.descripcion ?? '',
    });
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const dto = {
      nombre: form.nombre,
      categoria: form.categoria,
      precio: form.precio,
      stock: parseInt(form.stock, 10) || 0,
      descripcion: form.descripcion || null,
    };
    const result = await (token
      ? fromPromise(
          editingId
            ? comandos.actualizarProducto(editingId, dto, token)
            : comandos.crearProducto(dto, token),
          toError,
        )
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: editingId ? 'Producto actualizado' : 'Producto creado' });
        setShowModal(false);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
    setSaving(false);
  };

  const handleDelete = async () => {
    const result = await (token && deleteId
      ? fromPromise(comandos.eliminarProducto(deleteId, token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: 'Producto eliminado' });
        setDeleteId(null);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
  };

  const handleVenta = async () => {
    setSaving(true);
    const result = await (token && ventaProducto
      ? fromPromise(comandos.venderProducto({
          producto_id: ventaProducto.id,
          reserva_id: ventaReservaId,
          cantidad: ventaCantidad,
        }, token), toError)
      : Promise.resolve(err(new Error('No autorizado')))
    );
    fold(
      () => {
        setMessage({ type: 'success', text: `Venta de ${ventaProducto!.nombre} registrada` });
        setVentaProducto(null);
        cargarDatos();
      },
      (error: Error) => setMessage({ type: 'error', text: error.message }),
    )(result);
    setSaving(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
            <IconProductos size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Productos y Servicios</h1>
            <p className="text-sm text-slate-500">
              {productos.length} productos · {reservasActivas.length} reservas activas
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl"
          >
            <IconPlus size={16} />
            Nuevo Producto
          </button>
        )}
      </div>

      {message && !showModal && !ventaProducto && (
        <div className={clsx(
          'mb-4 animate-fade-in rounded-lg px-4 py-3 text-sm ring-1',
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200',
        )}>
          {message.text}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
          <IconSearch size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-40 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <IconFilter size={14} className="mr-1 text-slate-400" />
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              categoriaFiltro === 'todas' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            Todos
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? 'todas' : cat)}
              className={clsx(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                categoriaFiltro === cat ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <IconCategoria cat={cat} size={12} />
              {LABEL_CATEGORIA[cat]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
          <IconProductos size={48} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No hay productos que mostrar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productosPagina.map((p) => (
            <div key={p.id} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <div className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1', COLOR_CATEGORIA[p.categoria])}>
                  <IconCategoria cat={p.categoria} size={12} />
                  {LABEL_CATEGORIA[p.categoria]}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                      <IconEdit size={14} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-800">{p.nombre}</h3>
              {p.descripcion && (
                <p className="mt-1 text-xs text-slate-500">{p.descripcion}</p>
              )}

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-slate-800">S/ {p.precio}</span>
                </div>
                <span className={clsx(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  p.stock > 10 ? 'bg-emerald-50 text-emerald-600' : p.stock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600',
                )}>
                  Stock: {p.stock}
                </span>
              </div>

              {p.stock > 0 && p.disponible && (
                <button
                  onClick={() => { setVentaProducto(p); setVentaReservaId(''); setVentaCantidad(1); }}
                  className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                >
                  Vender
                </button>
              )}
            </div>
          ))}
          {productosFiltrados.length > POR_PAGINA && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Pagination
                pagina={paginaActual}
                setPagina={setPagina}
                total={productosFiltrados.length}
                porPagina={POR_PAGINA}
                color="blue"
                itemLabel="producto"
              />
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Categoría *</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProducto })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{LABEL_CATEGORIA[cat]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Precio *</label>
                  <input
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Stock *</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Descripción del producto..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.precio || !form.stock}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <IconSave size={16} />}
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ventaProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Vender: {ventaProducto.nombre}</h2>
              <button onClick={() => setVentaProducto(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <IconClose size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Reserva (huésped)</label>
                <select
                  value={ventaReservaId}
                  onChange={(e) => setVentaReservaId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">Seleccionar reserva...</option>
                  {reservasActivas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.huesped ? `${r.huesped.nombre} ${r.huesped.apellido}` : r.id.slice(0, 8)} — Hab. {r.habitacion?.numero ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={ventaProducto.stock}
                  value={ventaCantidad}
                  onChange={(e) => setVentaCantidad(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="font-bold text-slate-800">
                    S/ {(parseFloat(ventaProducto.precio) * ventaCantidad).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setVentaProducto(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={handleVenta}
                disabled={saving || !ventaReservaId}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Registrar Venta
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
              <h3 className="text-lg font-bold">Eliminar producto</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar este producto?
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
