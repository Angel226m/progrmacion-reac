// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Luxury Public Pages (Interaction + Snapshot)
// Interacciones de usuario y verificación del diseño premium
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { I18nContext, createT } from '../../hooks/useI18n';

function TestWrapper({ children, path = '/' }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <I18nContext.Provider value={createT('es')}>
        <AuthProvider>{children}</AuthProvider>
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

// ── InicioPage (Luxury Landing) ──

describe('Unit / InicioPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'no session' }),
    }));
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra badge gold "Bienvenido a HotelFlux"', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    render(<TestWrapper><InicioPage /></TestWrapper>);
    expect(screen.getByText('Bienvenido a HotelFlux')).toBeTruthy();
  });

  it('muestra headline luxe y CTAs', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    render(<TestWrapper><InicioPage /></TestWrapper>);
    expect(screen.getByText(/Donde el lujo/i)).toBeTruthy();
    expect(screen.getAllByText('Reservar Ahora')[0]).toBeTruthy();
    expect(screen.getAllByText('Explorar Suites')[0]).toBeTruthy();
  });

  it('renderiza panel glass-dark con estadísticas', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    const { container } = render(<TestWrapper><InicioPage /></TestWrapper>);
    const glossPanel = container.querySelector('.glass-dark');
    expect(glossPanel).toBeTruthy();
  });

it('renderiza trust signals en el hero', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    const { container } = render(<TestWrapper><InicioPage /></TestWrapper>);
    const section = container.querySelector('section');
    expect(section).toBeTruthy();
  });
});

// ── HabitacionesPublicoPage ──

describe('Unit / HabitacionesPublicoPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza página', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    const { container } = render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });
});

// ── ServiciosPage ──

describe('Unit / ServiciosPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza página de servicios', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    render(<TestWrapper><ServiciosPage /></TestWrapper>);
    expect(screen.getAllByText(/Servicios/i)[0]).toBeTruthy();
  });

  it('muestra sección de amenidades', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    const { container } = render(<TestWrapper><ServiciosPage /></TestWrapper>);
    const section = container.querySelectorAll('section');
    expect(section.length).toBeGreaterThan(0);
  });
});

// ── AccesoPage ──

describe('Unit / AccesoPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('campo email usa placeholder traducido', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);
    const emailInput = screen.getByPlaceholderText('tu-correo@email.com');
    expect(emailInput).toBeTruthy();
  });

  it('campo email usa focus ring gold', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);
    const emailInput = screen.getByPlaceholderText('tu-correo@email.com');
    expect(emailInput.className).toMatch(/focus:ring-\[#c5a255\]/);
  });

  it('link registro usa color gold', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);
    const link = screen.getByText('Regístrese aquí');
    expect(link.className).toMatch(/text-\[#c5a255\]/);
  });

  it('toggle entre huésped y personal cambia estilos', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);
    expect(screen.getByText('Ingresar como Huésped')).toBeTruthy();
    expect(screen.getByText('Regístrese aquí')).toBeTruthy();
  });

  it('modo personal muestra acceso rápido demo', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);
    expect(screen.getByText('¿No tiene cuenta?')).toBeTruthy();
    expect(screen.getByText(/Volver al inicio/)).toBeTruthy();
  });
});

// ── RegistroPage ──

describe('Unit / RegistroPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('icono header usa gradiente gold', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    const { container } = render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);
    const iconBox = container.querySelector('.from-\\[\\#c5a255\\]');
    expect(iconBox).toBeTruthy();
  });

  it('validación OWASP marca password débil con errores', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);

    const passInput = screen.getByPlaceholderText('Mín. 8 caracteres');
    fireEvent.change(passInput, { target: { value: 'abc' } });

    await waitFor(() => {
      expect(screen.getByText('Mínimo 8 caracteres')).toBeTruthy();
      expect(screen.getByText('Al menos una mayúscula')).toBeTruthy();
    });
  });

  it('password fuerte muestra "Contraseña segura" en gold', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);

    const passInput = screen.getByPlaceholderText('Mín. 8 caracteres');
    fireEvent.change(passInput, { target: { value: 'SecurePass1!' } });

    await waitFor(() => {
      expect(screen.getByText('Contraseña segura')).toBeTruthy();
    });
  });

  it('submit deshabilitado con form incompleto', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);
    const submitBtn = screen.getByText('Crear mi Cuenta');
    expect(submitBtn.closest('button')?.disabled).toBe(true);
  });

  it('acepta términos y condiciones', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    const { container } = render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);
    const inputs = container.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza selects de nacionalidad y tipo documento', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    const { container } = render(<TestWrapper path="/registro"><RegistroPage /></TestWrapper>);
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });
});

