/**
 * Batch route boundary tests. Invalid requests must fail before DB or Storage access.
 *
 * Butuh DB seeded (npm run db:migrate && npm run seed) dan .env lengkap.
 * Tanpa DATABASE_URL (mis. CI), test dilewati.
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { HAS_DATABASE } from './db-available';

let app: ReturnType<typeof createApp>;
let studentId: number;
let cookie: string[];

beforeAll(async () => {
  if (!HAS_DATABASE) return;
  app = createApp();
  const users = await request(app).get('/api/auth/mock-users').expect(200);
  const student = (users.body as { id: number; role: string }[]).find((user) => user.role === 'student');
  if (!student) throw new Error('Seed student tidak tersedia');
  studentId = student.id;
  const login = await request(app).post('/api/auth/mock-login').send({ userId: studentId }).expect(200);
  cookie = [String(login.headers['set-cookie'])];
});

describe.skipIf(!HAS_DATABASE)('POST /api/batches validation', () => {
  it('401 tanpa session', async () => {
    const response = await request(app).post('/api/batches');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('400 jika lebih dari 10 file', async () => {
    const requestBuilder = request(app).post('/api/batches').set('Cookie', cookie);
    for (let index = 0; index < 11; index += 1) {
      requestBuilder.attach('files', Buffer.from('%PDF-1.7 test'), `${index}.pdf`);
    }
    const response = await requestBuilder;
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOO_MANY_FILES');
  });

  it('415 jika file bukan PDF walau ekstensi .pdf', async () => {
    const response = await request(app)
      .post('/api/batches')
      .set('Cookie', cookie)
      .attach('files', Buffer.from('not a PDF'), 'fake.pdf');
    expect(response.status).toBe(415);
    expect(response.body.error.message).toContain('fake.pdf');
  });

  it('400 jika tidak ada file', async () => {
    const response = await request(app).post('/api/batches').set('Cookie', cookie);
    expect(response.status).toBe(400);
  });

  it('student seed memiliki ID valid untuk login test', () => {
    expect(studentId).toBeGreaterThan(0);
  });
});
