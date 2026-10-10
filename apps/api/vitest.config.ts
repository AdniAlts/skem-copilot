import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Muat .env repo (tests integrasi butuh DATABASE_URL, SESSION_SECRET, dll.)
    setupFiles: ['./test/env.setup.ts'],
    hookTimeout: 30000,
    testTimeout: 20000,
  },
});
