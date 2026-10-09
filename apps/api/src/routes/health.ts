import { Router } from 'express';
import type { HealthResponse } from '@skem/shared';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  // Pengecekan koneksi DB nyata menyusul di BE-01 (#4).
  const body: HealthResponse = { ok: true, db: 'ok' };
  res.json(body);
});
