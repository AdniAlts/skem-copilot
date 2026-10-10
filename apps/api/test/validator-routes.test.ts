import request from 'supertest';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { classes, notifications, reviews, statusHistory, submissions, users } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';

let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof createDb>['client'];
let db: ReturnType<typeof createDb>['db'];
let student: { id: number; classId: number };
let validatorId: number;
let otherClassId: number;
let studentCookie: string[];
let verifierCookie: string[];
let validatorCookie: string[];
const fixtureIds: number[] = [];

async function loginAs(userId: number): Promise<string[]> {
  const response = await request(app).post('/api/auth/mock-login').send({ userId }).expect(200);
  return [String(response.headers['set-cookie'])];
}

async function createSubmission(options: {
  status?: 'waiting_verifier' | 'waiting_validator';
  classId?: number;
  estimatedCredit?: string | null;
  finalFormStatus?: 'none' | 'failed';
  submittedAt?: Date;
} = {}): Promise<{ id: number; publicId: string }> {
  const publicId = `SKM-${Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0')}`;
  const [row] = await db.insert(submissions).values({
    publicId,
    studentId: student.id,
    classId: options.classId ?? student.classId,
    status: options.status ?? 'waiting_validator',
    reviewStatus: 'ready',
    activityName: `Kegiatan ${publicId}`,
    categoryCode: 'K1-03',
    level: 'Nasional',
    estimatedCredit: options.estimatedCredit === undefined ? '0.50' : options.estimatedCredit,
    finalFormStatus: options.finalFormStatus ?? 'none',
    submittedAt: options.submittedAt ?? new Date(),
  }).returning({ id: submissions.id });
  if (!row) throw new Error('Fixture insert failed');
  fixtureIds.push(row.id);
  return { id: row.id, publicId };
}

beforeAll(async () => {
  app = createApp();
  if (!HAS_DATABASE) return;
  ({ client, db } = createDb());
  const [first] = await db.select({ id: users.id, classId: users.classId, advisorId: classes.advisorId })
    .from(users).innerJoin(classes, eq(classes.id, users.classId))
    .where(and(eq(users.role, 'student'), isNotNull(classes.advisorId))).limit(1);
  if (!first || first.classId === null || first.advisorId === null) throw new Error('Seed requires a student in a class with an advisor');
  student = { id: first.id, classId: first.classId };
  const [validator] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'validator')).limit(1);
  if (!validator) throw new Error('Seed requires a validator');
  validatorId = validator.id;
  const otherClasses = await db.select({ id: classes.id }).from(classes);
  const other = otherClasses.find((row) => row.id !== student.classId);
  if (!other) throw new Error('Seed requires a second class');
  otherClassId = other.id;
  studentCookie = await loginAs(student.id);
  verifierCookie = await loginAs(first.advisorId);
  validatorCookie = await loginAs(validatorId);
});

afterAll(async () => {
  if (!HAS_DATABASE) return;
  if (fixtureIds.length) await db.delete(submissions).where(inArray(submissions.id, fixtureIds));
  await client.end();
});

