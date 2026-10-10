import request from 'supertest';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn().mockResolvedValue(undefined),
  download: vi.fn().mockResolvedValue(Buffer.from('89504e470d0a1a0a', 'hex')),
  signedUrl: vi.fn().mockResolvedValue({ url: 'https://storage.test/signed', expiresIn: 60 }),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/storage.js', () => ({
  bucketCertificates: () => 'certificates',
  bucketSignatures: () => 'signatures',
  bucketForms: () => 'forms',
  uploadObject: storageMocks.upload,
  downloadObject: storageMocks.download,
  createSignedUrl: storageMocks.signedUrl,
  removeObject: storageMocks.remove,
}));
import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { creditTable } from '../src/rules/config';
import { agentQuestions, classes, documents, findings, llmCalls, notifications, precheckRuns, statusHistory, submissions, users } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';

let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof createDb>['client'];
let db: ReturnType<typeof createDb>['db'];
let student: { id: number; classId: number | null; name: string; angkatan: number | null };
let otherStudent: { id: number; classId: number | null; name: string; angkatan: number | null };
let studentCookie: string[];
let otherCookie: string[];
let publicId: string;
let submissionId: number;
let runId: number;
const fixtureSubmissionIds: number[] = [];
const originalSignaturePaths = new Map<number, string | null>();

async function loginAs(userId: number): Promise<string[]> {
  const response = await request(app).post('/api/auth/mock-login').send({ userId }).expect(200);
  return [String(response.headers['set-cookie'])];
}

async function setTestSignature(): Promise<void> {
  if (!originalSignaturePaths.has(student.id)) {
    const [row] = await db.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, student.id)).limit(1);
    originalSignaturePaths.set(student.id, row?.signaturePath ?? null);
  }
  await db.update(users).set({ signaturePath: `test/${student.id}/signature.png` }).where(eq(users.id, student.id));
}

async function clearTestSignature(): Promise<void> {
  if (!originalSignaturePaths.has(student.id)) {
    const [row] = await db.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, student.id)).limit(1);
    originalSignaturePaths.set(student.id, row?.signaturePath ?? null);
  }
  await db.update(users).set({ signaturePath: null }).where(eq(users.id, student.id));
}

