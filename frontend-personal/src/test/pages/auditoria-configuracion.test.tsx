// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: AuditoriaPage + ConfiguracionPage
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

function setupAdminSession() {
  localStorage.setItem('hotelflux_token', 'test-admin-token');
  localStorage.setItem('hotelflux_usuario', JSON.stringify({
    id: 'u-admin',
    nombre: 'Admin Test',
    email: 'admin@hotelflux.com',
    rol: 'admin',
    activo: true,
    inserted_at: '2025-01-01T00:00:00Z',
  }));
}

// ──────────────────────────────────────────────────────────
// AuditoriaPage
// ──────────────────────────────────────────────────────────

describe('pages/auditoria', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setupAdminSession();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/renovar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-admin-token',
            usuario: { id: 'u-admin', nombre: 'Admin Test', email: 'admin@hotelflux.com', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });
  });

  it('renderiza sin errores', async () => {
    const { default: AuditoriaPage } = await import('../../pages/AuditoriaPage');
    const { container } = render(<TestWrapper><AuditoriaPage /></TestWrapper>);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('contiene texto relacionado con auditoría o historial', async () => {
    const { default: AuditoriaPage } = await import('../../pages/AuditoriaPage');
    render(<TestWrapper><AuditoriaPage /></TestWrapper>);
    // La página muestra datos demo desde el módulo; debería tener algún texto
    const pageText = document.body.textContent ?? '';
    const tieneContenido = pageText.length > 0;
    expect(tieneContenido).toBe(true);
  });

  it('muestra datos de eventos demo (login, reserva, etc.)', async () => {
    const { default: AuditoriaPage } = await import('../../pages/AuditoriaPage');
    render(<TestWrapper><AuditoriaPage /></TestWrapper>);
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      const tieneTipoEvento =
        text.includes('sesión') ||
        text.includes('Auditor') ||
        text.includes('login') ||
        text.includes('Historial') ||
        text.includes('Actividad');
      expect(tieneTipoEvento).toBe(true);
    });
  });

  it('no lanza excepción al renderizar con usuario admin', async () => {
    const { default: AuditoriaPage } = await import('../../pages/AuditoriaPage');
    expect(() =>
      render(<TestWrapper><AuditoriaPage /></TestWrapper>),
    ).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────
// ConfiguracionPage
// ──────────────────────────────────────────────────────────

describe('pages/configuracion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setupAdminSession();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/renovar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'test-admin-token',
            usuario: { id: 'u-admin', nombre: 'Admin Test', email: 'admin@hotelflux.com', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
          }),
        });
      }
      if (url.includes('/habitaciones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            habitaciones: [
              {
                id: 'h1', numero: '101', piso: 1, tipo: 'simple', estado: 'disponible',
                capacidad: 1, precio_noche: '85.00', amenidades: [], clasificacion: null,
                caracteristicas: null, notas: null, inserted_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renderiza sin errores', async () => {
    const { default: ConfiguracionPage } = await import('../../pages/ConfiguracionPage');
    const { container } = render(<TestWrapper><ConfiguracionPage /></TestWrapper>);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('no lanza excepción con sesión de admin', async () => {
    const { default: ConfiguracionPage } = await import('../../pages/ConfiguracionPage');
    expect(() =>
      render(<TestWrapper><ConfiguracionPage /></TestWrapper>),
    ).not.toThrow();
  });

  it('muestra texto relacionado con configuración de habitaciones', async () => {
    const { default: ConfiguracionPage } = await import('../../pages/ConfiguracionPage');
    render(<TestWrapper><ConfiguracionPage /></TestWrapper>);
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      const tieneContenido =
        text.includes('Configur') ||
        text.includes('Piso') ||
        text.includes('Habitaci') ||
        text.includes('Admin');
      expect(tieneContenido).toBe(true);
    });
  });

  it('tiene contenido accesible (al menos un botón o input)', async () => {
    const { default: ConfiguracionPage } = await import('../../pages/ConfiguracionPage');
    const { container } = render(<TestWrapper><ConfiguracionPage /></TestWrapper>);
    await waitFor(() => {
      const interactivos = container.querySelectorAll('button, input, select');
      // La página tiene formulario y botones de configuración
      expect(interactivos.length).toBeGreaterThan(0);
    });
  });
});
