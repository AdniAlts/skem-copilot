import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import request from 'supertest';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { extractText, getDocumentProxy } from 'unpdf';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    upload: vi.fn(async (bucket: string, path: string, data: Buffer) => {
      objects.set(`${bucket}/${path}`, Buffer.from(data));
    }),
    download: vi.fn(async (bucket: string, path: string) => {
      const value = objects.get(`${bucket}/${path}`);
      if (!value) throw new Error(`Storage download gagal: ${bucket}/${path}`);
      return value;
    }),
    signedUrl: vi.fn(async (bucket: string, path: string) => ({ url: `https://storage.test/${bucket}/${path}?token=x`, expiresIn: 60 })),
    remove: vi.fn(async () => undefined),
  };
});

vi.mock('../src/services/storage.js', () => ({
  bucketCertificates: () => 'certificates',
  bucketSignatures: () => 'signatures',
  bucketForms: () => 'forms',
  uploadObject: store.upload,
  downloadObject: store.download,
  createSignedUrl: store.signedUrl,
  removeObject: store.remove,
}));

import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { classes, documents, submissions, users } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';

const fixturePdf = resolve(__dirname, '../../../data/testset/cases/c001_juara2_lomba_desain.pdf');

let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof createDb>['client'];
let db: ReturnType<typeof createDb>['db'];
let student: { id: number; classId: number };
let verifierId: number;
let otherStudentId: number;
let studentCookie: string[];
let otherStudentCookie: string[];
let verifierCookie: string[];
let validatorCookie: string[];
let unitCookie: string[];
let certificate: Buffer;
let signaturePng: Buffer;
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
  if (value) store.objects.set(`signatures/${value}`, signaturePng);
}

async function createWaitingVerifier(): Promise<{ id: number; publicId: string }> {
  const publicId = `SKM-${Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0')}`;
  const [row] = await db.insert(submissions).values({
    publicId,
    studentId: student.id,
    classId: student.classId,
    status: 'waiting_verifier',
    reviewStatus: 'ready',
    activityName: 'Lomba Desain Poster Nasional',
    activityDate: '2026-05-15',
    locationPlatform: 'Online',
    organizer: 'Forum Komunikasi Desain Kreatif Mahasiswa',
    attachmentType: 'Sertifikat',
    categoryCode: 'K1-03',
    level: 'Nasional',
    estimatedCredit: '0.50',
    submittedAt: new Date('2026-10-08T03:00:00Z'),
  }).returning({ id: submissions.id });
  if (!row) throw new Error('Fixture insert failed');
  fixtureIds.push(row.id);
  const filePath = `${student.id}/${publicId}.pdf`;
  await db.insert(documents).values({
    submissionId: row.id,
    type: 'certificate',
    filePath,
    fileName: 'sertifikat.pdf',
    mime: 'application/pdf',
    sizeBytes: certificate.length,
    sha256: `test-${row.id}`,
  });
  store.objects.set(`certificates/${filePath}`, certificate);
  return { id: row.id, publicId };
}

async function formStatus(id: number) {
  const [row] = await db.select({ status: submissions.status, finalFormStatus: submissions.finalFormStatus, finalFormPath: submissions.finalFormPath })
    .from(submissions).where(eq(submissions.id, id));
  return row;
}

beforeAll(async () => {
  app = createApp();
  certificate = await readFile(fixturePdf);
  signaturePng = await sharp({ create: { width: 300, height: 100, channels: 4, background: { r: 10, g: 20, b: 120, alpha: 1 } } }).png().toBuffer();
  if (!HAS_DATABASE) return;
  ({ client, db } = createDb());
  const pairs = await db.select({ id: users.id, classId: users.classId, advisorId: classes.advisorId })
    .from(users).innerJoin(classes, eq(classes.id, users.classId))
    .where(and(eq(users.role, 'student'), isNotNull(classes.advisorId), isNotNull(users.nrp))).limit(2);
  const first = pairs[0];
  const second = pairs[1];
  if (!first || !second || first.classId === null || first.advisorId === null) throw new Error('Seed requires two students in classes with advisors');
  student = { id: first.id, classId: first.classId };
  verifierId = first.advisorId;
  otherStudentId = second.id;
  const [validator] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'validator')).limit(1);
  const [unit] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'unit')).limit(1);
  if (!validator || !unit) throw new Error('Seed requires validator and unit accounts');
  studentCookie = await loginAs(student.id);
  otherStudentCookie = await loginAs(otherStudentId);
  verifierCookie = await loginAs(verifierId);
  validatorCookie = await loginAs(validator.id);
  unitCookie = await loginAs(unit.id);
});

beforeEach(async () => {
  if (!HAS_DATABASE) return;
  store.upload.mockClear();
  await setSignature(student.id, `users/${student.id}/signature.png`);
  await setSignature(verifierId, `users/${verifierId}/signature.png`);
});

afterAll(async () => {
  if (!HAS_DATABASE) return;
  if (fixtureIds.length) await db.delete(submissions).where(inArray(submissions.id, fixtureIds));
  for (const [userId, signaturePath] of originalSignatures) {
    await db.update(users).set({ signaturePath }).where(eq(users.id, userId));
  }
  await client.end();
});

