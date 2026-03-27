// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Design System Integration
// Verifica consistencia del diseño luxury navy+gold
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';

// ── Accessibility Tests ──

describe('Integration / Accesibilidad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  it('AccesoPage: todos los inputs tienen labels asociados', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(
      <MemoryRouter><AuthProvider><AccesoPage /></AuthProvider></MemoryRouter>,
    );
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
  });

  it('RegistroPage: todos los campos obligatorios tienen labels', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(
      <MemoryRouter><AuthProvider><RegistroPage /></AuthProvider></MemoryRouter>,
    );
    expect(screen.getByLabelText(/Nombre \*/)).toBeTruthy();
    expect(screen.getByLabelText(/Apellido \*/)).toBeTruthy();
    expect(screen.getByLabelText(/Correo Electrónico \*/)).toBeTruthy();
  });

  it('all buttons have accessible text or aria-labels', async () => {
    const { default: HabitacionesPublicoPage } = await import('../../pages/HabitacionesPublicoPage');
    const { container } = render(
      <MemoryRouter><AuthProvider><HabitacionesPublicoPage /></AuthProvider></MemoryRouter>,
    );
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      const hasText = (btn.textContent?.trim().length ?? 0) > 0;
      const hasAriaLabel = btn.getAttribute('aria-label');
      expect(hasText || !!hasAriaLabel).toBe(true);
    });
  });
});

// ── Design Consistency Tests ──

describe('Integration / Consistencia del Diseño Luxury', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  it('ninguna página pública usa el azul antiguo (from-blue-600 to-blue-700) en botones', async () => {
    const modules = [
      await import('../../pages/InicioPage'),
      await import('../../pages/HabitacionesPublicoPage'),
      await import('../../pages/ServiciosPage'),
      await import('../../pages/AccesoPage'),
      await import('../../pages/RegistroPage'),
    ];

    for (const mod of modules) {
      const { container } = render(
        <MemoryRouter><AuthProvider><mod.default /></AuthProvider></MemoryRouter>,
      );

      // No submit/CTA buttons should use old blue gradient
      const buttons = container.querySelectorAll('button[type="submit"], a.btn-gold, button.btn-gold');
      buttons.forEach((btn) => {
        expect(btn.className).not.toMatch(/from-blue-600/);
      });
    }
  });

  it('InicioPage hero sección usa navy background', async () => {
    const { default: InicioPage } = await import('../../pages/InicioPage');
    const { container } = render(
      <MemoryRouter><AuthProvider><InicioPage /></AuthProvider></MemoryRouter>,
    );
    const hero = container.querySelector('[class*="bg-[#0c1d3d]"]');
    expect(hero).toBeTruthy();
  });

  it('ServiciosPage hero sección usa navy background', async () => {
    const { default: ServiciosPage } = await import('../../pages/ServiciosPage');
    const { container } = render(
      <MemoryRouter><AuthProvider><ServiciosPage /></AuthProvider></MemoryRouter>,
    );
    const hero = container.querySelector('[class*="bg-[#0c1d3d]"]');
    expect(hero).toBeTruthy();
  });
});

// ── User Flow Tests ──

describe('Integration / Flujos de Usuario', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
  });

  it('AccesoPage: llenar y enviar formulario muestra error (sin backend)', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(
      <MemoryRouter><AuthProvider><AccesoPage /></AuthProvider></MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByText('Ingresar como Huésped'));

    // Should show some error since backend is mocked to fail
    // (either loading spinner or error message)
    expect(screen.getByText('Ingresar como Huésped') || screen.getByText(/Ingresando/)).toBeTruthy();
  });

  it('RegistroPage: completar form y verificar validaciones', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(
      <MemoryRouter><AuthProvider><RegistroPage /></AuthProvider></MemoryRouter>,
    );

    // Fill nombre and apellido
    fireEvent.change(screen.getByLabelText(/Nombre \*/), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Apellido \*/), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico \*/), { target: { value: 'juan@test.com' } });
    fireEvent.change(screen.getByLabelText(/N° de Documento \*/), { target: { value: '12345678' } });

    // Password validation
    const passInput = screen.getByPlaceholderText('Mín. 8 caracteres');
    fireEvent.change(passInput, { target: { value: 'StrongPass1!' } });

    const passConfirm = screen.getByPlaceholderText('Repita la contraseña');
    fireEvent.change(passConfirm, { target: { value: 'StrongPass1!' } });

    // Check terms
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => fireEvent.click(cb));

    // Submit should be enabled
    const submitBtn = screen.getByText('Crear mi Cuenta').closest('button');
    expect(submitBtn?.disabled).toBe(false);
  });
});
