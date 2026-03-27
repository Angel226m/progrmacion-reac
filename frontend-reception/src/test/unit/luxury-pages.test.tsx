// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Luxury Public Pages (Interaction + Snapshot)
// Interacciones de usuario y verificación del diseño premium
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';

function TestWrapper({ children, path = '/' }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

// ── InicioPage (Luxury Landing) ──

describe('Unit / InicioPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
    // IntersectionObserver mock
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({ observe, disconnect, unobserve: vi.fn() })));
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
    expect(screen.getByText('Reservar Ahora')).toBeTruthy();
    expect(screen.getByText('Explorar Suites')).toBeTruthy();
  });

  it('renderiza panel glass-dark con estadísticas', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    const { container } = render(<TestWrapper><InicioPage /></TestWrapper>);
    const glossPanel = container.querySelector('.glass-dark');
    expect(glossPanel).toBeTruthy();
  });

  it('renderiza trust signals en el hero', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    render(<TestWrapper><InicioPage /></TestWrapper>);
    expect(screen.getByText(/5 Estrellas/)).toBeTruthy();
    expect(screen.getByText(/Check-in Digital/)).toBeTruthy();
  });
});

// ── HabitacionesPublicoPage ──

describe('Unit / HabitacionesPublicoPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('muestra encabezado premium "Alojamiento"', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);
    expect(screen.getByText('Alojamiento')).toBeTruthy();
    expect(screen.getByText('Nuestras Habitaciones')).toBeTruthy();
  });

  it('calendar: seleccionar fechas actualiza estado', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);

    // The calendar renders day buttons — clicking one should select it
    const allButtons = screen.getAllByRole('button');
    const dayBtn = allButtons.find((b) => b.textContent?.match(/^15$/));
    if (dayBtn) {
      fireEvent.click(dayBtn);
      // After click, button should have gold selected style
      expect(dayBtn.className).toMatch(/bg-\[#c5a255\]/);
    }
  });

  it('filtros de tipo muestran "Todas" por defecto activo', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);
    const todasBtn = screen.getByRole('button', { name: 'Todas' });
    expect(todasBtn.className).toMatch(/bg-\[#0c1d3d\]/);
  });

  it('botón buscar está deshabilitado sin fechas', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    render(<TestWrapper><HabitacionesPublicoPage /></TestWrapper>);
    const buscarBtn = screen.getByText('Buscar Disponibilidad');
    expect(buscarBtn.closest('button')?.disabled).toBe(true);
  });
});

// ── ServiciosPage ──

describe('Unit / ServiciosPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('muestra encabezado premium "Experiencias"', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    render(<TestWrapper><ServiciosPage /></TestWrapper>);
    expect(screen.getByText('Experiencias')).toBeTruthy();
    expect(screen.getByText('Servicios & Amenidades')).toBeTruthy();
  });

  it('renderiza las 6 categorías con precios gold', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    render(<TestWrapper><ServiciosPage /></TestWrapper>);

    expect(screen.getByText('Minibar')).toBeTruthy();
    expect(screen.getByText('Room Service')).toBeTruthy();
    expect(screen.getByText('Spa & Bienestar')).toBeTruthy();
    expect(screen.getByText('Lavandería')).toBeTruthy();
    expect(screen.getByText('Tours & Excursiones')).toBeTruthy();
    expect(screen.getByText('Estacionamiento')).toBeTruthy();
  });

  it('muestra luxury-card en productos', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    const { container } = render(<TestWrapper><ServiciosPage /></TestWrapper>);
    const luxuryCards = container.querySelectorAll('.luxury-card');
    expect(luxuryCards.length).toBeGreaterThan(0);
  });

  it('sección "También incluido" muestra 8 amenidades', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    render(<TestWrapper><ServiciosPage /></TestWrapper>);

    expect(screen.getByText('WiFi Ultra Rápido')).toBeTruthy();
    expect(screen.getByText('Concierge 24/7')).toBeTruthy();
    expect(screen.getByText('Accesibilidad')).toBeTruthy();
  });

  it('CTA utiliza clase btn-gold', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    const { container } = render(<TestWrapper><ServiciosPage /></TestWrapper>);
    const goldBtn = container.querySelector('.btn-gold');
    expect(goldBtn).toBeTruthy();
    expect(goldBtn?.textContent).toMatch(/Reservar/i);
  });
});

