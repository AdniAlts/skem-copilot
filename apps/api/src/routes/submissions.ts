import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { AnswerBodySchema, PatchSubmissionBodySchema, SignedUrlResponseSchema, SubmitBodySchema, SubmitResponseSchema } from '@skem/shared';
import multer from 'multer';

import { getSubmissionDetail } from '../services/submission-detail.js';
import { recheckDraft } from '../services/submission-recheck.js';

import { createDb } from '../db/client.js';
import { classes, documents, notifications, statusHistory, submissions, users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { certificatePath, validatePdfFile } from '../services/batch-upload.js';
import { bucketCertificates, createSignedUrl, removeObject, uploadObject } from '../services/storage.js';
import { toSubmissionCard } from '../services/submission-card.js';
import { processSubmission } from '../queue/worker.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 10 * 1024 * 1024 } });

export const submissionsRouter = Router();

function throwMutationError(error: unknown): never {
  const code = error instanceof Error ? error.message : '';
  if (code === 'NOT_FOUND' || code === 'QUESTION_NOT_FOUND') throw new AppError('NOT_FOUND', 'Tidak ditemukan.');
  if (code === 'CONFLICT') throw new AppError('CONFLICT', 'Pengajuan tidak dapat diubah pada status ini.');
  if (code === 'PRECHECK_REQUIRED') throw new AppError('CONFLICT', 'Hasil pre-check belum tersedia.');
  if (['INVALID_CATEGORY', 'INVALID_DATE', 'INVALID_ANSWER'].includes(code)) throw new AppError('VALIDATION_ERROR', 'Nilai perubahan tidak valid.');
  throw error;
}

submissionsRouter.get(
  '/submissions/:publicId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { client, db } = createDb();
    try {
      const [submission] = await db.select({ id: submissions.id, studentId: submissions.studentId, classId: submissions.classId })
        .from(submissions).where(eq(submissions.publicId, String(req.params.publicId))).limit(1);
      const user = req.sessionUser!;
      const allowed = submission && (
        (user.role === 'student' && user.id === submission.studentId) ||
        (user.role === 'verifier' && user.classId === submission.classId) ||
        user.role === 'validator' || user.role === 'unit'
      );
      if (!allowed) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      const detail = await getSubmissionDetail(db, String(req.params.publicId));
      if (!detail) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (user.role === 'student' && detail.status !== 'approved') detail.skem.finalCredit = null;
      res.json(detail);
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.patch(
  '/submissions/:publicId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const parsed = PatchSubmissionBodySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Perubahan metadata tidak valid.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    if (user.role !== 'student') throw new AppError('FORBIDDEN', 'Hanya mahasiswa pemilik pengajuan yang dapat mengubah metadata.');
    const { client, db } = createDb();
    try {
      const [current] = await db.select({ id: submissions.id, studentId: submissions.studentId, status: submissions.status, reviewStatus: submissions.reviewStatus })
        .from(submissions).where(eq(submissions.publicId, String(req.params.publicId))).limit(1);
      if (!current || current.studentId !== user.id) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (current.status !== 'draft' || current.reviewStatus === 'analyzing' || current.reviewStatus === 'queued' || current.reviewStatus === 'cancelled') throw new AppError('CONFLICT', 'Pengajuan tidak dapat diubah pada status ini.');
      try {
        await recheckDraft(db, { submissionId: current.id, studentId: user.id, patch: parsed.data });
      } catch (error) {
        throwMutationError(error);
      }
      const detail = await getSubmissionDetail(db, String(req.params.publicId));
      res.json(detail);
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.post(
  '/submissions/:publicId/answers',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const parsed = AnswerBodySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Jawaban tidak valid.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    if (user.role !== 'student') throw new AppError('FORBIDDEN', 'Hanya mahasiswa pemilik pengajuan yang dapat menjawab.');
    const { client, db } = createDb();
    try {
      const [current] = await db.select({ id: submissions.id, studentId: submissions.studentId, status: submissions.status, reviewStatus: submissions.reviewStatus })
        .from(submissions).where(eq(submissions.publicId, String(req.params.publicId))).limit(1);
      if (!current || current.studentId !== user.id) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (current.status !== 'draft' || current.reviewStatus === 'analyzing' || current.reviewStatus === 'queued' || current.reviewStatus === 'cancelled') throw new AppError('CONFLICT', 'Pengajuan tidak dapat diubah pada status ini.');
      try {
        await recheckDraft(db, { submissionId: current.id, studentId: user.id, answer: { questionId: parsed.data.questionId, value: parsed.data.answer } });
      } catch (error) {
        throwMutationError(error);
      }
      const detail = await getSubmissionDetail(db, String(req.params.publicId));
      res.json(detail);
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.post(
  '/submissions/submit',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const parsed = SubmitBodySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Daftar pengajuan tidak valid.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    if (user.role !== 'student') throw new AppError('FORBIDDEN', 'Hanya mahasiswa yang dapat mengajukan pengajuan.');
    const { client, db } = createDb();
    try {
      const [account] = await db.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, user.id)).limit(1);
      if (!account?.signaturePath) throw new AppError('SIGNATURE_REQUIRED', 'Tanda tangan mahasiswa wajib diunggah sebelum mengajukan.');
      const submitted: string[] = [];
      const skipped: { publicId: string; reason: string }[] = [];
      await db.transaction(async (tx) => {
        for (const publicId of parsed.data.publicIds) {
          const [row] = await tx.select({ submission: submissions, advisorId: classes.advisorId })
            .from(submissions).leftJoin(classes, eq(classes.id, submissions.classId))
            .where(and(eq(submissions.publicId, publicId), eq(submissions.studentId, user.id))).limit(1);
          if (!row) {
            skipped.push({ publicId, reason: 'Pengajuan tidak ditemukan.' });
            continue;
          }
          if (row.submission.status !== 'draft') {
            skipped.push({ publicId, reason: 'Pengajuan bukan berstatus draft.' });
            continue;
          }
          if (row.submission.reviewStatus !== 'ready') {
            skipped.push({ publicId, reason: `Status pre-check ${row.submission.reviewStatus}; hanya ready dapat diajukan.` });
            continue;
          }
          if (!row.advisorId) {
            skipped.push({ publicId, reason: 'Kelas belum memiliki Verifikator.' });
            continue;
          }
          const now = new Date();
          const [updated] = await tx.update(submissions).set({ status: 'waiting_verifier', submittedAt: now, updatedAt: now })
            .where(and(
              eq(submissions.id, row.submission.id),
              eq(submissions.studentId, user.id),
              eq(submissions.status, 'draft'),
              eq(submissions.reviewStatus, 'ready'),
            )).returning({ id: submissions.id });
          if (!updated) {
            skipped.push({ publicId, reason: 'Pengajuan telah berubah; muat ulang sebelum mencoba lagi.' });
            continue;
          }
          await tx.insert(statusHistory).values({
            submissionId: updated.id,
            field: 'status',
            fromValue: 'draft',
            toValue: 'waiting_verifier',
            changedBy: user.id,
            note: 'Mahasiswa membubuhkan tanda tangan dan mengajukan kepada Verifikator.',
          });
          await tx.insert(notifications).values({
            userId: row.advisorId,
            submissionId: updated.id,
            channel: 'in_app',
            title: 'Pengajuan SKEM menunggu verifikasi',
            body: `${user.name} mengajukan ${row.submission.activityName ?? publicId}.`,
            status: 'pending',
          });
          submitted.push(publicId);
        }
      });
      if (!submitted.length) throw new AppError('CONFLICT', 'Tidak ada pengajuan yang dapat diajukan.', { skipped });
      res.json(SubmitResponseSchema.parse({ submitted, skipped }));
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.post(
  '/submissions/:publicId/cancel',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { client, db } = createDb();
    try {
      const current = (await db.select({ submission: submissions, document: documents })
        .from(submissions).leftJoin(documents, eq(documents.submissionId, submissions.id))
        .where(and(eq(submissions.publicId, String(req.params.publicId)), eq(submissions.studentId, req.sessionUser!.id))).limit(1))[0];
      if (!current) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (current.submission.status !== 'draft') throw new AppError('CONFLICT', 'Pengajuan tidak dapat dibatalkan pada status ini.');
      await db.transaction(async (tx) => {
        await tx.update(submissions).set({ reviewStatus: 'cancelled', lockedAt: null, updatedAt: new Date() }).where(eq(submissions.id, current.submission.id));
        await tx.insert(statusHistory).values({ submissionId: current.submission.id, field: 'review_status', fromValue: current.submission.reviewStatus, toValue: 'cancelled', changedBy: req.sessionUser!.id, note: 'Pengajuan dibatalkan mahasiswa' });
      });
      if (current.document) await removeObject(bucketCertificates(), current.document.filePath);
      res.status(204).send();
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.get(
  '/submissions/:publicId/certificate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const [row] = await db.select({ submission: submissions, document: documents })
        .from(submissions).innerJoin(documents, and(eq(documents.submissionId, submissions.id), eq(documents.type, 'certificate')))
        .where(eq(submissions.publicId, String(req.params.publicId))).limit(1);
      const allowed = row && (
        (user.role === 'student' && row.submission.studentId === user.id) ||
        (user.role === 'verifier' && row.submission.classId === user.classId) ||
        user.role === 'validator'
      );
      if (!allowed) throw new AppError('NOT_FOUND', 'Sertifikat tidak ditemukan.');
      const signed = await createSignedUrl(bucketCertificates(), row.document.filePath);
      res.json(SignedUrlResponseSchema.parse(signed));
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.post(
  '/submissions/:publicId/retry',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { client, db } = createDb();
    try {
      const current = (await db.select({ submission: submissions, document: documents })
        .from(submissions).leftJoin(documents, eq(documents.submissionId, submissions.id))
        .where(and(eq(submissions.publicId, String(req.params.publicId)), eq(submissions.studentId, req.sessionUser!.id))).limit(1))[0];
      if (!current) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (current.submission.reviewStatus !== 'error') throw new AppError('CONFLICT', 'Hanya pengajuan error yang dapat dicoba lagi.');
      const [updated] = await db.update(submissions).set({ reviewStatus: 'queued', attempts: 0, lastError: null, nextAttemptAt: null, updatedAt: new Date() }).where(and(eq(submissions.id, current.submission.id), eq(submissions.reviewStatus, 'error'))).returning();
      if (!updated) throw new AppError('CONFLICT', 'Status pengajuan berubah.');
      await db.insert(statusHistory).values({ submissionId: current.submission.id, field: 'review_status', fromValue: 'error', toValue: 'queued', changedBy: req.sessionUser!.id, note: 'Mahasiswa mencoba ulang analisis' });
      res.json(toSubmissionCard(updated, current.document?.fileName ?? ''));
    } finally {
      await client.end();
    }
  }),
);

submissionsRouter.post(
  '/submissions/:publicId/reupload',
  requireAuth(),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const validated = validatePdfFile(req.file);
    const { client, db } = createDb();
    let uploadedPath: string | null = null;
    try {
      const current = (await db.select({ submission: submissions, document: documents })
        .from(submissions).leftJoin(documents, eq(documents.submissionId, submissions.id))
        .where(and(eq(submissions.publicId, String(req.params.publicId)), eq(submissions.studentId, req.sessionUser!.id))).limit(1))[0];
      if (!current) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      if (current.submission.status !== 'draft') throw new AppError('CONFLICT', 'Hanya pengajuan draft yang dapat diunggah ulang.');
      uploadedPath = certificatePath(req.sessionUser!.id, current.submission.publicId);
      await uploadObject(bucketCertificates(), uploadedPath, validated.file.buffer, 'application/pdf');
      await db.transaction(async (tx) => {
        await tx.update(submissions).set({ reviewStatus: 'queued', attempts: 0, lockedAt: null, nextAttemptAt: null, lastError: null, updatedAt: new Date() }).where(eq(submissions.id, current.submission.id));
        await tx.update(documents).set({ filePath: uploadedPath!, fileName: validated.file.originalname, mime: 'application/pdf', sizeBytes: validated.file.size, sha256: validated.sha256 }).where(eq(documents.submissionId, current.submission.id));
        await tx.insert(statusHistory).values({ submissionId: current.submission.id, field: 'review_status', fromValue: current.submission.reviewStatus, toValue: 'queued', changedBy: req.sessionUser!.id, note: 'Berkas diunggah ulang' });
      });
      res.json(toSubmissionCard({ ...current.submission, reviewStatus: 'queued', attempts: 0, lockedAt: null, nextAttemptAt: null, lastError: null, updatedAt: new Date() }, validated.file.originalname));
    } catch (error) {
      if (uploadedPath) await removeObject(bucketCertificates(), uploadedPath).catch(() => undefined);
      throw error;
    } finally {
      await client.end();
    }
  }),
);

export async function runSubmissionNow(submissionId: number): Promise<void> {
  await processSubmission(submissionId);
}
