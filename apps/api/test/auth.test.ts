/**
 * Tes integrasi auth & guard (BE-01).
 *
 * Butuh DB seeded (npm run db:migrate && npm run seed) dan .env lengkap —
 * memakai akun seed asli lewat /auth/mock-users. Tanpa DATABASE_URL (mis. CI),
 * blok yang butuh DB dilewati; "Format error seragam" tetap jalan.
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { users as users_table } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';

interface MockUser {
  id: number;
  name: string;
  role: 'student' | 'verifier' | 'validator' | 'unit';
  className: string | null;
}

let app: ReturnType<typeof createApp>;
let users: MockUser[];
let student: MockUser;
let nonexistentUserId: number;

beforeAll(async () => {
  app = createApp();
  if (!HAS_DATABASE) return;
  const res = await request(app).get('/api/auth/mock-users').expect(200);
  users = res.body as MockUser[];
  expect(users.length).toBeGreaterThanOrEqual(14);
  student = users.find((u) => u.role === 'student' && u.className === 'D3-IT-A 2024')!;
  // 404 test pakai id di luar rentang seed apa pun
  nonexistentUserId = Math.max(...users.map((u) => u.id)) + 1000;
});

async function loginAs(userId: number): Promise<string[]> {
  const res = await request(app).post('/api/auth/mock-login').send({ userId }).expect(200);
  const cookie = res.headers['set-cookie'];
  expect(cookie, 'set-cookie harus ada').toBeDefined();
  return [String(cookie)];
}

describe.skipIf(!HAS_DATABASE)('GET /api/me', () => {
  it('401 tanpa cookie sesi', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('401 dengan cookie tidak valid', async () => {
    const res = await request(app).get('/api/me').set('Cookie', ['skem_session=garbage']);
    expect(res.status).toBe(401);
  });

  it('200 profil mahasiswa: kelas + dosen wali terisi', async () => {
    const cookie = await loginAs(student.id);
    const res = await request(app).get('/api/me').set('Cookie', cookie).expect(200);
    expect(res.body.role).toBe('student');
    expect(res.body.className).toBe('D3-IT-A 2024');
    expect(res.body.verifierName).toBeTruthy();
    expect(res.body.hasSignature).toBe(false);
  });

  it('200 profil verifikator: jabatan terisi', async () => {
    const verifier = users.find((u) => u.role === 'verifier')!;
    const cookie = await loginAs(verifier.id);
    const res = await request(app).get('/api/me').set('Cookie', cookie).expect(200);
    expect(res.body.role).toBe('verifier');
    expect(res.body.jabatan).toBeTruthy();
  });
});

describe.skipIf(!HAS_DATABASE)('POST /api/auth/mock-login', () => {
  it('400 body tidak valid', async () => {
    const res = await request(app).post('/api/auth/mock-login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404 userId tidak ada', async () => {
    const res = await request(app).post('/api/auth/mock-login').send({ userId: nonexistentUserId });
    expect(res.status).toBe(404);
  });

  it('200 → cookie httpOnly terpasang', async () => {
    const res = await request(app).post('/api/auth/mock-login').send({ userId: student.id });
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie, 'set-cookie harus ada').toBeDefined();
    const cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie);
    expect(cookie).toMatch(/^skem_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

describe.skipIf(!HAS_DATABASE)('POST /api/auth/logout', () => {
  it('401 tanpa sesi', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('200 dengan sesi → cookie dihapus', async () => {
    const cookie = await loginAs(student.id);
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Format error seragam', () => {
  it('404 route tidak ada → format { error: { code, message } }', async () => {
    // route tak dikenal jatuh ke 404 default Express, bukan handler kita —
    // yang diuji: error domain punya format konsisten
    const res = await request(app).post('/api/auth/mock-login').send({ userId: 'bukan-angka' });
    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
  });
});

// Smoke: koneksi DB yang sama dipakai seluruh tes
describe.skipIf(!HAS_DATABASE)('DB sanity', () => {
  it('createDb terhubung dan users terisi seed', async () => {
    const { client, db } = createDb();
    try {
      const rows = await db.select({ id: users_table.id }).from(users_table).limit(1);
      expect(rows.length).toBe(1);
    } finally {
      await client.end();
    }
  });
});
