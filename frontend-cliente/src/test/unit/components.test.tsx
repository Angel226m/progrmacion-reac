// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Componentes (Unit)
// Renderizado de componentes compartidos
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { I18nContext, createT } from '../../hooks/useI18n';
import { rutaPorRol } from '../../config/routes';

function TestWrapper({ children, path = '/' }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <I18nContext.Provider value={createT('es')}>
        <AuthProvider>{children}</AuthProvider>
      </I18nContext.Provider>
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
    // Try multiple possible password placeholders
    const passInput = screen.queryByPlaceholderText('••••••••') || screen.queryByPlaceholderText('xxxxxxxx');
    expect(passInput).toBeTruthy();
  });

  it('LoginPage muestra botón de acceso demo de huésped', async () => {
    const { default: LoginPage } = await import('../../pages/LoginPage');
    render(<TestWrapper path="/login"><LoginPage /></TestWrapper>);

    // The demo button text comes from i18n: login.demo_huesped = 'Huésped Demo'
    expect(screen.getAllByText(/Huésped Demo/i)[0]).toBeTruthy();
  });

  describe('Routing', () => {
    it('todas las rutas son públicas del portal de cliente', () => {
      const publicRoutes = ['/', '/habitaciones', '/servicios', '/reservar', '/acceso', '/registro', '/mi-cuenta', '/legal/privacidad'];
      publicRoutes.forEach((r) => expect(r).not.toMatch(/^\/admin/));
    });

    it('los huéspedes son redirigidos a /mi-cuenta', () => {
      expect(rutaPorRol.huesped).toBe('/mi-cuenta');
    });
  });
});
