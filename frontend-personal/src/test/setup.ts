// ═══════════════════════════════════════════════════════════
// HotelFlux — Vitest Setup (jsdom + testing-library matchers)
// ═══════════════════════════════════════════════════════════

import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';
import { act } from '@testing-library/react';

beforeAll(() => {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('inside a test was not wrapped in act(...)')) return;
  origConsoleError.call(console, ...args);
};

afterEach(async () => {
  await act(async () => {});
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