describe.skipIf(!HAS_DATABASE)('final form after verifier approval', () => {
  it('generates a ready final form with both signatures and the attached certificate', async () => {
    const { id, publicId } = await createWaitingVerifier();
    const response = await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(200);
    expect(response.body).toEqual({ status: 'waiting_validator', finalForm: { status: 'ready' } });
    expect(await formStatus(id)).toEqual({ status: 'waiting_validator', finalFormStatus: 'ready', finalFormPath: `${publicId}/final-form.pdf` });

    const pdfBytes = store.objects.get(`forms/${publicId}/final-form.pdf`);
    expect(pdfBytes).toBeDefined();
    const pdf = await PDFDocument.load(pdfBytes!);
    const certificatePages = (await PDFDocument.load(certificate)).getPageCount();
    expect(pdf.getPageCount()).toBe(1 + certificatePages);
    expect(pdfBytes!.toString('latin1').match(/\/Subtype \/Image/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdfBytes!)), { mergePages: false });
    expect(text[0]).toContain('Lomba Desain Poster Nasional');
    expect(text[0]).toContain('Disetujui');
    expect(text[1]).toContain('Lampiran Bukti Kegiatan');
    expect(text[1]).toContain('BUDI SANTOSO');

    const detail = await request(app).get(`/api/submissions/${publicId}`).set('Cookie', studentCookie).expect(200);
    expect(detail.body.finalForm).toEqual({ status: 'ready' });
  });

  it('keeps the approval and marks failed when a signature is missing, then regenerate succeeds', async () => {
    const { id, publicId } = await createWaitingVerifier();
    await setSignature(student.id, null);
    const response = await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(200);
    expect(response.body).toEqual({ status: 'waiting_validator', finalForm: { status: 'failed' } });
    expect(await formStatus(id)).toMatchObject({ status: 'waiting_validator', finalFormStatus: 'failed', finalFormPath: null });
    await request(app).get(`/api/submissions/${publicId}/final-form`).set('Cookie', validatorCookie).expect(404);

    const queue = await request(app).get('/api/validator/queue').set('Cookie', validatorCookie).expect(200);
    expect(queue.body.items.find((item: { publicId: string }) => item.publicId === publicId)?.finalFormStatus).toBe('failed');

    const stillFailing = await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', validatorCookie).expect(200);
    expect(stillFailing.body).toEqual({ finalForm: { status: 'failed' } });

    await setSignature(student.id, `users/${student.id}/signature.png`);
    const regenerated = await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', validatorCookie).expect(200);
    expect(regenerated.body).toEqual({ finalForm: { status: 'ready' } });
    expect(await formStatus(id)).toMatchObject({ finalFormStatus: 'ready', finalFormPath: `${publicId}/final-form.pdf` });
    await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', validatorCookie).expect(409);
  }, 20000);

  it('marks failed when the stored certificate is not a valid PDF', async () => {
    const { id, publicId } = await createWaitingVerifier();
    const [doc] = await db.select({ filePath: documents.filePath }).from(documents).where(eq(documents.submissionId, id));
    store.objects.set(`certificates/${doc!.filePath}`, Buffer.from('not a pdf'));
    const response = await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(200);
    expect(response.body.finalForm.status).toBe('failed');
    expect(await formStatus(id)).toMatchObject({ status: 'waiting_validator', finalFormStatus: 'failed' });
  });

  it('restricts regenerate-form to validators and waiting_validator submissions', async () => {
    const { publicId } = await createWaitingVerifier();
    await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', validatorCookie).expect(409);
    await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', verifierCookie).expect(403);
    await request(app).post(`/api/validator/submissions/${publicId}/regenerate-form`).set('Cookie', studentCookie).expect(403);
  });
});

describe.skipIf(!HAS_DATABASE)('GET /api/submissions/:publicId/final-form', () => {
  let publicId: string;

  beforeAll(async () => {
    const created = await createWaitingVerifier();
    publicId = created.publicId;
    store.objects.set(`signatures/users/${student.id}/signature.png`, signaturePng);
    store.objects.set(`signatures/users/${verifierId}/signature.png`, signaturePng);
    await db.update(users).set({ signaturePath: `users/${student.id}/signature.png` }).where(eq(users.id, student.id));
    await db.update(users).set({ signaturePath: `users/${verifierId}/signature.png` }).where(eq(users.id, verifierId));
    await request(app).post(`/api/verifier/submissions/${publicId}/approve`).set('Cookie', verifierCookie).send({}).expect(200);
  });

  it('returns a 60 s signed URL to the owner, same-class verifier and validator', async () => {
    for (const cookie of [studentCookie, verifierCookie, validatorCookie]) {
      const response = await request(app).get(`/api/submissions/${publicId}/final-form`).set('Cookie', cookie).expect(200);
      expect(response.body).toEqual({ url: `https://storage.test/forms/${publicId}/final-form.pdf?token=x`, expiresIn: 60 });
    }
  });

  it('hides the final form from other students and unit with 404', async () => {
    await request(app).get(`/api/submissions/${publicId}/final-form`).set('Cookie', otherStudentCookie).expect(404);
    await request(app).get(`/api/submissions/${publicId}/final-form`).set('Cookie', unitCookie).expect(404);
  });

  it('never hands out a signed URL for a signature object', async () => {
    const signedPaths = store.signedUrl.mock.calls.map(([bucket]) => bucket);
    expect(signedPaths).not.toContain('signatures');
  });
});