describe.skipIf(!HAS_DATABASE)('GET /api/validator/queue', () => {
  let older: string;
  let newer: string;
  let otherClass: string;
  let waitingVerifier: string;

  beforeAll(async () => {
    older = (await createSubmission({ submittedAt: new Date('2026-10-01T00:00:00Z'), finalFormStatus: 'failed' })).publicId;
    newer = (await createSubmission({ submittedAt: new Date('2026-10-02T00:00:00Z') })).publicId;
    otherClass = (await createSubmission({ classId: otherClassId })).publicId;
    waitingVerifier = (await createSubmission({ status: 'waiting_verifier' })).publicId;
  });

  it('lists waiting_validator submissions across classes, oldest first, with form status', async () => {
    const response = await request(app).get('/api/validator/queue').set('Cookie', validatorCookie).expect(200);
    const ids = response.body.items.map((item: { publicId: string }) => item.publicId);
    expect(ids).toEqual(expect.arrayContaining([older, newer, otherClass]));
    expect(ids).not.toContain(waitingVerifier);
    expect(ids.indexOf(older)).toBeLessThan(ids.indexOf(newer));
    const item = response.body.items.find((entry: { publicId: string }) => entry.publicId === older);
    expect(item).toMatchObject({ finalFormStatus: 'failed', estimatedCredit: 0.5, finalCredit: null, level: 'Nasional' });
    expect(item.className).toEqual(expect.any(String));
    expect(response.body.summary.formFailed).toBeGreaterThanOrEqual(1);
  });

  it('filters by classId and rejects bad queries', async () => {
    const response = await request(app).get(`/api/validator/queue?classId=${otherClassId}`).set('Cookie', validatorCookie).expect(200);
    const ids = response.body.items.map((item: { publicId: string }) => item.publicId);
    expect(ids).toContain(otherClass);
    expect(ids).not.toContain(older);
    await request(app).get('/api/validator/queue?classId=abc').set('Cookie', validatorCookie).expect(400);
  });

  it('forbids other roles', async () => {
    await request(app).get('/api/validator/queue').set('Cookie', verifierCookie).expect(403);
    await request(app).get('/api/validator/queue').set('Cookie', studentCookie).expect(403);
  });
});

describe.skipIf(!HAS_DATABASE)('POST /api/validator/submissions/:publicId/credit', () => {
  it('forbids non-validators with 403', async () => {
    const { publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', verifierCookie).send({ finalCredit: 1, reason: 'x' }).expect(403);
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', studentCookie).send({ finalCredit: 1, reason: 'x' }).expect(403);
  });

  it('rejects a missing reason, the same value, and out-of-range credit with 400', async () => {
    const { publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 1 }).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 1, reason: '  ' }).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 0.5, reason: 'sama' }).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 3.5, reason: 'x' }).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 0.125, reason: 'x' }).expect(400);
  });

  it('records who, when, previous vs final, and reason; hides the pending final credit from the student', async () => {
    const { id, publicId } = await createSubmission();
    const first = await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie)
      .send({ finalCredit: 0.75, reason: '  Tingkat lebih tinggi  ' }).expect(200);
    expect(first.body).toMatchObject({ previousCredit: 0.5, finalCredit: 0.75, review: { stage: 'validator', decision: 'adjust_credit', note: 'Tingkat lebih tinggi' } });
    const second = await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie)
      .send({ finalCredit: 1, reason: 'Koreksi lagi' }).expect(200);
    expect(second.body.previousCredit).toBe(0.75);
    const rows = await db.select().from(reviews).where(eq(reviews.submissionId, id)).orderBy(desc(reviews.id));
    expect(rows[0]).toMatchObject({ reviewerId: validatorId, decision: 'adjust_credit', previousCredit: '0.75', adjustedCredit: '1.00', adjustReason: 'Koreksi lagi' });
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
    expect(rows[1]).toMatchObject({ previousCredit: '0.50', adjustedCredit: '0.75', adjustReason: 'Tingkat lebih tinggi' });
    const [row] = await db.select({ status: submissions.status, finalCredit: submissions.finalCredit }).from(submissions).where(eq(submissions.id, id));
    expect(row).toEqual({ status: 'waiting_validator', finalCredit: '1.00' });
    const studentView = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(studentView.body.skem.finalCredit).toBeNull();
    const validatorView = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', validatorCookie).expect(200);
    expect(validatorView.body.skem.finalCredit).toBe(1);
    expect(validatorView.body.reviews.at(-1)).toMatchObject({ decision: 'adjust_credit', note: 'Koreksi lagi' });
  });

  it('returns 409 outside waiting_validator', async () => {
    const { publicId } = await createSubmission({ status: 'waiting_verifier' });
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 1, reason: 'x' }).expect(409);
  });
});

