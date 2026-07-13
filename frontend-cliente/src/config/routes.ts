// ═══════════════════════════════════════════════════════════
// HotelFlux — Configuración de Rutas por Rol
// Mapea roles de usuario a rutas de redirección post-login
// ═══════════════════════════════════════════════════════════

export const rutaPorRol: Readonly<Record<string, string>> = {
  huesped: '/mi-cuenta',
} as const;
