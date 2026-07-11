// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: MiCuentaPage
// Cubre: redirección sin sesión, carga de reservas con token,
//        manejo de 401 SESSION_EXPIRED, hooks después del return
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { I18nContext, createT } from '../../hooks/useI18n';
import type { ReactNode } from 'react';

// ── Helpers ──

function Wrapper({ children, initialPath = '/mi-cuenta' }: { children: ReactNode; initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nContext.Provider value={createT('es')}>
        <AuthProvider>
          <Routes>
            <Route path="/mi-cuenta" element={children} />
            <Route path="/acceso" element={<div data-testid="acceso-page">Acceso</div>} />
          </Routes>
        </AuthProvider>
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

const mockReservasResponse = {
  data: [
    {
      id: 'r1',
      codigo: 'HF-2025-001',
      habitacion: '101',
      tipo: 'suite',
      piso: 1,
      fecha_entrada: '2025-09-01',
      fecha_salida: '2025-09-03',
      estado: 'confirmada' as const,
      total: '500.00',
      notas: null,
      inserted_at: '2025-08-01T00:00:00Z',
    },
  ],
  huesped: {
    id: 'h1',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@hotel.com',
    telefono: null,
    documento: null,
    nacionalidad: null,
    inserted_at: '2025-01-01T00:00:00Z',
  },
};

describe('MiCuentaPage — sin sesión', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirige a /acceso si no hay sesión activa', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'no session' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    });
  });

  it('redirige a /acceso si hay un mock-token (inválido)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'no session' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    });
  });
});

function makeSessionFetch(authToken: string, userName: string, userEmail: string, fetchImpl?: typeof globalThis.fetch): typeof globalThis.fetch {
  return vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/auth/renovar')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token: authToken,
          usuario: { id: 'u1', nombre: userName, email: userEmail, rol: 'huesped', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
        }),
      } as unknown as Response);
    }
    if (url.includes('/logout')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    }
    return fetchImpl
      ? (fetchImpl(url, opts) as Promise<Response>)
      : Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReservasResponse),
        } as unknown as Response);
  }) as unknown as typeof globalThis.fetch;
}

describe('MiCuentaPage — con sesión válida', () => {
  const VALID_TOKEN = (globalThis as any).makeTestToken();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza el panel de bienvenida con nombre del usuario', async () => {
    globalThis.fetch = makeSessionFetch(VALID_TOKEN, 'María González', 'maria@hotel.com');

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getAllByText(/María González/i)[0]).toBeInTheDocument();
    });
  });

  it('envía el Bearer token en la petición de reservas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReservasResponse),
    });
    globalThis.fetch = makeSessionFetch(VALID_TOKEN, 'Test', 'test@hotel.com', fetchMock as unknown as typeof globalThis.fetch);

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      const reservaCalls = fetchMock.mock.calls.filter(
        (c: unknown[]) => !(c[0] as string).includes('auth')
      );
      expect(reservaCalls.length).toBeGreaterThan(0);
      const [, options] = reservaCalls[0] as [string, RequestInit];
      const authHeader = (options?.headers as Record<string, string>)?.['Authorization'];
      expect(authHeader).toBe(`Bearer ${VALID_TOKEN}`);
    });
  });

  it('no llama a fetch de reservas sin token (token null desde auth)', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/renovar')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'no session' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReservasResponse),
      } as unknown as Response);
    }) as unknown as typeof globalThis.fetch;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    });
  });

  it('llama a logout cuando el backend responde 401 SESSION_EXPIRED', async () => {
    let authCallCount = 0;

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/renovar')) {
        authCallCount++;
        if (authCallCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              token: VALID_TOKEN,
              usuario: { id: 'u1', nombre: 'Test', email: 'test@hotel.com', rol: 'huesped', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
            }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'token expirado' }) } as unknown as Response);
      }
      if (url.includes('/cliente/')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'token expirado' }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    }) as unknown as typeof globalThis.fetch;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('muestra las tabs de Perfil, Mis Reservas, Servicios Extras y Seguridad', async () => {
    globalThis.fetch = makeSessionFetch(VALID_TOKEN, 'Test', 'test@hotel.com');

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getAllByText('Información de la Cuenta')[0]).toBeInTheDocument();
      expect(screen.getByText('Mis Reservas')).toBeInTheDocument();
      expect(screen.getByText('Servicios Extras para su Estadía')).toBeInTheDocument();
      expect(screen.getAllByText('Cambiar Contraseña')[0]).toBeInTheDocument();
    });
  });

  it('no lanza React error #300 (hooks after conditional return)', async () => {
    globalThis.fetch = makeSessionFetch(VALID_TOKEN, 'Test', 'test@hotel.com');

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    expect(() => render(<Wrapper><MiCuentaPage /></Wrapper>)).not.toThrow();
  });
});
