// ═══════════════════════════════════════════════════════════
// HotelFlux — Layout Principal (Premium UI + Mobile Responsive)
// Sidebar dinámico según rol del usuario autenticado
// Hamburger menu para pantallas móviles < lg
// Breadcrumbs contextuales por sección activa
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { disconnectSocket } from '../../streams/websocket.stream';
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
  IconLogout,
  IconNotification,
  IconTools,
  IconUser,
  IconAuditoria,
  IconMenu,
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
  { path: '/admin/auditoria', label: 'Auditoría', icon: IconAuditoria },
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

// Función pura: obtener breadcrumb desde la ubicación actual
function obtenerBreadcrumb(pathname: string): { seccion: string; icono: React.FC<{ size?: number; className?: string }> } | null {
  const match = TODAS_LAS_RUTAS.find((r) => r.path === pathname);
  return match ? { seccion: match.label, icono: match.icon } : null;
}

// ── Función pura: etiqueta legible del rol ──

const LABEL_ROL: Readonly<Record<RolUsuario, string>> = {
  admin: 'Administrador',
  recepcionista: 'Recepcionista',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
  huesped: 'Huésped',
} as const;

const COLOR_ROL: Readonly<Record<RolUsuario, string>> = {
  admin: 'from-purple-400 to-indigo-500',
  recepcionista: 'from-sky-400 to-blue-500',
  limpieza: 'from-amber-400 to-orange-500',
  mantenimiento: 'from-slate-400 to-slate-600',
  huesped: 'from-emerald-400 to-teal-500',
} as const;

const BADGE_ROL: Readonly<Record<RolUsuario, string>> = {
  admin: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  recepcionista: 'bg-sky-500/20 text-sky-300 ring-sky-500/30',
  limpieza: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
  mantenimiento: 'bg-slate-500/20 text-slate-300 ring-slate-500/30',
  huesped: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
} as const;

interface LayoutProps {
  readonly rutasPermitidas: Readonly<Record<RolUsuario, readonly string[]>>;
}

export default function Layout({ rutasPermitidas }: LayoutProps) {
  const { usuario: user, logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (!user) return (
    // Redirigir al login si no hay sesión
    <Navigate to="/login" replace />
  );

  const usuario = user;
  const navItems = obtenerNavItems(usuario.rol, rutasPermitidas);
  const breadcrumb = usuario ? obtenerBreadcrumb(location.pathname) : null;

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/', { replace: true });
  };

  // Contenido compartido del sidebar (DRY)
  const sidebarContent = (
    <>
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
          <span className="text-xl font-black text-blue-950">H</span>
        </div>
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-white">HotelFlux</h1>
          <p className="text-[10px] font-medium tracking-widest text-white/40 uppercase">Sistema de Gestión</p>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3">
        <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
          Menú Principal
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={closeSidebar}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-400/15 text-amber-300 shadow-sm ring-1 ring-amber-400/20'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                  isActive ? 'bg-amber-400/20 text-amber-300' : 'text-white/40 group-hover:text-white/70',
                )}>
                  <item.icon size={15} />
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Notificaciones (espacio siempre reservado) ── */}
      <div className={clsx(
        'mx-3 mb-2 flex min-h-[52px] items-center gap-2.5 rounded-xl border px-4 py-2.5',
        noLeidas > 0
          ? 'border-amber-400/20 bg-amber-400/10'
          : 'border-transparent',
      )}>
        {noLeidas > 0 ? (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-blue-950">
              {noLeidas}
            </span>
            <IconNotification size={15} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              {noLeidas === 1 ? '1 notificación' : `${noLeidas} notificaciones`}
            </span>
          </>
        ) : (
          <span className="invisible flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-blue-950">0</span>
            <span className="text-xs font-medium">0 notificaciones</span>
          </span>
        )}
      </div>

      {/* ── Usuario + Cerrar sesión ── */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          <div className={clsx(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md',
            COLOR_ROL[usuario.rol],
          )}>
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{usuario.nombre}</p>
            <span className={clsx(
              'mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1',
              BADGE_ROL[usuario.rol],
            )}>
              {LABEL_ROL[usuario.rol]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/60 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <IconLogout size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      {/* ── Overlay móvil ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden w-[260px] flex-col bg-[#0f172a] shadow-2xl shadow-black/20 lg:flex">
        {sidebarContent}
      </aside>

      {/* ── Sidebar Móvil (drawer) ── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#0f172a] shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top bar ── */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <IconMenu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-300">HotelFlux</span>
            {breadcrumb && (
              <>
                <span className="text-slate-300">/</span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <breadcrumb.icono size={14} className="text-amber-500" />
                  {breadcrumb.seccion}
                </span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Indicadores derecha */}
          <div className="flex items-center gap-2">
            <span className={clsx(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
              noLeidas > 0 ? 'bg-amber-400 text-blue-950' : 'invisible',
            )}>
              {noLeidas || 0}
            </span>
            <div className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white lg:hidden',
              COLOR_ROL[usuario.rol],
            )}>
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
