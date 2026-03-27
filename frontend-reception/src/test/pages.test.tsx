// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests de páginas nuevas (Legal, Perfil)
// Verifica renderizado, routing, y estados de loading/error
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LegalPage from '../pages/LegalPage';
import PerfilPage from '../pages/PerfilPage';
import { AuthProvider } from '../hooks/useAuth';

// ── Helpers ──

function renderLegalPage(tipo: string) {
  return render(
    <MemoryRouter initialEntries={[`/legal/${tipo}`]}>
      <Routes>
        <Route path="/legal/:tipo" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPerfilPage() {
  // Set localStorage keys that AuthProvider reads
  const mockUsuario = {
    id: 'test-id',
    nombre: 'Carlos Test',
    email: 'carlos@test.com',
    rol: 'admin',
    activo: true,
  };

  localStorage.setItem('hotelflux_token', 'fake-jwt-token');
  localStorage.setItem('hotelflux_usuario', JSON.stringify(mockUsuario));

  return render(
    <MemoryRouter initialEntries={['/perfil']}>
      <AuthProvider>
        <Routes>
          <Route path="/perfil" element={<PerfilPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ── Tests ──

describe('LegalPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la página de privacidad con fallback', async () => {
    // Mock fetch that fails (triggers fallback)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('privacidad');

    await waitFor(() => {
      expect(screen.getByText(/Política de Privacidad/i)).toBeInTheDocument();
    });
  });

  it('renderiza la página de términos con fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('terminos');

    await waitFor(() => {
      expect(screen.getByText(/Términos y Condiciones/i)).toBeInTheDocument();
    });
  });

  it('renderiza la página de cookies con fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('cookies');

    await waitFor(() => {
      expect(screen.getByText(/Política de Cookies/i)).toBeInTheDocument();
    });
  });

  it('tiene enlaces de navegación entre documentos legales', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('privacidad');

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map(l => l.getAttribute('href'));
      expect(hrefs.some(h => h?.includes('/legal/'))).toBe(true);
    });
  });
});

describe('PerfilPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renderiza el formulario de perfil cuando hay usuario', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText(/Datos Personales/i)).toBeInTheDocument();
    });
  });

  it('tiene tabs de datos personales y cambiar contraseña', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText(/Datos Personales/i)).toBeInTheDocument();
      expect(screen.getByText(/Cambiar Contraseña/i)).toBeInTheDocument();
    });
  });

  it('muestra el nombre del usuario', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText('Carlos Test')).toBeInTheDocument();
    });
  });

  it('puede cambiar a tab de contraseña', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderPerfilPage();

    await waitFor(() => {
      const tabPassword = screen.getByText(/Cambiar Contraseña/i);
      fireEvent.click(tabPassword);
    });

    await waitFor(() => {
      expect(screen.getByText(/Contraseña actual/i)).toBeInTheDocument();
    });
  });
});
