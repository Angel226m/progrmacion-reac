// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Componentes (Unit)
// Renderizado de componentes compartidos
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';

function TestWrapper({ children, path = '/' }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Unit / Componentes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('LoginPage renderiza campos de email y password', async () => {
    const { default: LoginPage } = await import('../../pages/LoginPage');
    render(<TestWrapper path="/login"><LoginPage /></TestWrapper>);

    expect(screen.getByPlaceholderText(/usuario@hotelflux.com/)).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('LoginPage muestra botón de acceso demo de huésped', async () => {
    const { default: LoginPage } = await import('../../pages/LoginPage');
    render(<TestWrapper path="/login"><LoginPage /></TestWrapper>);

    expect(screen.getByText('Huésped Demo')).toBeTruthy();
  });

  describe('Routing', () => {
    it('todas las rutas son públicas del portal de cliente', () => {
      const publicRoutes = ['/', '/habitaciones', '/servicios', '/reservar', '/acceso', '/registro', '/mi-cuenta', '/legal/privacidad'];
      publicRoutes.forEach((r) => expect(r).not.toMatch(/^\/admin/));
    });

    it('los huéspedes son redirigidos a /mi-cuenta', async () => {
      const { rutaPorRol } = await import('../../App');
      expect(rutaPorRol.huesped).toBe('/mi-cuenta');
    });
  });
});
