import { HealthResponseSchema } from '@skem/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  it('mengembalikan body yang sesuai HealthResponseSchema', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(HealthResponseSchema.parse(res.body)).toEqual({ ok: true, db: 'ok' });
  });
});
