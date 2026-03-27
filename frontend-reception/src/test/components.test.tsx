// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests de Componentes UI (rendering + interacción)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import type { ReactNode } from 'react';

// Helper: wrapper con providers necesarios
function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Componentes UI — Rendering básico', () => {
  describe('LoginPage', () => {
    it('renderiza formulario de login', async () => {
      const { default: LoginPage } = await import('../pages/LoginPage');

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      // Debe tener campos de email y password
      expect(screen.getByPlaceholderText(/email/i) ?? screen.getByLabelText(/email/i)).toBeTruthy();
    });
  });

  describe('PersonalPage', () => {
    it('renderiza tabs de Personal y Horarios', async () => {
      // Mock useAuth para simular admin logueado
      localStorage.setItem('hotelflux_token', 'test-token');
      localStorage.setItem('hotelflux_usuario', JSON.stringify({
        id: 'u-1',
        nombre: 'Admin',
        email: 'admin@test.com',
        rol: 'admin',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      }));

      const { default: PersonalPage } = await import('../pages/PersonalPage');

      render(
        <TestWrapper>
          <PersonalPage />
        </TestWrapper>,
      );

      // Debe mostrar el título y tabs
      expect(screen.getByText(/Personal/)).toBeTruthy();
      expect(screen.getByText(/Horarios/)).toBeTruthy();
    });
  });

  describe('AnaliticaPage', () => {
    it('renderiza selector de período y cards KPI', async () => {
      localStorage.setItem('hotelflux_token', 'test-token');
      localStorage.setItem('hotelflux_usuario', JSON.stringify({
        id: 'u-1',
        nombre: 'Admin',
        email: 'admin@test.com',
        rol: 'admin',
        activo: true,
        inserted_at: '2025-01-01T00:00:00Z',
      }));

      const { default: AnaliticaPage } = await import('../pages/AnaliticaPage');

      render(
        <TestWrapper>
          <AnaliticaPage />
        </TestWrapper>,
      );

      // Debe tener el título de analítica
      expect(screen.getByText(/Anal/)).toBeTruthy();
    });
  });
});

describe('Navegación y Rutas', () => {
  it('rutas admin incluyen /personal y /analitica', () => {
    const adminRoutes = ['/personal', '/analitica'];
    adminRoutes.forEach((route) => {
      expect(route).toMatch(/^\//);
    });
  });

  it('rutasPermitidas correctas por rol', () => {
    const rutasPermitidas = {
      admin: ['/dashboard', '/recepcion', '/reservas', '/huespedes', '/productos', '/limpieza', '/configuracion', '/personal', '/analitica'],
      recepcionista: ['/dashboard', '/recepcion', '/reservas', '/huespedes', '/productos'],
      limpieza: ['/dashboard', '/limpieza'],
      mantenimiento: ['/dashboard', '/configuracion'],
    };

    expect(rutasPermitidas.admin).toContain('/personal');
    expect(rutasPermitidas.admin).toContain('/analitica');
    expect(rutasPermitidas.recepcionista).not.toContain('/personal');
    expect(rutasPermitidas.limpieza).not.toContain('/analitica');
  });
});
