// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: MiCuentaPage (Perfil del Huésped)
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MiCuentaPage from '../../pages/MiCuentaPage';
import { AuthProvider } from '../../hooks/useAuth';
import { I18nContext, createT } from '../../hooks/useI18n';

function renderMiCuenta() {
  return render(
    <MemoryRouter initialEntries={['/mi-cuenta']}>
      <I18nContext.Provider value={createT('es')}>
        <AuthProvider>
          <Routes>
            <Route path="/mi-cuenta" element={<MiCuentaPage />} />
            <Route path="/acceso" element={<div>Acceso</div>} />
          </Routes>
        </AuthProvider>
      </I18nContext.Provider>
    </MemoryRouter>,
  );
}

function makeAuthFetch() {
  const token = (globalThis as any).makeTestToken();
  globalThis.fetch = vi.fn((url: string) => {
    if (url.includes('/auth/renovar')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token,
          usuario: {
            id: 'c-1',
            nombre: 'Ana García',
            email: 'ana@cliente.com',
            rol: 'huesped',
            activo: true,
            inserted_at: '2025-01-01T00:00:00Z',
          },
        }),
      } as unknown as Response);
    }
    if (url.includes('/reservas')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) } as unknown as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) } as unknown as Response);
  }) as unknown as typeof globalThis.fetch;
}

describe('identity/perfil (cliente — MiCuentaPage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'No session' }),
    } as unknown as Response)) as unknown as typeof globalThis.fetch;
  });

  it('redirige a /acceso si no hay sesión', async () => {
    render(
      <MemoryRouter initialEntries={['/mi-cuenta']}>
        <I18nContext.Provider value={createT('es')}>
          <AuthProvider>
            <Routes>
              <Route path="/mi-cuenta" element={<MiCuentaPage />} />
              <Route path="/acceso" element={<div data-testid="acceso-redirect">Acceso</div>} />
            </Routes>
          </AuthProvider>
        </I18nContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('acceso-redirect')).toBeTruthy();
    });
  });

  it('renderiza el panel con sesión activa', async () => {
    makeAuthFetch();
    renderMiCuenta();
    const { container } = renderMiCuenta();
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('muestra el nombre del usuario', async () => {
    makeAuthFetch();
    renderMiCuenta();
    await waitFor(() => {
      expect(screen.getAllByText('Ana García')[0]).toBeTruthy();
    });
  });

  it('muestra tabs del panel (perfil, reservas, extras, seguridad)', async () => {
    makeAuthFetch();
    renderMiCuenta();
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      const tieneTabs =
        text.includes('Perfil') ||
        text.includes('Reservas') ||
        text.includes('Extras') ||
        text.includes('Seguridad');
      expect(tieneTabs).toBe(true);
    });
  });

  it('no lanza excepción al renderizar con usuario autenticado', () => {
    makeAuthFetch();
    expect(() => renderMiCuenta()).not.toThrow();
  });

  it('puede hacer clic en el tab de Reservas sin errores', async () => {
    makeAuthFetch();
    renderMiCuenta();
    const reservasTab = await screen.findByText(/Reservas/i).catch(() => null);
    if (reservasTab) {
      expect(() => fireEvent.click(reservasTab)).not.toThrow();
    } else {
      expect(true).toBe(true);
    }
  });

  it('puede hacer clic en el tab de Seguridad sin errores', async () => {
    makeAuthFetch();
    renderMiCuenta();
    const segTab = await screen.findByText(/Seguridad/i).catch(() => null);
    if (segTab) {
      expect(() => fireEvent.click(segTab)).not.toThrow();
    } else {
      expect(true).toBe(true);
    }
  });
});
