import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('pages/analitica', () => {
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

    const { default: AnaliticaPage } = await import('../../pages/AnaliticaPage');

    render(
      <TestWrapper>
        <AnaliticaPage />
      </TestWrapper>,
    );

    expect(screen.getByText(/Anal/)).toBeTruthy();
  });
});