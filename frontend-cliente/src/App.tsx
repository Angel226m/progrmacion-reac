import { Routes, Route, Navigate } from 'react-router-dom';
import ClienteLayout from './components/shared/ClienteLayout';
import LoginPage from './pages/LoginPage';
import InicioPage from './pages/InicioPage';
import HabitacionesPublicoPage from './pages/HabitacionesPublicoPage';
import ServiciosPage from './pages/ServiciosPage';
import ReservaClientePage from './pages/ReservaClientePage';
import AccesoPage from './pages/AccesoPage';
import RegistroPage from './pages/RegistroPage';
import MiCuentaPage from './pages/MiCuentaPage';
import LegalPage from './pages/LegalPage';

// ═══════════════════════════════════════════════════════════
// HotelFlux — App raíz (cliente + landing)
// Arquitectura Limpia: solo rutas del portal del huésped
// ═══════════════════════════════════════════════════════════

// Función pura: ruta por defecto según rol (solo huesped)
export const rutaPorRol: Readonly<Record<string, string>> = {
  huesped: '/mi-cuenta',
} as const;

export default function App() {
  return (
    <Routes>
      {/* ═══ Rutas del portal de cliente con layout ═══ */}
      <Route element={<ClienteLayout />}>
        <Route index element={<InicioPage />} />
        <Route path="habitaciones" element={<HabitacionesPublicoPage />} />
        <Route path="servicios" element={<ServiciosPage />} />
        <Route path="reservar" element={<ReservaClientePage />} />
        <Route path="acceso" element={<AccesoPage />} />
        <Route path="registro" element={<RegistroPage />} />
        <Route path="mi-cuenta" element={<MiCuentaPage />} />
        <Route path="legal/:tipo" element={<LegalPage />} />
      </Route>

      {/* Acceso de huéspedes (pantalla completa, sin ClienteLayout) */}
      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
