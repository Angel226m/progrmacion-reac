import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import type { RolUsuario } from './domain/types';
import Layout from './components/shared/Layout';
import LoginPage from './pages/LoginPage';
import RecepcionPage from './pages/RecepcionPage';
import DashboardPage from './pages/DashboardPage';
import ReservasPage from './pages/ReservasPage';
import ProductosPage from './pages/ProductosPage';
import LimpiezaPage from './pages/LimpiezaPage';
import HuespedesPage from './pages/HuespedesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import PersonalPage from './pages/PersonalPage';
import AnaliticaPage from './pages/AnaliticaPage';
import PerfilPage from './pages/PerfilPage';
import AuditoriaPage from './pages/AuditoriaPage';

// ═══════════════════════════════════════════════════════════
// HotelFlux — App raíz (pura: solo composición de rutas)
// Arquitectura Limpia: Login redirige por rol del usuario
// Un solo frontend, múltiples vistas según responsabilidad
// ═══════════════════════════════════════════════════════════

// Función pura: mapea rol → ruta por defecto (panel admin)
const rutaPorRol: Readonly<Record<RolUsuario, string>> = {
  admin: '/admin/dashboard',
  recepcionista: '/admin/recepcion',
  limpieza: '/admin/limpieza',
  mantenimiento: '/admin/dashboard',
  huesped: '/admin/dashboard',
} as const;

// Función pura: rutas permitidas según rol (panel admin)
const rutasPermitidas: Readonly<Record<RolUsuario, readonly string[]>> = {
  admin: ['/admin/dashboard', '/admin/recepcion', '/admin/reservas', '/admin/productos', '/admin/huespedes', '/admin/limpieza', '/admin/configuracion', '/admin/personal', '/admin/analitica', '/admin/auditoria', '/admin/perfil'],
  recepcionista: ['/admin/recepcion', '/admin/reservas', '/admin/productos', '/admin/huespedes', '/admin/perfil'],
  limpieza: ['/admin/limpieza', '/admin/perfil'],
  mantenimiento: ['/admin/dashboard', '/admin/perfil'],
  huesped: ['/admin/dashboard', '/admin/perfil'],
} as const;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guarda de rol: redirige si el usuario no tiene permiso
function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: readonly RolUsuario[];
}) {
  const { usuario } = useAuth();
  if (!usuario || !allowedRoles.includes(usuario.rol)) {
    const defaultRoute = usuario ? rutaPorRol[usuario.rol] : '/login';
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
}

// Redirige al home según el rol del usuario autenticado
function RoleRedirect() {
  const { usuario } = useAuth();
  const destino = usuario ? rutaPorRol[usuario.rol] : '/login';
  return <Navigate to={destino} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Login del personal (pantalla completa) */}
      <Route path="/login" element={<LoginPage />} />

      {/* ═══ Rutas protegidas (panel de empleados) ═══ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout rutasPermitidas={rutasPermitidas} />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleRedirect />} />
        <Route
          path="recepcion"
          element={
            <RoleGuard allowedRoles={['admin', 'recepcionista']}>
              <RecepcionPage />
            </RoleGuard>
          }
        />
        <Route
          path="dashboard"
          element={
            <RoleGuard allowedRoles={['admin', 'mantenimiento']}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="reservas"
          element={
            <RoleGuard allowedRoles={['admin', 'recepcionista']}>
              <ReservasPage />
            </RoleGuard>
          }
        />
        <Route
          path="productos"
          element={
            <RoleGuard allowedRoles={['admin', 'recepcionista']}>
              <ProductosPage />
            </RoleGuard>
          }
        />
        <Route
          path="huespedes"
          element={
            <RoleGuard allowedRoles={['admin', 'recepcionista']}>
              <HuespedesPage />
            </RoleGuard>
          }
        />
        <Route
          path="limpieza"
          element={
            <RoleGuard allowedRoles={['admin', 'limpieza']}>
              <LimpiezaPage />
            </RoleGuard>
          }
        />
        <Route
          path="configuracion"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <ConfiguracionPage />
            </RoleGuard>
          }
        />
        <Route
          path="personal"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <PersonalPage />
            </RoleGuard>
          }
        />
        <Route
          path="analitica"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AnaliticaPage />
            </RoleGuard>
          }
        />
        <Route
          path="auditoria"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <AuditoriaPage />
            </RoleGuard>
          }
        />
        <Route
          path="perfil"
          element={
            <RoleGuard allowedRoles={['admin', 'recepcionista', 'limpieza', 'mantenimiento']}>
              <PerfilPage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Legacy redirects (rutas antiguas → /admin/*) */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/recepcion" element={<Navigate to="/admin/recepcion" replace />} />
      <Route path="/reservas" element={<Navigate to="/admin/reservas" replace />} />
      <Route path="/productos" element={<Navigate to="/admin/productos" replace />} />
      <Route path="/huespedes" element={<Navigate to="/admin/huespedes" replace />} />
      <Route path="/limpieza" element={<Navigate to="/admin/limpieza" replace />} />
      <Route path="/configuracion" element={<Navigate to="/admin/configuracion" replace />} />
      <Route path="/personal" element={<Navigate to="/admin/personal" replace />} />
      <Route path="/analitica" element={<Navigate to="/admin/analitica" replace />} />
      <Route path="/perfil" element={<Navigate to="/admin/perfil" replace />} />

      {/* Redirect raíz y catch-all → login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export { rutaPorRol, rutasPermitidas };
