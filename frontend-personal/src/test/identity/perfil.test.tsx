import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PerfilPage from '../../pages/PerfilPage';
import { AuthProvider } from '../../hooks/useAuth';

function renderPerfilPage() {
  const mockUsuario = {
    id: 'test-id',
    nombre: 'Carlos Test',
    email: 'carlos@test.com',
    rol: 'admin',
    activo: true,
  };

  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      token: 'fake-jwt-token',
      usuario: mockUsuario,
    }),
  });

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

describe('identity/perfil', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
  });

  it('renderiza el formulario de perfil cuando hay usuario', async () => {
    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText(/Datos Personales/i)).toBeInTheDocument();
    });
  });

  it('tiene tabs de datos personales y cambiar contraseña', async () => {
    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText(/Datos Personales/i)).toBeInTheDocument();
      expect(screen.getByText(/Cambiar Contraseña/i)).toBeInTheDocument();
    });
  });

  it('muestra el nombre del usuario', async () => {
    renderPerfilPage();

    await waitFor(() => {
      expect(screen.getByText('Carlos Test')).toBeInTheDocument();
    });
  });

  it('puede cambiar a tab de contraseña', async () => {
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
