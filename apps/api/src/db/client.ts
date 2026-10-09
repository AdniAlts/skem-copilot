/**
 * Koneksi Postgres (postgres-js) + Drizzle.
 *
 * Catatan (ARCHITECTURE §6): pooler transaksi Supabase (port 6543) butuh
 * `prepare: false`; session pooler / langsung (5432) aman dengan default.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';
import { loadEnv } from '../env.js';

export function createDb() {
  const env = loadEnv();
  const client = postgres(env.DATABASE_URL, {
    prepare: false, // aman untuk semua mode pooler Supabase
  });
  return { client, db: drizzle(client, { schema }) };
}

export type Db = ReturnType<typeof createDb>['db'];
