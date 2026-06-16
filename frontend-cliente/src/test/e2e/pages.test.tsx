// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Páginas Públicas (E2E-like)
// Renderizado de páginas del sitio público del hotel
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';

// Wrapper para tests con rutas
function TestWrapper({ children, path = '/' }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('E2E / Páginas Públicas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('InicioPage renderiza hero y secciones principales', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    render(<TestWrapper><InicioPage /></TestWrapper>);

    expect(screen.getByText(/HotelFlux/i)).toBeTruthy();
  });

  it('HabitacionesPublicoPage renderiza calendario y buscador', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);

    expect(screen.getAllByText(/Habitaciones/i)[0]).toBeTruthy();
  });

  it('ServiciosPage renderiza categorías de servicio', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    render(<TestWrapper><ServiciosPage /></TestWrapper>);

    expect(screen.getAllByText(/Servicios/i)[0]).toBeTruthy();
  });

  it('AccesoPage renderiza formulario con toggle cliente/personal', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);

    expect(screen.getByText('Iniciar Sesión')).toBeTruthy();
    expect(screen.getByText('Soy Huésped')).toBeTruthy();
    expect(screen.getByText('Soy Personal')).toBeTruthy();
  });

  it('RegistroPage renderiza formulario completo', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);

    expect(screen.getByText('Crear Cuenta')).toBeTruthy();
    expect(screen.getByLabelText(/Nombre/)).toBeTruthy();
    expect(screen.getByLabelText(/Apellido/)).toBeTruthy();
    expect(screen.getByLabelText(/Correo Electrónico/)).toBeTruthy();
    expect(screen.getByLabelText(/Tipo de Documento/)).toBeTruthy();
  });

  it('LegalPage muestra contenido de privacidad con fallback', async () => {
    const { default: LegalPage } = await import('../../pages/LegalPage');
    render(
      <TestWrapper path="/legal/privacidad">
        <LegalPage />
      </TestWrapper>,
    );

    // Espera al fallback (error de red → contenido estático)
    const title = await screen.findAllByText(/Política de Privacidad/i, {}, { timeout: 3000 });
    expect(title[0]).toBeTruthy();
  });

  it('ReservaClientePage renderiza paso de búsqueda', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    render(<TestWrapper path="/reservar"><ReservaClientePage /></TestWrapper>);

    expect(screen.getByText(/Tu estancia perfecta/i)).toBeTruthy();
  });
});

describe('E2E / Páginas Admin (protegidas)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('MiCuentaPage sin sesión redirige a acceso', async () => {
    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    // Should navigate away (not show account content)
    expect(screen.queryByText('Mi Cuenta')).toBeNull();
  });

  it('MiCuentaPage con sesión muestra perfil', async () => {
    const token = (globalThis as any).makeTestToken();
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/auth/renovar')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token,
            usuario: { id: 'u1', email: 'test@test.com', nombre: 'Test User', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    await screen.findByText(/Bienvenido/i);
    expect(screen.getAllByText(/Test User/)[0]).toBeTruthy();
  });
});
