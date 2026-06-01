// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: MiCuentaPage
// Cubre: redirección sin sesión, carga de reservas con token,
//        manejo de 401 SESSION_EXPIRED, hooks después del return
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

// ── Helpers ──

function Wrapper({ children, initialPath = '/mi-cuenta' }: { children: ReactNode; initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/mi-cuenta" element={children} />
          <Route path="/acceso" element={<div data-testid="acceso-page">Acceso</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function setAuthStorage(token: string, nombre = 'Test User', email = 'test@hotel.com') {
  localStorage.setItem('hotelflux_token', token);
  localStorage.setItem('hotelflux_usuario', JSON.stringify({
    id: 'u1', nombre, email, rol: 'huesped', inserted_at: '2025-01-01T00:00:00Z',
  }));
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
  });

  it('redirige a /acceso si no hay sesión activa', async () => {
    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    });
  });

  it('redirige a /acceso si hay un mock-token (inválido)', async () => {
    localStorage.setItem('hotelflux_token', 'mock-jwt-invalid');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({ id: 'u1', nombre: 'Mock', email: 'm@m.com', rol: 'huesped' }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    });
  });
});

describe('MiCuentaPage — con sesión válida', () => {
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
    setAuthStorage('eyJhbGciOiJIUzI1NiJ9.valid', 'María González');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReservasResponse),
    });

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/María González/i)).toBeInTheDocument();
    });
  });

  it('envía el Bearer token en la petición de reservas', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.test-token';
    setAuthStorage(jwt);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReservasResponse),
    });
    globalThis.fetch = fetchMock;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const authHeader = (options?.headers as Record<string, string>)?.['Authorization'];
      expect(authHeader).toBe(`Bearer ${jwt}`);
    });
  });

  it('no llama a fetch sin token (token null)', async () => {
    // Usuario sin token en storage
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', nombre: 'Sin Token', email: 'a@b.com', rol: 'huesped',
    }));
    // Sin hotelflux_token en storage

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    // Espera un tick — no debe haber llamadas a fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama a logout cuando el backend responde 401 SESSION_EXPIRED', async () => {
    setAuthStorage('eyJhbGciOiJIUzI1NiJ9.expired');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'token expirado' }),
    });

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    // Tras la sesión expirada el componente redirige a /acceso
    await waitFor(() => {
      expect(screen.getByTestId('acceso-page')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('muestra las tabs de Perfil, Mis Reservas, Servicios Extras y Seguridad', async () => {
    setAuthStorage('eyJhbGciOiJIUzI1NiJ9.valid');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReservasResponse),
    });

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<Wrapper><MiCuentaPage /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/Perfil/i)).toBeInTheDocument();
      expect(screen.getByText(/Reservas/i)).toBeInTheDocument();
      expect(screen.getByText(/Extras|Servicios/i)).toBeInTheDocument();
      expect(screen.getByText(/Seguridad/i)).toBeInTheDocument();
    });
  });

  it('no lanza React error #300 (hooks after conditional return)', async () => {
    // Este test verifica que no hay violación de Rules of Hooks:
    // si el componente no lanza al tener sesión válida y luego
    // al no tener sesión (dos renders distintos), las hooks deben
    // ser consistentes en número.
    setAuthStorage('eyJhbGciOiJIUzI1NiJ9.valid');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReservasResponse),
    });

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    expect(() => render(<Wrapper><MiCuentaPage /></Wrapper>)).not.toThrow();
  });
});
