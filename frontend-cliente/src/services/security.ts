// ═══════════════════════════════════════════════════════════
// HotelFlux — Utilidades de Seguridad Frontend (OWASP)
//
// Controles implementados:
//   - A03:2021 Injection → Sanitización de entrada XSS
//   - A07:2021 Auth Failures → Validación de contraseña NIST 800-63B
//   - A09:2021 Security Logging → Log de eventos de seguridad
//   - ISO 27001 A.9.3 → Política de contraseñas
//   - ISO 27001 A.14.2 → Desarrollo seguro
// ═══════════════════════════════════════════════════════════

/**
 * Sanitiza texto para prevenir XSS (OWASP A03:2021)
 * Escapa caracteres HTML peligrosos usando entity encoding.
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}

/**
 * Resultado de validación de contraseña (NIST 800-63B)
 */
export interface PasswordValidation {
  readonly valid: boolean;
  readonly score: number; // 0-5 (cada regla cumplida suma 1)
  readonly errors: readonly string[];
  readonly strength: 'débil' | 'moderada' | 'fuerte' | 'muy fuerte';
}

/**
 * Valida una contraseña según política NIST 800-63B + OWASP
 * - Mínimo 8 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 * - Al menos 1 carácter especial
 */
export function validatePassword(password: string, email?: string): PasswordValidation {
  const checks: [boolean, string][] = [
    [password.length >= 8, 'Mínimo 8 caracteres'],
    [/[A-Z]/.test(password), 'Al menos una mayúscula'],
    [/[a-z]/.test(password), 'Al menos una minúscula'],
    [/[0-9]/.test(password), 'Al menos un número'],
    [/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password), 'Al menos un carácter especial'],
  ];

  const baseErrors: string[] = checks.filter(([pass]) => !pass).map(([, msg]) => msg);
  const passed = checks.filter(([pass]) => pass).length;

  const username = email?.split('@')[0]?.toLowerCase() ?? '';
  const contieneUsuario = !!(username && password.toLowerCase().includes(username));

  const errors: string[] = contieneUsuario
    ? [...baseErrors, 'No puede contener tu nombre de usuario']
    : baseErrors;
  const score = contieneUsuario ? Math.max(0, passed - 1) : passed;

  const strength: PasswordValidation['strength'] =
    score <= 1 ? 'débil'
    : score <= 2 ? 'moderada'
    : score <= 4 ? 'fuerte'
    : 'muy fuerte';

  return { valid: errors.length === 0, score, errors, strength };
}

/**
 * Colores del indicador de fuerza de contraseña
 */
const PASSWORD_STRENGTH_COLORS: Readonly<Record<PasswordValidation['strength'], string>> = {
  'débil': 'bg-red-500',
  'moderada': 'bg-amber-500',
  'fuerte': 'bg-emerald-500',
  'muy fuerte': 'bg-blue-500',
};

export function getPasswordStrengthColor(strength: PasswordValidation['strength']): string {
  return PASSWORD_STRENGTH_COLORS[strength];
}

/**
 * Valida formato de email (OWASP input validation)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Genera un nonce para CSP (Content Security Policy)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Log de eventos de seguridad para auditoría (ISO 27001 A.12.4)
 */
const securityLoggers: ReadonlyArray<(event: string, details?: Record<string, unknown>) => void> = [
  ...(import.meta.env.DEV ? [(event: string, details?: Record<string, unknown>) => console.info(`[Security] ${event}`, details ?? '')] : []),
];

export function securityLog(event: string, details?: Record<string, unknown>): void {
  securityLoggers.forEach(logger => logger(event, details));
}

// ═══════════════════════════════════════════════════════════
// Utilidades adicionales OWASP
// ═══════════════════════════════════════════════════════════

/**
 * Rate limiter en memoria para frontend (OWASP A04:2021 — Insecure Design)
 * Limita acciones por clave (e.g. login, API calls).
 * No reemplaza rate limiting del backend — es una capa defensiva adicional.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitMap(): void {
  rateLimitMap.clear();
}

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // permitido
  }

  if (entry.count >= maxAttempts) {
    return false; // bloqueado
  }

  entry.count++;
  return true;
}

export function getRateLimitRemaining(key: string, maxAttempts: number): number {
  const entry = rateLimitMap.get(key);
  if (!entry || Date.now() > entry.resetAt) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}

/**
 * Genera un token CSRF único (OWASP A05:2021 — Security Misconfiguration)
 * Para proteger formularios contra CSRF cuando el backend lo requiere.
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitiza una URL para prevenir javascript: y data: schemes (OWASP A03)
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    securityLog('URL sanitizada (scheme peligroso bloqueado)', { original: url });
    return '#';
  }
  return url;
}

/**
 * Valida y sanitiza un número de documento (DNI/CE/Pasaporte)
 * Solo permite alfanuméricos y guiones.
 */
export function sanitizeDocumento(input: string): string {
  return input.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 20);
}

/**
 * Valida formato de teléfono peruano/internacional
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

/**
 * Content Security Policy meta tag helper
 * Genera directivas CSP para insertar en el HTML.
 */
export function buildCspDirectives(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
