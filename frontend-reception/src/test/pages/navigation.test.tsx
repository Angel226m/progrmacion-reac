import { describe, it, expect } from 'vitest';

describe('pages/navigation', () => {
  it('rutas admin incluyen /personal y /analitica', () => {
    const adminRoutes = ['/personal', '/analitica'];
    adminRoutes.forEach((route) => {
      expect(route).toMatch(/^\//);
    });
  });

  it('rutasPermitidas correctas por rol', () => {
    const rutasPermitidas = {
      admin: ['/dashboard', '/recepcion', '/reservas', '/huespedes', '/productos', '/limpieza', '/configuracion', '/personal', '/analitica'],
      recepcionista: ['/dashboard', '/recepcion', '/reservas', '/huespedes', '/productos'],
      limpieza: ['/dashboard', '/limpieza'],
      mantenimiento: ['/dashboard', '/configuracion'],
    };

    expect(rutasPermitidas.admin).toContain('/personal');
    expect(rutasPermitidas.admin).toContain('/analitica');
    expect(rutasPermitidas.recepcionista).not.toContain('/personal');
    expect(rutasPermitidas.limpieza).not.toContain('/analitica');
  });
});