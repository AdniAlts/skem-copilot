import request from 'supertest';
import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const hookMock = vi.hoisted(() => ({ onVerifierApproved: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/services/verifier-hooks.js', () => hookMock);

import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { classes, notifications, reviews, statusHistory, submissions, users } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';

let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof createDb>['client'];
let db: ReturnType<typeof createDb>['db'];
let student: { id: number; classId: number };
let verifierId: number;
let otherVerifierId: number;
let studentCookie: string[];
let verifierCookie: string[];
let otherVerifierCookie: string[];
const fixtureIds: number[] = [];
const originalSignatures = new Map<number, string | null>();

async function loginAs(userId: number): Promise<string[]> {
  const response = await request(app).post('/api/auth/mock-login').send({ userId }).expect(200);
  return [String(response.headers['set-cookie'])];
}

async function setSignature(userId: number, value: string | null): Promise<void> {
  if (!originalSignatures.has(userId)) {
    const [row] = await db.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, userId)).limit(1);
    originalSignatures.set(userId, row?.signaturePath ?? null);
  }
  await db.update(users).set({ signaturePath: value }).where(eq(users.id, userId));
}

async function createSubmission(options: {
  status?: 'draft' | 'waiting_verifier';
  classId?: number;
  warnings?: { code: string; message: string }[];
  submittedAt?: Date;
} = {}): Promise<string> {
  const publicId = `SKM-${Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0')}`;
  const [row] = await db.insert(submissions).values({
    publicId,
    studentId: student.id,
    classId: options.classId ?? student.classId,
    status: options.status ?? 'waiting_verifier',
    reviewStatus: 'ready',
    activityName: `Kegiatan ${publicId}`,
    categoryCode: 'K1-03',
    level: 'Nasional',
    estimatedCredit: '0.50',
    warnings: options.warnings ?? [],
    submittedAt: options.submittedAt ?? new Date(),
  }).returning({ id: submissions.id });
  if (!row) throw new Error('Fixture insert failed');
  fixtureIds.push(row.id);
  return publicId;
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
  verifierId = first.advisorId;
  const [other] = await db.select({ advisorId: classes.advisorId }).from(classes)
    .where(and(ne(classes.id, first.classId), isNotNull(classes.advisorId))).limit(1);
  if (!other?.advisorId) throw new Error('Seed requires a second class with an advisor');
  otherVerifierId = other.advisorId;
  studentCookie = await loginAs(student.id);
  verifierCookie = await loginAs(verifierId);
  otherVerifierCookie = await loginAs(otherVerifierId);
});

beforeEach(() => {
  hookMock.onVerifierApproved.mockReset().mockResolvedValue(undefined);
});

afterAll(async () => {
  if (!HAS_DATABASE) return;
  if (fixtureIds.length) await db.delete(submissions).where(inArray(submissions.id, fixtureIds));
  for (const [userId, signaturePath] of originalSignatures) {
    await db.update(users).set({ signaturePath }).where(eq(users.id, userId));
  }
  await client.end();
});

