import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../hooks/useAuth';
import { I18nContext, createT } from '../../hooks/useI18n';

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <I18nContext.Provider value={createT('es')}>
        <AuthProvider>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </AuthProvider>
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

describe('pages/publico/inicio', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza página de inicio', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');

    render(
      <TestWrapper>
        <InicioPage />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hotel/i) ?? screen.getByText(/Bienvenido/i) ?? screen.getByText(/hotelflux/i)).toBeTruthy();
    }, { timeout: 10000 });
  });
});

describe('pages/publico/habitaciones', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza página de habitaciones públicas', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: { 
          habitaciones: [], 
          tipos: [
            { tipo: 'simple', precio_desde: '150' },
            { tipo: 'doble', precio_desde: '250' }
          ] 
        } 
      }),
    });

    render(
      <MemoryRouter initialEntries={['/habitaciones']}>
        <I18nContext.Provider value={createT('es')}>
          <AuthProvider>
            <Routes>
              <Route path="/habitaciones" element={<HabitacionesPublicoPage />} />
            </Routes>
          </AuthProvider>
        </I18nContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Habitaciones|suite/i)[0]).toBeTruthy();
    }, { timeout: 10000 });
  });
});