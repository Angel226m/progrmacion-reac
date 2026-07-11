import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('pages/admin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('pages/admin/dashboard', () => {
    it('renderiza dashboard para admin', async () => {
      // Mock restore call (AuthProvider on mount calls /auth/renovar)
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/renovar')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              token: 'admin-token',
              usuario: {
                id: 'u-1', nombre: 'Admin Test', email: 'admin@test.com',
                rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
              },
            }),
          });
        }
        // Dashboard query — resolve with empty data
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { default: DashboardPage } = await import('../../pages/DashboardPage');

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/Resumen/i) || screen.queryByText(/Dashboard Analítico/i) || screen.queryByText(/Dashboard/i) || screen.queryByText(/HotelFlux/i) || document.querySelector('.glass-dark') || document.querySelector('[class*="dashboard"]')).toBeTruthy();
      }, { timeout: 15000 });
    });
  });
});
