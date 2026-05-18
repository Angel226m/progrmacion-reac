import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('services/security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMap();
  });

  describe('sanitizeHtml', () => {
    it('escapa caracteres HTML peligrosos', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('preserva texto plano', () => {
      expect(sanitizeHtml('Hola mundo')).toBe('Hola mundo');
    });

    it('escapa comillas simples y dobles', () => {
      expect(sanitizeHtml('"double" y \'single\'')).toBe('&quot;double&quot; y &#x27;single&#x27;');
    });
  });

  describe('validatePassword', () => {
    it('contraseña válida retorna valid true', () => {
      const result = validatePassword('Password1!', 'test@test.com');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('contraseña muy débil (menos de 8 caracteres)', () => {
      const result = validatePassword('Abc1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mínimo 8 caracteres');
      expect(result.strength).toBe('fuerte');
    });

    it('contraseña sin mayúscula', () => {
      const result = validatePassword('password1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos una mayúscula');
    });

    it('contraseña sin minúscula', () => {
      const result = validatePassword('PASSWORD1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos una minúscula');
    });

    it('contraseña sin número', () => {
      const result = validatePassword('Password!!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos un número');
    });

    it('contraseña sin carácter especial', () => {
      const result = validatePassword('Password1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Al menos un carácter especial');
    });

    it('contraseña que contiene email es inválida', () => {
      const result = validatePassword('Testuser1234!', 'testuser@test.com');
      expect(result.errors).toContain('No puede contener tu nombre de usuario');
    });

    it('retorna strength correcto según score', () => {
      expect(validatePassword('Aa1!').strength).toBe('fuerte');
      expect(validatePassword('Aa1!bb').strength).toBe('fuerte');
      expect(validatePassword('Aa1!bbcc').strength).toBe('muy fuerte');
      expect(validatePassword('Aa1!bbccdd').strength).toBe('muy fuerte');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('retorna color correcto para cada strength', () => {
      expect(getPasswordStrengthColor('débil')).toBe('bg-red-500');
      expect(getPasswordStrengthColor('moderada')).toBe('bg-amber-500');
      expect(getPasswordStrengthColor('fuerte')).toBe('bg-emerald-500');
      expect(getPasswordStrengthColor('muy fuerte')).toBe('bg-blue-500');
    });
  });

  describe('isValidEmail', () => {
    it('email válido retorna true', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('email inválido retorna false', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });

    it('email muy largo retorna false', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('generateNonce', () => {
    it('genera un nonce aleatorio', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
      expect(typeof nonce1).toBe('string');
      expect(nonce1.length).toBeGreaterThan(10);
    });
  });

  describe('securityLog', () => {
    it('loguea en modo desarrollo', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      securityLog('Test event', { detail: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith('[Security] Test event', { detail: 'test' });
      consoleSpy.mockRestore();
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Reset rate limit entre tests
    });

    it('permite primer intento', () => {
      const allowed = checkRateLimit('test-key', 3, 60000);
      expect(allowed).toBe(true);
    });

    it('bloquea después de maxAttempts', () => {
      checkRateLimit('test-key2', 3, 60000);
      checkRateLimit('test-key2', 3, 60000);
      checkRateLimit('test-key2', 3, 60000);
      const blocked = checkRateLimit('test-key2', 3, 60000);
      expect(blocked).toBe(false);
    });

    it('se resetea después del window', async () => {
      const allowed = checkRateLimit('test-key3', 1, 10);
      expect(allowed).toBe(true);
      await new Promise(r => setTimeout(r, 15));
      const allowedAfter = checkRateLimit('test-key3', 1, 10);
      expect(allowedAfter).toBe(true);
    });
  });

  describe('getRateLimitRemaining', () => {
    it('retorna maxAttempts inicialmente', () => {
      const remaining = getRateLimitRemaining('test-key', 5);
      expect(remaining).toBe(5);
    });

    it('reduce intentos restantes', () => {
      checkRateLimit('test-key2', 5, 60000);
      checkRateLimit('test-key2', 5, 60000);
      const remaining = getRateLimitRemaining('test-key2', 5);
      expect(remaining).toBe(3);
    });
  });

  describe('generateCsrfToken', () => {
    it('genera token aleatorio', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64);
    });
  });

  describe('sanitizeUrl', () => {
    it('bloquea javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    });

    it('bloquea data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('bloquea vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    });

    it('permite URLs normales', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });
  });

  describe('sanitizeDocumento', () => {
    it('solo permite alfanuméricos y guiones', () => {
      expect(sanitizeDocumento('12345678')).toBe('12345678');
      expect(sanitizeDocumento('AB1234567')).toBe('AB1234567');
    });

    it('elimina caracteres especiales', () => {
      expect(sanitizeDocumento('123.456.78')).toBe('12345678');
      expect(sanitizeDocumento('ABC@#!')).toBe('ABC');
    });

    it('limita a 20 caracteres', () => {
      const long = 'a'.repeat(30);
      expect(sanitizeDocumento(long)).toHaveLength(20);
    });
  });

  describe('isValidPhone', () => {
    it('teléfono válido', () => {
      expect(isValidPhone('+51 999 999 999')).toBe(true);
      expect(isValidPhone('999999999')).toBe(true);
      expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
    });

    it('teléfono inválido', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
    });
  });

  describe('buildCspDirectives', () => {
    it('genera directivas CSP con nonce', () => {
      const csp = buildCspDirectives('abc123');
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'nonce-abc123'");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });
});