describe.skipIf(!HAS_DATABASE)('POST /api/validator/submissions/:publicId/validate', () => {
  it('approves with final_credit = estimated_credit when unchanged, and the student sees it', async () => {
    const { id, publicId } = await createSubmission({ estimatedCredit: '0.50' });
    const response = await request(app).post(`/api/validator/submissions/${publicId}/validate`).set('Cookie', validatorCookie).send({}).expect(200);
    expect(response.body).toEqual({ status: 'approved', finalCredit: 0.5 });
    const [row] = await db.select({ status: submissions.status, finalCredit: submissions.finalCredit }).from(submissions).where(eq(submissions.id, id));
    expect(row).toEqual({ status: 'approved', finalCredit: '0.50' });
    const detail = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(detail.body).toMatchObject({ status: 'approved', officialStatus: 'disetujui', skem: { finalCredit: 0.5 } });
    expect(detail.body.timeline.at(-1)).toMatchObject({ from: 'waiting_validator', to: 'approved' });
    const notes = await db.select().from(notifications).where(eq(notifications.submissionId, id));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ userId: student.id, channel: 'in_app' });
    expect(notes[0]?.body).toContain('0.50');
  });

  it('uses the last adjusted credit', async () => {
    const { publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/credit`).set('Cookie', validatorCookie).send({ finalCredit: 1.25, reason: 'Juara' }).expect(200);
    const response = await request(app).post(`/api/validator/submissions/${publicId}/validate`).set('Cookie', validatorCookie).send({}).expect(200);
    expect(response.body.finalCredit).toBe(1.25);
  });

  it('rejects a body that tries to set credit, 409 on wrong status, 403 for others', async () => {
    const { publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/validate`).set('Cookie', validatorCookie).send({ finalCredit: 3 }).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/validate`).set('Cookie', verifierCookie).send({}).expect(403);
    const waiting = await createSubmission({ status: 'waiting_verifier' });
    await request(app).post(`/api/validator/submissions/${waiting.publicId}/validate`).set('Cookie', validatorCookie).send({}).expect(409);
  });

  it('lets only one of a concurrent validate/reject pair succeed', async () => {
    const { id, publicId } = await createSubmission();
    const results = await Promise.all([
      request(app).post(`/api/validator/submissions/${publicId}/validate`).set('Cookie', validatorCookie).send({}),
      request(app).post(`/api/validator/submissions/${publicId}/reject`).set('Cookie', validatorCookie).send({ note: 'Tidak valid' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await db.select().from(statusHistory).where(eq(statusHistory.submissionId, id))).toHaveLength(1);
    expect(await db.select().from(notifications).where(eq(notifications.submissionId, id))).toHaveLength(1);
  }, 20000);
});

describe.skipIf(!HAS_DATABASE)('POST /api/validator/submissions/:publicId/reject', () => {
  it('requires a non-blank note', async () => {
    const { publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/reject`).set('Cookie', validatorCookie).send({}).expect(400);
    await request(app).post(`/api/validator/submissions/${publicId}/reject`).set('Cookie', validatorCookie).send({ note: '  ' }).expect(400);
  });

  it('rejects with note, keeps final credit empty, and shows the reason in the student timeline', async () => {
    const { id, publicId } = await createSubmission();
    await request(app).post(`/api/validator/submissions/${publicId}/reject`).set('Cookie', validatorCookie).send({ note: ' Bukti tidak sah ' }).expect(200, { status: 'rejected' });
    const [row] = await db.select({ status: submissions.status, finalCredit: submissions.finalCredit }).from(submissions).where(eq(submissions.id, id));
    expect(row).toEqual({ status: 'rejected', finalCredit: null });
    const detail = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(detail.body.officialStatus).toBe('ditolak');
    expect(detail.body.timeline.at(-1)).toMatchObject({ to: 'rejected', note: 'Bukti tidak sah' });
    expect(detail.body.reviews.at(-1)).toMatchObject({ stage: 'validator', decision: 'reject', note: 'Bukti tidak sah' });
  });

  it('returns 409 outside waiting_validator', async () => {
    const { publicId } = await createSubmission({ status: 'waiting_verifier' });
    await request(app).post(`/api/validator/submissions/${publicId}/reject`).set('Cookie', validatorCookie).send({ note: 'x' }).expect(409);
  });
});
