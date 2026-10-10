import { describe, expect, it, vi } from 'vitest';

const worker = vi.hoisted(() => ({
  processQueuedSubmissions: vi.fn().mockResolvedValue(2),
  recoverStaleJobs: vi.fn().mockResolvedValue(1),
}));
const env = vi.hoisted(() => ({
  loadEnv: vi.fn(() => ({ CRON_SECRET: 'secret' })),
}));

vi.mock('../src/queue/worker.js', () => worker);
vi.mock('../src/env.js', () => env);

import handler from '../../../api/cron/worker.js';

function response() {
  const state = { status: 200, body: undefined as unknown, allow: undefined as string | undefined };
  const res = {
    setHeader: vi.fn((key: string, value: string) => { if (key === 'Allow') state.allow = value; }),
    status: vi.fn((status: number) => { state.status = status; return res; }),
    json: vi.fn((body: unknown) => { state.body = body; }),
  };
  return { res, state };
}

describe('Vercel worker cron', () => {
  it('rejects an unauthorized request', async () => {
    const { res, state } = response();
    await handler({ method: 'GET', headers: {} } as never, res as never);
    expect(state.status).toBe(401);
    expect(worker.recoverStaleJobs).not.toHaveBeenCalled();
  });

  it('runs recovery and queued work for an authorized request', async () => {
    const { res, state } = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } } as never, res as never);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ recovered: 1, processed: 2 });
  });
});
