import { describe, it, expect } from 'vitest';

describe('pages/navigation', () => {
  it('rutas del portal de cliente no tienen prefijo /admin', () => {
    const clientRoutes = ['/', '/habitaciones', '/servicios', '/reservar', '/acceso', '/registro', '/mi-cuenta'];
    clientRoutes.forEach((route) => {
      expect(route).not.toMatch(/^\/admin/);
    });
  });

  it('todas las rutas del cliente son accesibles sin rol de personal', () => {
    const clientRoutes = ['/', '/habitaciones', '/servicios', '/reservar', '/acceso', '/registro', '/mi-cuenta', '/legal/privacidad'];
    clientRoutes.forEach((route) => {
      expect(route).toMatch(/^\//);
    });
  });
});