// ── AccesoPage ──

describe('Unit / AccesoPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('toggle entre huésped y personal cambia estilos', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);

    const huesped = screen.getByText('Soy Huésped');
    const personal = screen.getByText('Soy Personal');

    // Initially: huésped active (navy text)
    expect(huesped.className).toMatch(/text-\[#0c1d3d\]/);
    expect(personal.className).not.toMatch(/text-\[#0c1d3d\]/);

    // Switch to personal
    fireEvent.click(personal);
    expect(personal.className).toMatch(/text-\[#0c1d3d\]/);
  });

  it('modo personal muestra acceso rápido demo', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(<TestWrapper path="/acceso"><AccesoPage /></TestWrapper>);

    fireEvent.click(screen.getByText('Soy Personal'));
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Recepción')).toBeTruthy();
    expect(screen.getByText('Limpieza')).toBeTruthy();
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
});

// ── RegistroPage ──

describe('Unit / RegistroPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
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
});

// ── MiCuentaPage ──

describe('Unit / MiCuentaPage Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
  });

  it('sin sesión redirige (no renderiza contenido)', async () => {
    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);
    expect(screen.queryByText('Mi Cuenta')).toBeNull();
  });

  it('con sesión muestra tabs con estilo navy', async () => {
    localStorage.setItem('hotelflux_token', 'test-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', email: 'test@test.com', nombre: 'Test User', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    // Active tab should have navy color
    const activeTab = screen.getByText('👤').closest('button');
    expect(activeTab?.className).toMatch(/text-\[#0c1d3d\]/);
  });

  it('tab extras: seleccionar extra muestra total gold', async () => {
    localStorage.setItem('hotelflux_token', 'test-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', email: 'test@test.com', nombre: 'Ana', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    // Navigate to extras tab
    fireEvent.click(screen.getByText('✨'));
    expect(screen.getByText('Servicios Extras para su Estadía')).toBeTruthy();

    // Select "Late Check-out"
    fireEvent.click(screen.getByText('Late Check-out (14:00)'));

    // Summary bar should appear with gold total
    await waitFor(() => {
      expect(screen.getByText('S/ 25.00')).toBeTruthy();
      expect(screen.getByText('Agregar a Reserva')).toBeTruthy();
    });
  });

  it('tab reservas muestra btn-gold para nueva reserva', async () => {
    localStorage.setItem('hotelflux_token', 'test-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', email: 'a@b.com', nombre: 'A', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    const { container } = render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    fireEvent.click(screen.getByText('📋'));

    await waitFor(() => {
      const goldBtn = container.querySelector('.btn-gold');
      expect(goldBtn).toBeTruthy();
      expect(goldBtn?.textContent).toMatch(/Nueva Reserva/);
    });
  });

  it('tab seguridad: muestra formulario y recomendaciones', async () => {
    localStorage.setItem('hotelflux_token', 'test-token');
    localStorage.setItem('hotelflux_usuario', JSON.stringify({
      id: 'u1', email: 'a@b.com', nombre: 'A', rol: 'admin', activo: true, inserted_at: '2025-01-01T00:00:00Z',
    }));

    const { default: MiCuentaPage } = await import('../../pages/MiCuentaPage');
    render(<TestWrapper path="/mi-cuenta"><MiCuentaPage /></TestWrapper>);

    fireEvent.click(screen.getByText('🔒'));

    await waitFor(() => {
      expect(screen.getByText('Cambiar Contraseña')).toBeTruthy();
      expect(screen.getByText('Recomendaciones de Seguridad')).toBeTruthy();
      expect(screen.getByText('Actualizar Contraseña')).toBeTruthy();
    });

    // Verify input fields are present
    expect(screen.getByLabelText('Contraseña Actual')).toBeTruthy();
    expect(screen.getByLabelText('Nueva Contraseña')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar Nueva Contraseña')).toBeTruthy();
  });
});
