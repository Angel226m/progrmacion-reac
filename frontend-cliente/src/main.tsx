import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './index.css';

// ═══════════════════════════════════════════════════════════
// HotelFlux — Punto de entrada (Funcional & Reactivo)
// React 19 + StrictMode para detectar side-effects impuros
// AuthProvider en raíz: contexto global de autenticación
// ═══════════════════════════════════════════════════════════

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found — DOM corrupto');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
