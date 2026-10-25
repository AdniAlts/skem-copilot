/**
 * Validasi environment variables (zod, fail-fast).
 *
 * Dipanggil sekali di bootstrap (`index.ts`, `seed.ts`, worker).
 * Aplikasi menolak start jika env tidak lengkap/invalid.
 */

import { z } from 'zod';

const envSchema = z.object({
  // --- API server ---
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET minimal 16 karakter.'),

  // --- LLM gateway CBN (OpenAI-compatible) ---
  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  // Model khusus membaca gambar (extract_vision); kosong = pakai LLM_MODEL.
  LLM_VISION_MODEL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),

  // --- Supabase ---
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z
    .string()
    .startsWith('postgresql://', 'DATABASE_URL harus Postgres connection string.'),

  // --- Bucket Storage (semua privat) ---
  STORAGE_BUCKET_CERTIFICATES: z.string().min(1),
  STORAGE_BUCKET_SIGNATURES: z.string().min(1),
  STORAGE_BUCKET_FORMS: z.string().min(1),

  // --- Telegram (opsional; kosong = bot nonaktif) ---
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_BOT_USERNAME: z.string().optional().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Parse dan cache env. Lempar Error berisi daftar masalah jika invalid. */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Env tidak valid:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}
