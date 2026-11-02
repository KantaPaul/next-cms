import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './scripts/empty-module.cjs'),
      'sanitize-html': path.resolve(__dirname, './tests/mocks/sanitize-html.cjs'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './scripts/empty-module.cjs'),
      'sanitize-html': path.resolve(__dirname, './tests/mocks/sanitize-html.cjs'),
    },
  },
});
