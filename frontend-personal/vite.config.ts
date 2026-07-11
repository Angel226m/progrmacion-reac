/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'src/test/publico.api.test.ts',
      'src/test/e2e/pages.test.tsx',
      'src/test/integration/luxury-design.test.tsx',
      'src/test/integration/services.test.ts',
      'src/test/pages/legal.test.tsx',
      'src/test/pages/publico.test.tsx',
      'src/test/unit/luxury-pages.test.tsx',
    ],
    css: false,
    testTimeout: 15000,
  },
});
