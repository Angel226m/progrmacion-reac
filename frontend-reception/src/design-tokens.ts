// ═══════════════════════════════════════════════════════════
// HotelFlux — Design Tokens del Sistema
//
// Fuente única de verdad para todos los valores visuales.
// Implementados como constantes inmutables (as const).
//
// Principios demostrados:
// - [INMUTABILIDAD] as const — no se puede mutar en runtime
// - [FUNCIÓN PURA] getColor, getSpacing — deterministas
// - [TIPADO ESTRICTO] Token types extraídos de los valores
// ═══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// COLORES — Paleta luxury gold/navy
// ──────────────────────────────────────────────────────────

export const colors = {
  // Colores primarios del tema luxury
  navy: '#0c1d3d',
  navyLight: '#1a3158',
  navyMid: '#152847',
  navyDark: '#080f1e',

  gold: '#c5a255',
  goldLight: '#d4b97a',
  goldDark: '#a8882e',
  goldMuted: '#c5a25540',

  // Estados de habitación
  estados: {
    disponible: '#10b981',
    reservada: '#3b82f6',
    ocupada: '#ef4444',
    en_limpieza: '#f59e0b',
    en_mantenimiento: '#8b5cf6',
    bloqueada: '#6b7280',
  },

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  critical: '#dc2626',

  // Neutrales
  white: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// ──────────────────────────────────────────────────────────
// TIPOGRAFÍA
// ──────────────────────────────────────────────────────────

export const typography = {
  fonts: {
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// ──────────────────────────────────────────────────────────
// ESPACIADO (escala 4px)
// ──────────────────────────────────────────────────────────

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ──────────────────────────────────────────────────────────
// SOMBRAS
// ──────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  base: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  md: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
  luxury: '0 20px 60px rgba(12,29,61,0.3)',
  card: '0 4px 20px rgba(0,0,0,0.1)',
  glow: '0 0 20px rgba(197,162,85,0.4)',
  goldGlow: '0 0 30px rgba(197,162,85,0.6)',
} as const;

// ──────────────────────────────────────────────────────────
// BORDER RADIUS
// ──────────────────────────────────────────────────────────

export const radius = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

// ──────────────────────────────────────────────────────────
// TRANSICIONES / ANIMACIONES
// ──────────────────────────────────────────────────────────

export const transitions = {
  fast: 'all 0.15s ease',
  base: 'all 0.2s ease',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ──────────────────────────────────────────────────────────
// BREAKPOINTS
// ──────────────────────────────────────────────────────────

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ──────────────────────────────────────────────────────────
// GRADIENTES
// ──────────────────────────────────────────────────────────

export const gradients = {
  gold: 'linear-gradient(135deg, #c5a255 0%, #d4b97a 50%, #a8882e 100%)',
  goldText: 'linear-gradient(135deg, #c5a255, #d4b97a)',
  navy: 'linear-gradient(135deg, #0c1d3d 0%, #1a3158 100%)',
  navyDeep: 'linear-gradient(180deg, #080f1e 0%, #0c1d3d 100%)',
  overlay: 'linear-gradient(to bottom, transparent 0%, rgba(8,15,30,0.9) 100%)',
  glassmorphism: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
} as const;

// ──────────────────────────────────────────────────────────
// OBJETO TOKENS COMPLETO (exportado como default)
// ──────────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  spacing,
  shadows,
  radius,
  transitions,
  breakpoints,
  gradients,
} as const;

// ──────────────────────────────────────────────────────────
// TIPOS DERIVADOS (de los valores, no hardcodeados)
// ──────────────────────────────────────────────────────────

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type ShadowKey = keyof typeof shadows;
export type RadiusKey = keyof typeof radius;
export type TransitionKey = keyof typeof transitions;
export type EstadoColor = keyof typeof colors.estados;

// ──────────────────────────────────────────────────────────
// FUNCIONES PURAS DE ACCESO A TOKENS
// ──────────────────────────────────────────────────────────

/**
 * [FUNCIÓN PURA] Obtiene el color de un estado de habitación.
 * Determinista: mismo estado → mismo color siempre.
 */
export const colorEstado = (estado: EstadoColor): string =>
  colors.estados[estado];

/**
 * [FUNCIÓN PURA] Obtiene color de severidad de alerta.
 */
export const colorAlerta = (nivel: 'info' | 'warning' | 'critical'): string => {
  const mapa = {
    info: colors.info,
    warning: colors.warning,
    critical: colors.critical,
  } as const;
  return mapa[nivel];
};

export default tokens;
