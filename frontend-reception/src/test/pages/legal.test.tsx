import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LegalPage from '../../pages/LegalPage';

function renderLegalPage(tipo: string) {
  return render(
    <MemoryRouter initialEntries={[`/legal/${tipo}`]}>
      <Routes>
        <Route path="/legal/:tipo" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('pages/legal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la página de privacidad con fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('privacidad');

    await waitFor(() => {
      expect(screen.getAllByText(/Política de Privacidad/i)[0]).toBeInTheDocument();
    });
  });

  it('renderiza la página de términos con fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('terminos');

    await waitFor(() => {
      expect(screen.getAllByText(/Términos y Condiciones/i)[0]).toBeInTheDocument();
    });
  });

  it('renderiza la página de cookies con fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('cookies');

    await waitFor(() => {
      expect(screen.getAllByText(/Política de Cookies/i)[0]).toBeInTheDocument();
    });
  });

  it('tiene enlaces de navegación entre documentos legales', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    renderLegalPage('privacidad');

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map(l => l.getAttribute('href'));
      expect(hrefs.some(h => h?.includes('/legal/'))).toBe(true);
    });
  });
});