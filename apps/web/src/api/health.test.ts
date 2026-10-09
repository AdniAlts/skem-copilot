import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './health';

describe('fetchHealth', () => {
  it('memanggil /api/health dan mengembalikan body', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, db: 'ok' }));

    await expect(fetchHealth(fetchFn)).resolves.toEqual({ ok: true, db: 'ok' });
    expect(fetchFn).toHaveBeenCalledWith('/api/health');
  });

  it('melempar error jika status bukan 2xx', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 502 }));

    await expect(fetchHealth(fetchFn)).rejects.toThrow('502');
  });
});
