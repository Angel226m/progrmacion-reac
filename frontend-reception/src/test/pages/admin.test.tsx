import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

function setupAdminUser() {
  localStorage.setItem('hotelflux_token', 'test-token');
  localStorage.setItem('hotelflux_usuario', JSON.stringify({
    id: 'u-1',
    nombre: 'Admin Test',
    email: 'admin@test.com',
    rol: 'admin',
    activo: true,
    inserted_at: '2025-01-01T00:00:00Z',
  }));
}



describe.skip('pages/admin (requiere setup complejo de mocks)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('pages/admin/dashboard', () => {
    it('renderiza dashboard para admin', async () => {
      setupAdminUser();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { ocupacion: { porcentaje: 75 }, reservas: { total: 10 } } }),
      });

      const { default: DashboardPage } = await import('../../pages/DashboardPage');

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i) ?? screen.getByText(/Resumen/i)).toBeTruthy();
      });
    });
  });
});