import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// npm run db:* dijalankan dari root repo; muat .env jika ada (env yang sudah diset tidak ditimpa).
const ROOT_ENV_FILE = '.env';
if (existsSync(ROOT_ENV_FILE)) process.loadEnvFile(ROOT_ENV_FILE);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