describe.skipIf(!HAS_DATABASE)('GET /api/verifier/queue', () => {
  let clean: string;
  let flagged: string;
  let otherClass: string;

  beforeAll(async () => {
    const [otherClassRow] = await db.select({ id: classes.id }).from(classes).where(eq(classes.advisorId, otherVerifierId)).limit(1);
    clean = await createSubmission({ submittedAt: new Date('2026-10-01T00:00:00Z') });
    flagged = await createSubmission({ warnings: [{ code: 'NAME_MISMATCH', message: 'Nama berbeda.' }], submittedAt: new Date('2026-10-02T00:00:00Z') });
    otherClass = await createSubmission({ classId: otherClassRow!.id });
    await createSubmission({ status: 'draft' });
  });

  it('lists only the verifier class waiting submissions, oldest first by default', async () => {
    const response = await request(app).get('/api/verifier/queue').set('Cookie', verifierCookie).expect(200);
    const ids = response.body.items.map((item: { publicId: string }) => item.publicId);
    expect(ids).toEqual(expect.arrayContaining([clean, flagged]));
    expect(ids).not.toContain(otherClass);
    expect(ids.indexOf(clean)).toBeLessThan(ids.indexOf(flagged));
    expect(response.body.summary.waiting).toBeGreaterThanOrEqual(2);
    expect(response.body.summary.withWarnings).toBeGreaterThanOrEqual(1);
    const item = response.body.items.find((entry: { publicId: string }) => entry.publicId === flagged);
    expect(item).toMatchObject({ aiStatus: 'warning', flagCount: 1, level: 'Nasional', estimatedCredit: 0.5 });
    expect(item.categoryLabel).not.toBe('K1-03');
    const other = await request(app).get('/api/verifier/queue').set('Cookie', otherVerifierCookie).expect(200);
    const otherIds = other.body.items.map((entry: { publicId: string }) => entry.publicId);
    expect(otherIds).toContain(otherClass);
    expect(otherIds).not.toContain(clean);
  });

  it('filters by aiStatus and sorts by flags', async () => {
    const warning = await request(app).get('/api/verifier/queue?aiStatus=warning').set('Cookie', verifierCookie).expect(200);
    expect(warning.body.items.every((item: { aiStatus: string }) => item.aiStatus === 'warning')).toBe(true);
    expect(warning.body.items.map((item: { publicId: string }) => item.publicId)).toContain(flagged);
    const byFlags = await request(app).get('/api/verifier/queue?sort=flags').set('Cookie', verifierCookie).expect(200);
    expect(byFlags.body.items[0].flagCount).toBeGreaterThanOrEqual(byFlags.body.items.at(-1).flagCount);
    await request(app).get('/api/verifier/queue?aiStatus=ready').set('Cookie', verifierCookie).expect(400);
  });

  it('forbids non-verifier roles', async () => {
    await request(app).get('/api/verifier/queue').set('Cookie', studentCookie).expect(403);
  });

  it('hides other-class submissions from detail and decisions', async () => {
    await request(app).get(`/api/submissions/${otherClass}`).set('Cookie', verifierCookie).expect(404);
    await setSignature(verifierId, `test/${verifierId}/signature.png`);
    await request(app).post(`/api/verifier/submissions/${otherClass}/approve`).set('Cookie', verifierCookie).send({}).expect(404);
    await request(app).post(`/api/verifier/submissions/${otherClass}/reject`).set('Cookie', verifierCookie).send({ note: 'Bukan kelas saya' }).expect(404);
  });
});

