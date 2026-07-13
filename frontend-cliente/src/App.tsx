// ═══════════════════════════════════════════════════════════
// HotelFlux — App Root (Enrutador Principal)
// Define todas las rutas públicas y el layout del cliente
// ═══════════════════════════════════════════════════════════

import { Routes, Route, Navigate } from 'react-router-dom';
import ClienteLayout from './components/shared/ClienteLayout';
import LoginPage from './pages/LoginPage';
import RecuperarContrasenaPage from './pages/RecuperarContrasenaPage';
import RestablecerContrasenaPage from './pages/RestablecerContrasenaPage';
import InicioPage from './pages/InicioPage';
import NosotrosPage from './pages/NosotrosPage';
import HabitacionesPublicoPage from './pages/HabitacionesPublicoPage';
import ContactoPage from './pages/ContactoPage';
import ServiciosPage from './pages/ServiciosPage';
import ReservaClientePage from './pages/ReservaClientePage';
import AccesoPage from './pages/AccesoPage';
import RegistroPage from './pages/RegistroPage';
import MiCuentaPage from './pages/MiCuentaPage';
import LegalPage from './pages/LegalPage';

export default function App() {
  return (
    <Routes>
      <Route element={<ClienteLayout />}>
        <Route index element={<InicioPage />} />
        <Route path="nosotros" element={<NosotrosPage />} />
        <Route path="habitaciones" element={<HabitacionesPublicoPage />} />
        <Route path="contacto" element={<ContactoPage />} />
        <Route path="servicios" element={<ServiciosPage />} />
        <Route path="reservar" element={<ReservaClientePage />} />
        <Route path="acceso" element={<AccesoPage />} />
        <Route path="registro" element={<RegistroPage />} />
        <Route path="mi-cuenta" element={<MiCuentaPage />} />
        <Route path="legal/:tipo" element={<LegalPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasenaPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