async function createFixture(status: 'draft' | 'waiting_verifier' | 'approved' = 'draft', reviewStatus: 'ready' | 'needs_fix' = 'ready') {
  publicId = `SKM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const [submission] = await db.insert(submissions).values({
    publicId,
    studentId: student.id,
    classId: student.classId!,
    status,
    reviewStatus,
    activityName: null,
    activityDate: null,
    locationPlatform: null,
    organizer: null,
    attachmentType: null,
    komponen: null,
    categoryCode: null,
    level: null,
    roleInActivity: null,
    achievement: null,
    estimatedCredit: null,
    finalCredit: null,
  }).returning({ id: submissions.id });
  if (!submission) throw new Error('Fixture submission insert failed');
  submissionId = submission.id;
  fixtureSubmissionIds.push(submissionId);
  await db.insert(documents).values({
    submissionId,
    type: 'certificate',
    filePath: `test/${submissionId}.pdf`,
    fileName: 'fixture.pdf',
    mime: 'application/pdf',
    sizeBytes: 128,
    sha256: `test-${submissionId}`,
  });
  const [run] = await db.insert(precheckRuns).values({
    submissionId,
    attempt: 1,
    model: 'test-model',
    status: 'done',
    extracted: {
      document_kind: 'certificate',
      recipient_name: { value: student.name, confidence: 1 },
      activity_name: { value: 'Forum Teknologi', confidence: 1 },
      activity_start_date: { value: null, confidence: 0 },
      activity_end_date: { value: '2026-09-01', confidence: 1 },
      organizer: { value: 'Himpunan', confidence: 1 },
      location_platform: { value: 'Kampus', confidence: 1 },
      role_text: { value: null, confidence: 0 },
      achievement_text: { value: null, confidence: 0 },
      participant_scope_text: { value: null, confidence: 0 },
    },
    classification: { category: [{ code: 'K1-03', confidence: 0.7 }] },
    finishedAt: new Date(),
  }).returning({ id: precheckRuns.id });
  if (!run) throw new Error('Fixture precheck run insert failed');
  await db.insert(agentQuestions).values([
    {
      submissionId,
      runId: run.id,
      seq: 1,
      field: 'participant_scope',
      question: 'Pilih cakupan peserta.',
      options: [{ value: 'national', label: 'Nasional' }],
    },
    {
      submissionId,
      runId: run.id,
      seq: 2,
      field: 'activity_name',
      question: 'Periksa nama kegiatan.',
      options: [],
    },
    {
      submissionId,
      runId: run.id,
      seq: 3,
      field: 'unsupported',
      question: 'Field tidak dikenal.',
      options: [],
    },
  ]);
  runId = run.id;
  await db.insert(findings).values({
    runId,
    checkType: 'category',
    result: 'warn',
    message: 'Kategori perlu diperiksa.',
    data: { code: 'CATEGORY_WARNING' },
  });
  await db.insert(llmCalls).values({
    submissionId,
    runId,
    purpose: 'classify',
    model: 'test-model',
    promptVersion: 'classify-v1',
    promptTokens: 30,
    completionTokens: 10,
    totalTokens: 40,
    cacheHit: false,
  });
}

beforeAll(async () => {
  app = createApp();
  if (!HAS_DATABASE) return;
  ({ client, db } = createDb());
  const students = await db.select({ id: users.id, classId: users.classId, name: users.name, angkatan: users.angkatan })
    .from(users).innerJoin(classes, eq(classes.id, users.classId))
    .where(and(eq(users.role, 'student'), isNotNull(classes.advisorId))).limit(2);
  const first = students[0];
  const second = students[1];
  if (!first || !second || first.classId === null) throw new Error('Seed requires two students with classes');
  student = first;
  otherStudent = second;
  studentCookie = await loginAs(student.id);
  otherCookie = await loginAs(otherStudent.id);
});

afterAll(async () => {
  if (!HAS_DATABASE) return;
  if (fixtureSubmissionIds.length) await db.delete(llmCalls).where(inArray(llmCalls.submissionId, fixtureSubmissionIds));
  for (const id of fixtureSubmissionIds) await db.delete(submissions).where(eq(submissions.id, id));
  for (const [userId, signaturePath] of originalSignaturePaths) {
    await db.update(users).set({ signaturePath }).where(eq(users.id, userId));
  }
  await client.end();
});

describe.skipIf(!HAS_DATABASE)('GET /api/submissions/:publicId', () => {
  beforeAll(async () => createFixture());

  it('returns nullable draft metadata, latest findings, timeline, and token usage', async () => {
    const response = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(response.body.activity.activityDate).toBeNull();
    expect(response.body.skem.komponen).toBeNull();
    expect(response.body.skem.candidates.category).toEqual([{ code: 'K1-03', label: 'K1-03', confidence: 0.7 }]);
    expect(response.body.findings).toEqual(expect.arrayContaining([expect.objectContaining({ checkType: 'category', result: 'warn' })]));
    expect(response.body.tokenUsage).toEqual({ calls: 1, promptTokens: 30, completionTokens: 10, cacheHits: 0 });
  });

  it('hides another student submission as 404', async () => {
    await request(app).get(`/api/submissions/${publicId}`).set('Cookie', otherCookie).expect(404);
  });

  it('rechecks edited metadata without adding LLM calls', async () => {
    const before = await db.select({ id: llmCalls.id }).from(llmCalls).where(eq(llmCalls.submissionId, submissionId));
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Seminar Teknologi' } }).expect(200);
    expect(response.body.activity.activityName).toBe('Seminar Teknologi');
    const after = await db.select({ id: llmCalls.id }).from(llmCalls).where(eq(llmCalls.submissionId, submissionId));
    expect(after).toHaveLength(before.length);
  });

  it('rejects answers outside the question option list', async () => {
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions).where(eq(agentQuestions.submissionId, submissionId)).limit(1);
    if (!question) throw new Error('Question fixture missing');
    const response = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie).send({ questionId: question.id, answer: 'international' });
    expect(response.status).toBe(400);
  });

  it('stores a valid answer and returns updated detail', async () => {
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions).where(eq(agentQuestions.submissionId, submissionId)).limit(1);
    if (!question) throw new Error('Question fixture missing');
    const response = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie).send({ questionId: question.id, answer: 'national' }).expect(200);
    expect(response.body.questions[0].answer).toBe('national');
  });

  it('serializes concurrent metadata edits without losing fields', async () => {
    await createFixture('draft', 'ready');
    const editId = publicId;
    const results = await Promise.all([
      request(app).patch(`/api/submissions/${editId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Concurrent event' } }),
      request(app).patch(`/api/submissions/${editId}`).set('Cookie', studentCookie).send({ activity: { locationPlatform: 'Auditorium' } }),
    ]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    const response = await request(app).get(`/api/submissions/${editId}`).set('Cookie', studentCookie).expect(200);
    expect(response.body.activity.activityName).toBe('Concurrent event');
    expect(response.body.activity.locationPlatform).toBe('Auditorium');
  });

  it('rejects empty-option answers for fields without free-text support', async () => {
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions)
      .where(and(eq(agentQuestions.submissionId, submissionId), eq(agentQuestions.field, 'unsupported'))).limit(1);
    if (!question) throw new Error('Unsupported question fixture missing');
    const response = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie)
      .send({ questionId: question.id, answer: 'arbitrary-value' });
    expect(response.status).toBe(400);
  });

  it('accepts free-text activity dates only in real YYYY-MM-DD form', async () => {
    await createFixture('draft', 'needs_fix');
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions)
      .where(and(eq(agentQuestions.submissionId, submissionId), eq(agentQuestions.field, 'unsupported'))).limit(1);
    if (!question) throw new Error('Date question fixture missing');
    await db.update(agentQuestions).set({ field: 'activity_date' }).where(eq(agentQuestions.id, question.id));
    const invalid = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie)
      .send({ questionId: question.id, answer: '2026-02-30' });
    expect(invalid.status).toBe(400);
    const valid = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie)
      .send({ questionId: question.id, answer: '2026-09-01' }).expect(200);
    expect(valid.body.activity.activityDate).toBe('2026-09-01');
  }, 20000);

  it('rechecks activity-name answers into saved metadata', async () => {
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions)
      .where(and(eq(agentQuestions.submissionId, submissionId), eq(agentQuestions.field, 'activity_name'))).limit(1);
    if (!question) throw new Error('Activity-name question fixture missing');
    const response = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie)
      .send({ questionId: question.id, answer: 'Nama dari jawaban' }).expect(200);
    expect(response.body.activity.activityName).toBe('Nama dari jawaban');
  });

  it('lets explicit metadata override a previously saved free-text answer', async () => {
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie)
      .send({ activity: { activityName: 'Nama manual' } }).expect(200);
    expect(response.body.activity.activityName).toBe('Nama manual');
    expect(response.body.questions.find((item: { field: string }) => item.field === 'activity_name').answer).toBeNull();
  }, 20000);

  it('lets explicit metadata level override an older scope answer without LLM calls', async () => {
    const entry = creditTable.entries.find((item) => item.level === 'Regional' && item.role !== null);
    if (!entry || !entry.role) throw new Error('Credit table fixture missing regional role row');
    const before = await db.select({ id: llmCalls.id }).from(llmCalls).where(eq(llmCalls.submissionId, submissionId));
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({
      activity: { activityName: 'Lomba Inovasi', activityDate: '2026-09-01' },
      skem: { categoryCode: entry.categoryCode, level: entry.level, roleInActivity: entry.role, achievement: entry.role },
    }).expect(200);
    expect(response.body.reviewStatus).toBe('ready');
    expect(response.body.skem.level).toBe('Regional');
    expect(response.body.skem.estimatedCredit).toBe(entry.credit);
    expect(response.body.deadline).toMatchObject({ result: 'pass', validFrom: expect.any(String), validTo: expect.any(String) });
    expect(response.body.questions[0].answer).toBeNull();
    const after = await db.select({ id: llmCalls.id }).from(llmCalls).where(eq(llmCalls.submissionId, submissionId));
    expect(after).toHaveLength(before.length);
  }, 20000);

  it('does not resurrect a saved participant scope when level is explicitly cleared', async () => {
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions)
      .where(and(eq(agentQuestions.submissionId, submissionId), eq(agentQuestions.field, 'participant_scope'))).limit(1);
    if (!question) throw new Error('Participant-scope question fixture missing');
    await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie)
      .send({ questionId: question.id, answer: 'national' }).expect(200);
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie)
      .send({ skem: { level: null } }).expect(200);
    expect(response.body.skem.level).toBeNull();
    expect(response.body.questions.find((item: { field: string }) => item.field === 'participant_scope').answer).toBeNull();
  }, 30000);

  it('rejects identity changes in PATCH body', async () => {
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Changed', nrp: '999' } });
    expect(response.status).toBe(400);
  });

  it('rejects edits after submission', async () => {
    await db.update(submissions).set({ status: 'waiting_verifier' }).where(eq(submissions.id, submissionId));
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Changed' } });
    expect(response.status).toBe(409);
  });

  it('does not let edits revive a cancelled submission', async () => {
    await createFixture('draft', 'needs_fix');
    await db.update(submissions).set({ reviewStatus: 'cancelled' }).where(eq(submissions.id, submissionId));
    const response = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Changed' } });
    expect(response.status).toBe(409);
  });

  it('blocks edits while reanalysis is queued to prevent stale-document approval', async () => {
    await createFixture('draft', 'ready');
    await db.update(submissions).set({ reviewStatus: 'queued' }).where(eq(submissions.id, submissionId));
    const patch = await request(app).patch(`/api/submissions/${publicId}`).set('Cookie', studentCookie).send({ activity: { activityName: 'Changed' } });
    expect(patch.status).toBe(409);
    const [question] = await db.select({ id: agentQuestions.id }).from(agentQuestions).where(eq(agentQuestions.submissionId, submissionId)).limit(1);
    if (!question) throw new Error('Question fixture missing');
    const answer = await request(app).post(`/api/submissions/${publicId}/answers`).set('Cookie', studentCookie).send({ questionId: question.id, answer: 'national' });
    expect(answer.status).toBe(409);
  });

  it('requires the student signature before submit', async () => {
    await clearTestSignature();
    await createFixture('draft', 'ready');
    const response = await request(app).post('/api/submissions/submit').set('Cookie', studentCookie).send({ publicIds: [publicId] });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SIGNATURE_REQUIRED');
  });

  it('submits ready rows only and skips needs_fix with reason', async () => {
    await setTestSignature();
    await createFixture('draft', 'ready');
    const readyId = publicId;
    const readySubmissionId = submissionId;
    await createFixture('draft', 'needs_fix');
    const fixId = publicId;
    const response = await request(app).post('/api/submissions/submit').set('Cookie', studentCookie).send({ publicIds: [readyId, fixId] }).expect(200);
    expect(response.body.submitted).toEqual([readyId]);
    expect(response.body.skipped).toEqual([expect.objectContaining({ publicId: fixId, reason: expect.any(String) })]);
    const [updated] = await db.select().from(submissions).where(eq(submissions.id, readySubmissionId));
    if (!updated) throw new Error('Submitted fixture missing');
    expect(updated.status).toBe('waiting_verifier');
    expect(updated.submittedAt).toBeInstanceOf(Date);
    const history = await db.select().from(statusHistory).where(eq(statusHistory.submissionId, readySubmissionId));
    expect(history.some((item) => item.field === 'status' && item.note?.toLowerCase().includes('tanda tangan'))).toBe(true);
    const [classRow] = await db.select({ advisorId: classes.advisorId }).from(classes).where(eq(classes.id, student.classId!));
    if (!classRow?.advisorId) throw new Error('Seed class requires assigned verifier');
    const items = await db.select().from(notifications).where(eq(notifications.submissionId, readySubmissionId));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ userId: classRow.advisorId, channel: 'in_app' });
    const secondAttempt = await request(app).post('/api/submissions/submit').set('Cookie', studentCookie).send({ publicIds: [readyId] });
    expect(secondAttempt.status).toBe(409);
  }, 15000);

  it('serializes concurrent submit attempts without duplicate writes or 500', async () => {
    await createFixture('draft', 'ready');
    const raceId = publicId;
    const body = { publicIds: [raceId] };
    const results = await Promise.all([
      request(app).post('/api/submissions/submit').set('Cookie', studentCookie).send(body),
      request(app).post('/api/submissions/submit').set('Cookie', studentCookie).send(body),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const [row] = await db.select().from(submissions).where(eq(submissions.publicId, raceId));
    if (!row) throw new Error('Raced submission missing');
    expect(row.status).toBe('waiting_verifier');
    const history = await db.select().from(statusHistory).where(eq(statusHistory.submissionId, row.id));
    expect(history.filter((item) => item.field === 'status')).toHaveLength(1);
    const alertRows = await db.select().from(notifications).where(eq(notifications.submissionId, row.id));
    expect(alertRows).toHaveLength(1);
  });

  it('stores only own private signature from PNG data URL and serves own bytes', async () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';
    storageMocks.upload.mockClear();
    const uploaded = await request(app).put('/api/me/signature').set('Cookie', studentCookie).send({ dataUrl: pngDataUrl }).expect(200);
    expect(uploaded.body.hasSignature).toBe(true);
    expect(storageMocks.upload).toHaveBeenCalledWith('signatures', expect.stringContaining(`/${student.id}/`), expect.any(Buffer), 'image/png');
    const [account] = await db.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, student.id));
    if (!account) throw new Error('Student fixture missing');
    expect(account.signaturePath).toBeTruthy();
    originalSignaturePaths.set(student.id, originalSignaturePaths.get(student.id) ?? null);
    const image = await request(app).get('/api/me/signature').query({ userId: otherStudent.id }).set('Cookie', studentCookie).expect(200);
    expect(image.headers['content-type']).toContain('image/png');
    expect(image.headers['cache-control']).toBe('private, no-store');
    expect(storageMocks.download).toHaveBeenCalledWith('signatures', account.signaturePath);
    await request(app).get('/api/me/signature').set('Cookie', otherCookie).expect(404);
  });

  it('rejects signature data URL larger than 1 MB', async () => {
    const dataUrl = `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString('base64')}`;
    const response = await request(app).put('/api/me/signature').set('Cookie', studentCookie).send({ dataUrl });
    expect(response.status).toBe(413);
  });

  it('maps requests beyond JSON parser limit to 413 instead of 500', async () => {
    const dataUrl = `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024).toString('base64')}`;
    const response = await request(app).put('/api/me/signature').set('Cookie', studentCookie).send({ dataUrl });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  }, 15000);

  it('returns progress using approved credits only', async () => {
    const baselineRows = await db.select({ komponen: submissions.komponen, earned: sql<string>`coalesce(sum(${submissions.finalCredit}), 0)` })
      .from(submissions).where(and(eq(submissions.studentId, student.id), eq(submissions.status, 'approved'))).groupBy(submissions.komponen);
    const baseline = new Map(baselineRows.map((row) => [row.komponen, Number(row.earned)]));
    const figures = [
      { component: 1, credit: '0.50', status: 'approved' as const },
      { component: 2, credit: '0.25', status: 'approved' as const },
      { component: 3, credit: '0.75', status: 'approved' as const },
      { component: 1, credit: '9.00', status: 'waiting_verifier' as const },
    ];
    for (const item of figures) {
      await createFixture(item.status, 'ready');
      await db.update(submissions).set({ komponen: item.component, finalCredit: item.credit }).where(eq(submissions.id, submissionId));
    }
    const response = await request(app).get('/api/me/progress').set('Cookie', studentCookie).expect(200);
    const expected = [
      { komponen: 1, target: 1.25, earned: (baseline.get(1) ?? 0) + 0.5 },
      { komponen: 2, target: 0.5, earned: (baseline.get(2) ?? 0) + 0.25 },
      { komponen: 3, target: 1.25, earned: (baseline.get(3) ?? 0) + 0.75 },
    ];
    expect(response.body.komponen).toEqual(expected);
    const expectedTotal = expected.reduce((total, row) => total + row.earned, 0);
    expect(response.body.total).toBe(expectedTotal);
    expect(response.body.target).toBe(3);
    expect(response.body.fulfilled).toBe(expectedTotal >= 3);
  }, 15000);

  it('creates a 60-second certificate URL only for authorized owner', async () => {
    await createFixture('draft', 'ready');
    const certificateId = publicId;
    storageMocks.signedUrl.mockClear();
    const response = await request(app).get(`/api/submissions/${certificateId}/certificate`).set('Cookie', studentCookie).expect(200);
    expect(response.body).toEqual({ url: 'https://storage.test/signed', expiresIn: 60 });
    expect(storageMocks.signedUrl).toHaveBeenCalledWith('certificates', expect.stringContaining(`/${submissionId}.pdf`));
    await request(app).get(`/api/submissions/${certificateId}/certificate`).set('Cookie', otherCookie).expect(404);
  });

  it('serves the final form URL only when ready and only to owner or the class verifier', async () => {
    await createFixture('waiting_verifier', 'ready');
    const verifiers = await db.select({ id: users.id, classId: users.classId }).from(users).where(eq(users.role, 'verifier'));
    const ownVerifier = verifiers.find((v) => v.classId === student.classId);
    const otherVerifier = verifiers.find((v) => v.classId !== null && v.classId !== student.classId);
    if (!ownVerifier || !otherVerifier) throw new Error('Seed requires verifiers for two classes');
    const url = `/api/submissions/${publicId}/final-form`;

    await request(app).get(url).set('Cookie', studentCookie).expect(404);

    const path = `${student.id}/${publicId}-final.pdf`;
    await db.update(submissions).set({ finalFormStatus: 'ready', finalFormPath: path }).where(eq(submissions.id, submissionId));
    storageMocks.signedUrl.mockClear();
    const response = await request(app).get(url).set('Cookie', studentCookie).expect(200);
    expect(response.body).toEqual({ url: 'https://storage.test/signed', expiresIn: 60 });
    expect(storageMocks.signedUrl).toHaveBeenCalledWith('forms', path);
    await request(app).get(url).set('Cookie', await loginAs(ownVerifier.id)).expect(200);

    await request(app).get(url).set('Cookie', otherCookie).expect(404);
    await request(app).get(url).set('Cookie', await loginAs(otherVerifier.id)).expect(404);
  });
});
