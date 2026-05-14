import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  validatePassword,
  getPasswordStrengthColor,
  isValidEmail,
  generateNonce,
  securityLog,
  checkRateLimit,
  getRateLimitRemaining,
  generateCsrfToken,
  sanitizeUrl,
  sanitizeDocumento,
  isValidPhone,
  buildCspDirectives,
  resetRateLimitMap,
} from '../../services/security';

describe('Unit / Seguridad (OWASP)', () => {
  beforeEach(() => {
    resetRateLimitMap();
  });

  describe('sanitizeHtml — prevención XSS (OWASP A03:2021)', () => {
    it('escapa caracteres HTML peligrosos', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapa comillas dobles', () => {
      const input = '"><img src=x onerror=alert(1)>';
      const result = sanitizeHtml(input);
      expect(result).toContain('&quot;');
    });

    it('escapa comillas simples', () => {
      const input = "' onclick='alert(1)'";
      const result = sanitizeHtml(input);
      expect(result).toContain('&#x27;');
    });

    it('escapa & (ampersand)', () => {
      const input = 'foo & bar';
      const result = sanitizeHtml(input);
      expect(result).toContain('&amp;');
    });

    it('preserva texto sin HTML', () => {
      const input = 'Hola mundo sin tags';
      expect(sanitizeHtml(input)).toBe('Hola mundo sin tags');
    });

    it('maneja string vacío', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('validatePassword — política NIST 800-63B', () => {
    it('password válida con todas las reglas', () => {
      const result = validatePassword('Secure@123');
      expect(result.valid).toBe(true);
      expect(result.score).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('muy fuerte');
    });

    it('password sin mayúsculas es inválida', () => {
      const result = validatePassword('secure@123');
      expect(result.valid).toBe(false);
      expect(result.score).toBe(4);
      expect(result.errors).toContain('Al menos una mayúscula');
    });

    it('password sin minúsculas es inválida', () => {
      const result = validatePassword('SECURE@123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos una minúscula');
    });

    it('password sin número es inválida', () => {
      const result = validatePassword('Secure@pass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos un número');
    });

    it('password sin carácter especial es inválida', () => {
      const result = validatePassword('SecurePass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos un carácter especial');
    });

    it('password menor a 8 caracteres es inválida', () => {
      const result = validatePassword('Aa1@');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mínimo 8 caracteres');
    });

    it('detecta email en password como debilidad', () => {
      const result = validatePassword('admin123@', 'admin@hotel.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No puede contener tu nombre de usuario');
    });

    it('clasifica fuerza débil (score <= 1)', () => {
      const result = validatePassword('abc');
      expect(result.strength).toBe('débil');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('clasifica fuerza moderada (score 2)', () => {
      const result = validatePassword('abcdefgh');
      expect(result.strength).toBe('moderada');
      expect(result.score).toBe(2);
    });

    it('clasifica fuerza fuerte (score 3-4)', () => {
      const result = validatePassword('Password1');
      expect(result.strength).toBe('fuerte');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('clasifica fuerza muy fuerte (score 5)', () => {
      const result = validatePassword('Secure@123');
      expect(result.strength).toBe('muy fuerte');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('retorna color para débil', () => {
      expect(getPasswordStrengthColor('débil')).toBe('bg-red-500');
    });

    it('retorna color para moderada', () => {
      expect(getPasswordStrengthColor('moderada')).toBe('bg-amber-500');
    });

    it('retorna color para fuerte', () => {
      expect(getPasswordStrengthColor('fuerte')).toBe('bg-emerald-500');
    });

    it('retorna color para muy fuerte', () => {
      expect(getPasswordStrengthColor('muy fuerte')).toBe('bg-blue-500');
    });
  });

  describe('isValidEmail — validación OWASP', () => {
    it('acepta email válido estándar', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('acepta email con subdominio', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('acepta email con más puntos', () => {
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('acepta email con plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('rechaza email sin @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('rechaza email sin dominio', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('rechaza email sin local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('rechaza email con espacios', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('rechaza email muy largo (>254)', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('generateNonce — CSP', () => {
    it('genera string no vacío', () => {
      const nonce = generateNonce();
      expect(nonce).toBeTruthy();
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('genera valores únicos', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('genera longitud consistente (base64 de 16 bytes)', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeCloseTo(24, -2);
    });
  });

  describe('securityLog', () => {
    it('no lanza errores en producción', () => {
      expect(() => securityLog('test event')).not.toThrow();
    });

    it('acepta detalles adicionales', () => {
      expect(() => securityLog('test event', { userId: '123' })).not.toThrow();
    });
  });

  describe('checkRateLimit — prevención fuerza bruta (OWASP A04)', () => {
    it('permite primer intento', () => {
      expect(checkRateLimit('test-login-1', 3, 60000)).toBe(true);
    });

    it('permite intentos dentro del límite', () => {
      expect(checkRateLimit('test-login-2', 3, 60000)).toBe(true);
      expect(checkRateLimit('test-login-2', 3, 60000)).toBe(true);
      expect(checkRateLimit('test-login-2', 3, 60000)).toBe(true);
    });

    it('bloquea cuando excede el límite', () => {
      const key = 'test-login-3-' + Date.now();
      checkRateLimit(key, 3, 60000);
      checkRateLimit(key, 3, 60000);
      checkRateLimit(key, 3, 60000);
      expect(checkRateLimit(key, 3, 60000)).toBe(false);
    });

    it('keys diferentes son independientes', () => {
      const key1 = 'test-login-4a-' + Date.now();
      const key2 = 'test-login-4b-' + Date.now();
      checkRateLimit(key1, 3, 60000);
      checkRateLimit(key1, 3, 60000);
      checkRateLimit(key1, 3, 60000);
      expect(checkRateLimit(key1, 3, 60000)).toBe(false);
      expect(checkRateLimit(key2, 3, 60000)).toBe(true);
    });
  });

  describe('getRateLimitRemaining', () => {
    it('retorna intentos restantes iniciales', () => {
      expect(getRateLimitRemaining('test-rem-' + Date.now(), 5)).toBe(5);
    });

    it('decrementa con cada intento', () => {
      const key = 'test-rem-decr-' + Date.now();
      checkRateLimit(key, 5, 60000);
      expect(getRateLimitRemaining(key, 5)).toBe(4);
      checkRateLimit(key, 5, 60000);
      expect(getRateLimitRemaining(key, 5)).toBe(3);
    });

    it('retorna 0 cuando está bloqueado', () => {
      const key = 'test-rem-block-' + Date.now();
      for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60000);
      expect(getRateLimitRemaining(key, 5)).toBe(0);
    });
  });

  describe('generateCsrfToken', () => {
    it('genera token no vacío', () => {
      const token = generateCsrfToken();
      expect(token).toBeTruthy();
    });

    it('genera token hexadecimal de 64 caracteres (32 bytes)', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('genera valores únicos', () => {
      const t1 = generateCsrfToken();
      const t2 = generateCsrfToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('sanitizeUrl — prevención javascript: (OWASP A03)', () => {
    it('bloquea javascript:', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    });

    it('bloquea data:', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('bloquea vbscript:', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('#');
    });

    it('acepta URLs normales', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('acepta URLs relativas', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });

    it('normaliza a minúsculas', () => {
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('trim espacios', () => {
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBe('#');
    });
  });

  describe('sanitizeDocumento', () => {
    it('permite solo alfanuméricos y guiones', () => {
      expect(sanitizeDocumento('ABC123456')).toBe('ABC123456');
    });

    it('elimina caracteres especiales', () => {
      expect(sanitizeDocumento('AB!@#$%123')).toBe('AB123');
    });

    it('limita a 20 caracteres', () => {
      const long = 'A'.repeat(30);
      expect(sanitizeDocumento(long)).toHaveLength(20);
    });

    it('permite guiones', () => {
      expect(sanitizeDocumento('12345678-9')).toBe('12345678-9');
    });

    it('maneja string vacío', () => {
      expect(sanitizeDocumento('')).toBe('');
    });
  });

  describe('isValidPhone', () => {
    it('acepta formato Perú', () => {
      expect(isValidPhone('+51 987 654 321')).toBe(true);
      expect(isValidPhone('987654321')).toBe(true);
    });

    it('acepta números con guiones y paréntesis', () => {
      expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
      expect(isValidPhone('555-123-4567')).toBe(true);
    });

    it('requiere mínimo 7 dígitos', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('1234567')).toBe(true);
    });

    it('acepta hasta 20 caracteres', () => {
      expect(isValidPhone('+1 234 567 890 1234')).toBe(true);
    });

    it('rechaza con caracteres no válidos', () => {
      expect(isValidPhone('abc123def')).toBe(false);
    });
  });

  describe('buildCspDirectives', () => {
    it('genera directivas con nonce', () => {
      const nonce = 'abc123';
      const csp = buildCspDirectives(nonce);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(csp).toContain(`style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`);
    });

    it('incluye img-src con data: y https:', () => {
      const csp = buildCspDirectives('test');
      expect(csp).toContain("img-src 'self' data: https:");
    });

    it('incluye connect-src con ws: y wss:', () => {
      const csp = buildCspDirectives('test');
      expect(csp).toContain("connect-src 'self' ws: wss:");
    });

    it('incluye frame-ancestors none', () => {
      const csp = buildCspDirectives('test');
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });
});