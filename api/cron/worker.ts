import type { Request, Response } from 'express';

import { loadEnv } from '../../apps/api/src/env.js';
import { processQueuedSubmissions, recoverStaleJobs } from '../../apps/api/src/queue/worker.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: { code: 'NOT_FOUND', message: 'Method tidak didukung.' } });
    return;
  }

  const env = loadEnv();
  const expectedSecret = process.env.CRON_SECRET ?? env.CRON_SECRET;
  if (expectedSecret && req.headers.authorization !== `Bearer ${expectedSecret}`) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Cron tidak sah.' } });
    return;
  }

  const recovered = await recoverStaleJobs();
  const processed = await processQueuedSubmissions();
  res.json({ recovered, processed });
}