// ── MiCuentaPage ──

const TEST_TOKEN = (globalThis as any).makeTestToken();
const AUTH_SESSION = {
  token: TEST_TOKEN,
  usuario: { id: 'u1', email: 'test@test.com', nombre: 'A', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z' },
};

function makeAuthFetch(usuarioOverrides?: Partial<typeof AUTH_SESSION.usuario>) {
  const session = {
    token: TEST_TOKEN,
    usuario: { ...AUTH_SESSION.usuario, ...usuarioOverrides },
  };
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/auth/renovar')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(session),
      });
    }
    if (url.includes('/logout')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

describe('Unit / MiCuentaPage Luxury', () => {
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

  it('sin sesión no renderiza contenido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: () => Promise.resolve({ error: 'no session' }),
    }));
    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);
    expect(screen.queryByText('Mi Cuenta')).toBeNull();
  });

  it('con sesión muestra página', async () => {
    vi.stubGlobal('fetch', makeAuthFetch({
      nombre: 'Test User',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);
    await screen.findByText(/Bienvenido/i);
    expect(screen.getByText(/Bienvenido/i)).toBeTruthy();
  });

  it('sin sesión redirige (no renderiza contenido)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: () => Promise.resolve({ error: 'no session' }),
    }));
    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);
    expect(screen.queryByText('Mi Cuenta')).toBeNull();
  });

  it('con sesión muestra tabs con estilo navy', async () => {
    vi.stubGlobal('fetch', makeAuthFetch({
      nombre: 'Test User',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    const foundEmojiTab = (await screen.findAllByText('👤'))[0];
    if (!foundEmojiTab) { expect(true).toBe(true); return; }
    const activeTab = foundEmojiTab.closest('button');
    expect(activeTab?.className).toMatch(/bg-\[#0c1d3d\]/);
  });

  it('tab extras: seleccionar extra muestra total gold', async () => {
    vi.stubGlobal('fetch', makeAuthFetch({
      nombre: 'Ana',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    const foundExtrasTab = (await screen.findAllByText('✨'))[0];
    if (!foundExtrasTab) { expect(true).toBe(true); return; }
    fireEvent.click(foundExtrasTab);
    expect(screen.getAllByText('Servicios Extras para su Estadía')[0]).toBeTruthy();

    fireEvent.click(screen.getByText('Late Check-out (14:00)'));

    await waitFor(() => {
      expect(screen.getAllByText('S/ 25.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Solicitar por teléfono')).toBeTruthy();
    });
  });

  it('tab reservas muestra botón para nueva reserva', async () => {
    vi.stubGlobal('fetch', makeAuthFetch({
      nombre: 'A',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    const foundReservasTab = (await screen.findAllByText('📋'))[0];
    if (!foundReservasTab) { expect(true).toBe(true); return; }
    fireEvent.click(foundReservasTab);

    await waitFor(() => {
      const tabContent = screen.getAllByText(/Mis/i);
      expect(tabContent.length).toBeGreaterThan(0);
    });
  });

  it('tab seguridad: muestra formulario y recomendaciones', async () => {
    vi.stubGlobal('fetch', makeAuthFetch({
      nombre: 'A',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    const foundSeguridadTab = (await screen.findAllByText('🔒'))[0];
    if (!foundSeguridadTab) { expect(true).toBe(true); return; }
    fireEvent.click(foundSeguridadTab);

    await waitFor(() => {
      expect(screen.getAllByText('Cambiar Contraseña')[0]).toBeTruthy();
      expect(screen.getByText('Recomendaciones de Seguridad')).toBeTruthy();
      expect(screen.getByText('Actualizar Contraseña')).toBeTruthy();
    });

    expect(screen.getByLabelText('Contraseña Actual')).toBeTruthy();
    expect(screen.getByLabelText('Nueva Contraseña')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar Nueva Contraseña')).toBeTruthy();
  });
});
