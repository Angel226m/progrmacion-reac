// ═══════════════════════════════════════════════════════════
// HotelFlux — Layout Principal (Premium UI)
// Sidebar dinámico según rol del usuario autenticado
// Offline badge cuando usa datos simulados
// ═══════════════════════════════════════════════════════════

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { disconnectSocket } from '../../streams/websocket.stream';
import { isOfflineMode } from '../../services/api';
import type { RolUsuario } from '../../domain/types';
import {
  IconDashboard,
  IconRecepcion,
  IconReservas,
  IconHuespedes,
  IconProductos,
  IconLimpieza,
  IconPersonal,
  IconAnalitica,
  IconOffline,
  IconLogout,
  IconNotification,
  IconTools,
  IconUser,
} from './Icons';
import clsx from 'clsx';

// ── Función pura: definición de navegación por ruta ──

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: React.FC<{ size?: number; className?: string }>;
}

const TODAS_LAS_RUTAS: readonly NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: IconDashboard },
  { path: '/admin/recepcion', label: 'Recepción', icon: IconRecepcion },
  { path: '/admin/reservas', label: 'Reservas', icon: IconReservas },
  { path: '/admin/huespedes', label: 'Huéspedes', icon: IconHuespedes },
  { path: '/admin/productos', label: 'Productos', icon: IconProductos },
  { path: '/admin/limpieza', label: 'Limpieza', icon: IconLimpieza },
  { path: '/admin/personal', label: 'Personal', icon: IconPersonal },
  { path: '/admin/analitica', label: 'Analítica', icon: IconAnalitica },
  { path: '/admin/configuracion', label: 'Configuración', icon: IconTools },
  { path: '/admin/perfil', label: 'Mi Perfil', icon: IconUser },
] as const;

// Función pura: filtra rutas según permisos del rol
function obtenerNavItems(
  rol: RolUsuario,
  rutasPermitidas: Readonly<Record<RolUsuario, readonly string[]>>,
): readonly NavItem[] {
  const permitidas = rutasPermitidas[rol] ?? [];
  return TODAS_LAS_RUTAS.filter((item) => permitidas.includes(item.path));
}

// ── Función pura: etiqueta legible del rol ──

const LABEL_ROL: Readonly<Record<RolUsuario, string>> = {
  admin: 'Administrador',
  recepcionista: 'Recepcionista',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
} as const;

const COLOR_ROL: Readonly<Record<RolUsuario, string>> = {
  admin: 'from-purple-500 to-purple-600',
  recepcionista: 'from-blue-500 to-blue-600',
  limpieza: 'from-amber-500 to-amber-600',
  mantenimiento: 'from-slate-500 to-slate-600',
} as const;

interface LayoutProps {
  readonly rutasPermitidas: Readonly<Record<RolUsuario, readonly string[]>>;
}

export default function Layout({ rutasPermitidas }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  const navigate = useNavigate();

  if (!usuario) return null;

  const navItems = obtenerNavItems(usuario.rol, rutasPermitidas);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-100/50">
      {/* ── Sidebar ── */}
      <aside className="flex w-[280px] flex-col border-r border-slate-200/80 bg-white shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-500/20">
            <span className="text-xl font-black text-blue-950">H</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-800">HotelFlux</h1>
            <p className="text-[11px] font-medium text-slate-400">Sistema de Gestión</p>
          </div>
        </div>

        {/* Offline badge */}
        {isOfflineMode() && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            <IconOffline size={14} className="text-amber-600" />
            Modo Demo — Datos Simulados
          </div>
        )}

        {/* Navegación */}
        <nav className="mt-4 flex-1 space-y-0.5 px-3">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Navegación
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                )
              }
            >
              <item.icon size={18} className="transition-transform group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Notificaciones badge */}
        {noLeidas > 0 && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 ring-1 ring-amber-200/50">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
              {noLeidas}
            </span>
            <IconNotification size={16} className="text-amber-600" />
            <span className="text-sm text-amber-800">
              {noLeidas === 1 ? 'Notificación' : 'Notificaciones'}
            </span>
          </div>
        )}

        {/* Usuario + Cerrar sesión */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm',
              COLOR_ROL[usuario.rol],
            )}>
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{usuario.nombre}</p>
              <p className="text-xs font-medium text-slate-400">{LABEL_ROL[usuario.rol]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <IconLogout size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
