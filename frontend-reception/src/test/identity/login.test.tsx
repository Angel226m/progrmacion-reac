import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('identity/login', () => {
  it('renderiza formulario de login', async () => {
    const { default: LoginPage } = await import('../../pages/LoginPage');

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>,
    );

    expect(screen.getAllByText(/HotelFlux/i)[0]).toBeTruthy();
  });
});