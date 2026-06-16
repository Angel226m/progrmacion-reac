import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type Tab = 'perfil' | 'extras' | 'reservas' | 'seguridad';

const EXTRAS = [
  { id: 'late-checkout', name: 'Late Check-out (14:00)', precio: 25.00 },
  { id: 'early-checkin', name: 'Early Check-in (10:00)', precio: 20.00 },
  { id: 'desayuno', name: 'Desayuno VIP', precio: 15.00 },
  { id: 'spa', name: 'Acceso a SPA', precio: 40.00 },
];

export default function MiCuentaPage() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>('perfil');
  const [selected, setSelected] = useState<string[]>([]);

  if (!usuario) return null;

  const toggleExtra = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const total = EXTRAS.filter((e) => selected.includes(e.id)).reduce((sum, e) => sum + e.precio, 0);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">Mi Cuenta</h1>

      <div className="flex border-b gap-1">
        {(['perfil', 'extras', 'reservas', 'seguridad'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-[#0c1d3d] text-[#0c1d3d]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'perfil' && '👤'}
            {t === 'extras' && '✨'}
            {t === 'reservas' && '📋'}
            {t === 'seguridad' && '🔒'}
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Datos Personales</h2>
          <p className="text-sm text-gray-500"><strong>Nombre:</strong> {usuario.nombre}</p>
          <p className="text-sm text-gray-500"><strong>Email:</strong> {usuario.email}</p>
          <p className="text-sm text-gray-500"><strong>Rol:</strong> {usuario.rol}</p>
        </div>
      )}

      {tab === 'extras' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Servicios Extras para su Estadía</h2>
          {EXTRAS.map((extra) => (
            <label key={extra.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                />
                <span className="text-sm">{extra.name}</span>
              </div>
              <span className="text-sm font-semibold">S/ {extra.precio.toFixed(2)}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-[#c5a255]">Total: S/ {total.toFixed(2)}</p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                Agregar a Reserva
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'reservas' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Mis Reservas</h2>
          <p className="text-sm text-gray-500">No tiene reservas activas.</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Nueva Reserva
          </button>
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              Actualizar Contraseña
            </button>
          </form>
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <h3 className="font-semibold text-amber-800">Recomendaciones de Seguridad</h3>
            <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
              <li>Use una contraseña única para este sitio</li>
              <li>Combine mayúsculas, minúsculas, números y símbolos</li>
              <li>Cambie su contraseña cada 3 meses</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
