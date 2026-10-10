import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Muat .env repo (tests integrasi butuh DATABASE_URL, SESSION_SECRET, dll.)
    setupFiles: ['./test/env.setup.ts'],
    /** Tes integrasi berbagi satu DB seed dan mengubah baris yang sama (mis. `users.signature_path`), jadi file dijalankan berurutan. */
    fileParallelism: false,
    /** Satu tes integrasi melakukan banyak round-trip DB; batas bawaan 5 s terlalu ketat. */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
