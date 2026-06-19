// ═══════════════════════════════════════════════════════════
// HotelFlux — CatalogoProductos (catálogo + venta)
// Componente funcional puro: lista de productos por categoría
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { safeApiFetch } from '../../services/api';
import type { Producto, CategoriaProducto, Reserva } from '../../domain/types';
import { IconMinibar, IconRoomService, IconSpa, IconLaundry, IconTour, IconParking, IconTools, IconActivity, IconBuilding, IconProductos } from '../shared/Icons';
import clsx from 'clsx';

interface CatalogoProductosProps {
  readonly productos: readonly Producto[];
  readonly reservasActivas: readonly Reserva[];
  readonly onVentaSuccess?: () => void;
}

const iconosCategoria: Readonly<Record<CategoriaProducto, React.FC<{ size?: number; className?: string }>>> = {
  minibar: IconMinibar,
  room_service: IconRoomService,
  spa: IconSpa,
  lavanderia: IconLaundry,
  tour: IconTour,
  estacionamiento: IconParking,
  gimnasio: IconTools,
  piscina: IconActivity,
  conferencias: IconBuilding,
};

// Función pura: icono por categoría
function CategoriaIcon({ cat, size = 18 }: { cat: CategoriaProducto; size?: number }) {
  const Icono = iconosCategoria[cat] ?? (() => null);
  return <Icono size={size} />;
}

// Función pura: label por categoría
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

// Función pura: categorías únicas de los productos
function categoriasUnicas(productos: readonly Producto[]): readonly CategoriaProducto[] {
  return [...new Set(productos.map((p) => p.categoria))].sort();
}

export default function CatalogoProductos({
  productos,
  reservasActivas,
  onVentaSuccess,
}: CatalogoProductosProps) {
  const { token } = useAuth();
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaProducto | 'todas'>('todas');
  const [ventaForm, setVentaForm] = useState<{
    producto_id: string;
    reserva_id: string;
    cantidad: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const categorias = categoriasUnicas(productos);

  // Función pura: filtrar productos
  const productosFiltrados =
    categoriaActiva === 'todas'
      ? productos.filter((p) => p.disponible)
      : productos.filter((p) => p.disponible && p.categoria === categoriaActiva);

  const handleVender = useCallback(
    async () => {
      if (!token || !ventaForm) return;
      setLoading(true);
      setMessage(null);
      const result = await safeApiFetch('/productos/vender', {
        method: 'POST',
        body: JSON.stringify(ventaForm),
      }, token);
      if (result.ok) {
        setMessage({ type: 'success', text: 'Venta registrada exitosamente' });
        setVentaForm(null);
        onVentaSuccess?.();
      } else {
        setMessage({ type: 'error', text: result.error.message || 'Error en venta' });
      }
      setLoading(false);
    },
    [token, ventaForm, onVentaSuccess],
  );

  return (
    <div className="space-y-4">
      {message && (
        <div className={`animate-fade-in rounded-lg px-4 py-3 text-sm ring-1 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filtro por categoría */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoriaActiva('todas')}
          className={clsx(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            categoriaActiva === 'todas'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              categoriaActiva === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            <CategoriaIcon cat={cat} size={14} /> {LABEL_CATEGORIA[cat]}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <CategoriaIcon cat={producto.categoria} size={24} />
                <h4 className="mt-1 text-sm font-semibold text-slate-800">{producto.nombre}</h4>
                <p className="text-xs text-slate-500">{LABEL_CATEGORIA[producto.categoria]}</p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-bold text-blue-800">
                S/ {producto.precio}
              </span>
            </div>

            {producto.descripcion && (
              <p className="mb-3 text-xs text-slate-500">{producto.descripcion}</p>
            )}

            <div className="flex items-center justify-between">
              <span className={clsx(
                'text-xs font-medium',
                producto.stock > 5 ? 'text-emerald-600' : producto.stock > 0 ? 'text-amber-600' : 'text-red-600',
              )}>
                Stock: {producto.stock}
              </span>

              {producto.stock > 0 && (
                <button
                  onClick={() => setVentaForm({
                    producto_id: producto.id,
                    reserva_id: '',
                    cantidad: 1,
                  })}
                  className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                >
                  Vender
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de venta */}
      {ventaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-fade-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800"><IconProductos size={20} /> Registrar Venta</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">
                  Reserva (huésped)
                </label>
                <select
                  value={ventaForm.reserva_id}
                  onChange={(e) => setVentaForm({ ...ventaForm, reserva_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                <label className="mb-1.5 block text-sm font-medium text-slate-600">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={ventaForm.cantidad}
                  onChange={(e) => setVentaForm({ ...ventaForm, cantidad: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setVentaForm(null)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleVender}
                disabled={loading || !ventaForm.reserva_id}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
