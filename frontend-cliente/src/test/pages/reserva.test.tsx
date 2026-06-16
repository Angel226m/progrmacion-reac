// ═══════════════════════════════════════════════════════════
// HotelFlux (Cliente) — Tests: ReservaClientePage
// Flujo de reserva pública en 4 pasos
// ═══════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/reservar']}>
      <AuthProvider>
        <Routes>
          <Route path="/reservar" element={children} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockDisponibilidad = {
  data: {
    habitaciones: [
      {
        id: 'h1',
        numero: '101',
        tipo: 'suite',
        piso: 1,
        capacidad: 2,
        precio_noche: '250.00',
        amenidades: ['wifi', 'minibar'],
        descripcion: 'Suite con vista al mar',
        fotos: [],
      },
    ],
    total: 1,
    fecha_entrada: '2025-08-01',
    fecha_salida: '2025-08-03',
    noches: 2,
  },
};

describe('pages/reserva (ReservaClientePage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/servicios')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDisponibilidad),
      });
    });
  });

  it('renderiza sin errores', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    const { container } = render(
      <TestWrapper><ReservaClientePage /></TestWrapper>,
    );
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('muestra el formulario de búsqueda inicial (paso 1)', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    render(<TestWrapper><ReservaClientePage /></TestWrapper>);
    await waitFor(() => {
      const text = document.body.textContent ?? '';
      // El primer paso tiene selección de fechas o texto de búsqueda
      const tieneBusqueda =
        text.includes('fecha') ||
        text.includes('Fecha') ||
        text.includes('Buscar') ||
        text.includes('Disponib') ||
        text.includes('Huéspedes') ||
        text.includes('Reserv');
      expect(tieneBusqueda).toBe(true);
    });
  });

  it('tiene inputs de fecha o cantidad de huéspedes', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    const { container } = render(<TestWrapper><ReservaClientePage /></TestWrapper>);
    await waitFor(() => {
      const inputs = container.querySelectorAll('input, select');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it('muestra botón de búsqueda o reserva', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    const { container } = render(<TestWrapper><ReservaClientePage /></TestWrapper>);
    await waitFor(() => {
      const botones = container.querySelectorAll('button');
      expect(botones.length).toBeGreaterThan(0);
    });
  });

  it('no lanza excepción al renderizar', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    expect(() =>
      render(<TestWrapper><ReservaClientePage /></TestWrapper>),
    ).not.toThrow();
  });

  it('todos los botones tienen texto o aria-label accesible', async () => {
    const { default: ReservaClientePage } = await import('../../pages/ReservaClientePage');
    const { container } = render(<TestWrapper><ReservaClientePage /></TestWrapper>);
    await waitFor(() => {
      const botones = container.querySelectorAll('button');
      botones.forEach((btn) => {
        const tieneTexto = (btn.textContent?.trim().length ?? 0) > 0;
        const tieneAria = !!btn.getAttribute('aria-label');
        expect(tieneTexto || tieneAria).toBe(true);
      });
    });
  });
});