describe.skipIf(!HAS_DATABASE)('POST /api/verifier/submissions/:publicId/approve', () => {
  it('requires a stored verifier signature', async () => {
    const publicId = await createSubmission();
    await setSignature(verifierId, null);
    const response = await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(409);
    expect(response.body.error.code).toBe('SIGNATURE_REQUIRED');
    const [row] = await db.select({ status: submissions.status }).from(submissions).where(eq(submissions.publicId, publicId));
    expect(row?.status).toBe('waiting_verifier');
  });

  it('rejects decisions outside waiting_verifier', async () => {
    const publicId = await createSubmission({ status: 'draft' });
    await setSignature(verifierId, `test/${verifierId}/signature.png`);
    await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(409);
    await request(app).post(`/api/verifier/submissions/${publicId}/reject`).set('Cookie', verifierCookie).send({ note: 'x' }).expect(409);
  });

  it('approves with signature, records review, history, notification, and calls the hook after commit', async () => {
    const publicId = await createSubmission();
    await setSignature(verifierId, `test/${verifierId}/signature.png`);
    let statusSeenByHook: string | undefined;
    hookMock.onVerifierApproved.mockImplementation(async (id: number) => {
      const [row] = await db.select({ status: submissions.status }).from(submissions).where(eq(submissions.id, id));
      statusSeenByHook = row?.status;
    });
    const response = await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({ note: 'Lengkap' }).expect(200);
    expect(response.body).toEqual({ status: 'waiting_validator', finalForm: { status: 'none' } });
    expect(hookMock.onVerifierApproved).toHaveBeenCalledTimes(1);
    expect(statusSeenByHook).toBe('waiting_validator');
    const [submission] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.publicId, publicId));
    const reviewRows = await db.select().from(reviews).where(eq(reviews.submissionId, submission!.id));
    expect(reviewRows).toHaveLength(1);
    expect(reviewRows[0]).toMatchObject({ stage: 'verifier', decision: 'approve', signatureApplied: true, note: 'Lengkap', reviewerId: verifierId });
    const notes = await db.select().from(notifications).where(eq(notifications.submissionId, submission!.id));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ userId: student.id, channel: 'in_app', triggerReviewId: reviewRows[0]!.id });
    const detail = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(detail.body.timeline.at(-1)).toMatchObject({ from: 'waiting_verifier', to: 'waiting_validator', note: 'Lengkap' });
    expect(detail.body.reviews.at(-1)).toMatchObject({ stage: 'verifier', decision: 'approve', note: 'Lengkap' });
  });

  it('keeps the approval when the post-commit hook fails', async () => {
    const publicId = await createSubmission();
    await setSignature(verifierId, `test/${verifierId}/signature.png`);
    hookMock.onVerifierApproved.mockRejectedValue(new Error('pdf failed'));
    await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(200);
    const [row] = await db.select({ status: submissions.status }).from(submissions).where(eq(submissions.publicId, publicId));
    expect(row?.status).toBe('waiting_validator');
  });

  it('lets only one of two concurrent approvals succeed', async () => {
    const publicId = await createSubmission();
    await setSignature(verifierId, `test/${verifierId}/signature.png`);
    const results = await Promise.all([
      request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}),
      request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const [submission] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.publicId, publicId));
    expect(await db.select().from(reviews).where(eq(reviews.submissionId, submission!.id))).toHaveLength(1);
    expect(await db.select().from(statusHistory).where(eq(statusHistory.submissionId, submission!.id))).toHaveLength(1);
    expect(await db.select().from(notifications).where(eq(notifications.submissionId, submission!.id))).toHaveLength(1);
  }, 20000);
});

describe.skipIf(!HAS_DATABASE)('POST /api/verifier/submissions/:publicId/reject', () => {
  it('requires a non-blank note', async () => {
    const publicId = await createSubmission();
    await request(app).post(`/api/verifier/submissions/${publicId}/reject`).set('Cookie', verifierCookie).send({}).expect(400);
    await request(app).post(`/api/verifier/submissions/${publicId}/reject`).set('Cookie', verifierCookie).send({ note: '   ' }).expect(400);
  });

  it('enforces the reject note CHECK constraint in the database', async () => {
    const publicId = await createSubmission();
    const [submission] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.publicId, publicId));
    await expect(db.insert(reviews).values({ submissionId: submission!.id, reviewerId: verifierId, stage: 'verifier', decision: 'reject', note: '   ' }))
      .rejects.toThrow();
  });

  it('rejects with note, records history and notifies the student', async () => {
    const publicId = await createSubmission();
    await setSignature(verifierId, null);
    await request(app).post(`/api/verifier/submissions/${publicId}/reject`).set('Cookie', verifierCookie).send({ note: '  Sertifikat buram  ' }).expect(200, { status: 'rejected' });
    expect(hookMock.onVerifierApproved).not.toHaveBeenCalled();
    const detail = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(detail.body.status).toBe('rejected');
    expect(detail.body.officialStatus).toBe('ditolak');
    expect(detail.body.timeline.at(-1)).toMatchObject({ to: 'rejected', note: 'Sertifikat buram' });
    expect(detail.body.reviews.at(-1)).toMatchObject({ decision: 'reject', note: 'Sertifikat buram' });
    const [submission] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.publicId, publicId));
    const [review] = await db.select().from(reviews).where(eq(reviews.submissionId, submission!.id));
    expect(review?.signatureApplied).toBe(false);
    const notes = await db.select().from(notifications).where(eq(notifications.submissionId, submission!.id));
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toContain('Sertifikat buram');
  });

  it('gives verifiers no metadata write path', async () => {
    const publicId = await createSubmission();
    await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', verifierCookie).send({ activity: { activityName: 'Ubah' } }).expect(403);
    await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', verifierCookie).send({ questionId: 1, answer: 'x' }).expect(403);
  });
});
