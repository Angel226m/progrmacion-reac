// ═══════════════════════════════════════════════════════════
// HotelFlux — Vitest Setup (jsdom + testing-library matchers)
// ═══════════════════════════════════════════════════════════

import '@testing-library/jest-dom';
import { vi, beforeAll } from 'vitest';

beforeAll(() => {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});

// Mock localStorage para tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch global — must return a Promise so AuthProvider's .then() doesn't crash
globalThis.fetch = vi.fn(() => Promise.resolve({
  ok: false,
  json: () => Promise.resolve({ error: 'No session' }),
} as unknown as Response)) as unknown as typeof globalThis.fetch;

// Helper to generate a valid JWT token with future expiry (prevents auto-logout)
(globalThis as any).makeTestToken = (expOffset = 3600) => {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffset }));
  return `header.${payload}.signature`;
};
