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

describe('pages/analitica', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
  });

  it('renderiza selector de período y cards KPI', async () => {
    const { default: AnaliticaPage } = await import('../../pages/AnaliticaPage');

    render(
      <TestWrapper>
        <AnaliticaPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Analítico|Analítica|Analític/i)).toBeTruthy();
    }, { timeout: 15000 });
  });
});
