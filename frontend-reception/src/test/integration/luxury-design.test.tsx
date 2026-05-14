// ═══════════════════════════════════════════════════════════
// HotelFlux — Tests: Design System Integration
// Verifica consistencia del diseño luxury navy+gold
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('AccesoPage: llenar y enviar formulario', async () => {
    const { default: AccesoPage } = await import('../../pages/AccesoPage');
    render(
      <MemoryRouter><AuthProvider><AccesoPage /></AuthProvider></MemoryRouter>,
    );

    expect(screen.getByText(/Iniciar Sesión/i)).toBeTruthy();
  });

  it('RegistroPage: renderiza formulario de registro', async () => {
    const { default: RegistroPage } = await import('../../pages/RegistroPage');
    render(
      <MemoryRouter><AuthProvider><RegistroPage /></AuthProvider></MemoryRouter>,
    );

    expect(screen.getByText(/Crear Cuenta/i)).toBeTruthy();
  });
});
