import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_DEV_ORIGIN = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_DEV_ORIGIN,
    },
  },
  test: {
    environment: 'node',
  },
});
