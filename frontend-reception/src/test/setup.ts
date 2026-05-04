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

// Mock fetch global
globalThis.fetch = vi.fn();
