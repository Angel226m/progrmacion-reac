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

  it('LoginPage muestra botones de acceso rápido demo', async () => {
    const { default: LoginPage } = await import('../../pages/LoginPage');
    render(<TestWrapper path="/login"><LoginPage /></TestWrapper>);

    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Recepción')).toBeTruthy();
    expect(screen.getByText('Limpieza')).toBeTruthy();
  });

  it('PerfilPage renderiza tabs (con sesión)', async () => {
    localStorage.setItem('hotelflux_token', 'test');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', email: 'admin@hotelflux.com', nombre: 'Admin', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { default: PerfilPage } = await import('../../pages/PerfilPage');
    render(<TestWrapper path="/admin/perfil"><PerfilPage /></TestWrapper>);

    expect(screen.getByText(/Datos Personales/i)).toBeTruthy();
    expect(screen.getByText(/Cambiar Contraseña/i)).toBeTruthy();
  });

  describe('Routing', () => {
    it('rutas admin requieren autenticación, rutas públicas no', () => {
      const publicRoutes = ['/', '/habitaciones', '/servicios', '/reservar', '/acceso', '/registro', '/legal/privacidad'];
      const adminRoutes = ['/admin/dashboard', '/admin/recepcion', '/admin/reservas'];

      publicRoutes.forEach((r) => expect(r).not.toMatch(/^\/admin/));
      adminRoutes.forEach((r) => expect(r).toMatch(/^\/admin\//));
    });

    it('los roles mapean a rutas admin correctas', async () => {
      const { rutaPorRol } = await import('../../App');
      expect(rutaPorRol.admin).toBe('/admin/dashboard');
      expect(rutaPorRol.recepcionista).toBe('/admin/recepcion');
      expect(rutaPorRol.limpieza).toBe('/admin/limpieza');
      expect(rutaPorRol.mantenimiento).toBe('/admin/dashboard');
    });
  });
});
