import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';

import { createDb } from '../db/client.js';
import { documents, statusHistory, submissions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { certificatePath, validatePdfFile } from '../services/batch-upload.js';
import {
  bucketCertificates,
  bucketForms,
  createSignedUrl,
  removeObject,
  uploadObject,
} from '../services/storage.js';
import { toSubmissionCard } from '../services/submission-card.js';
import { processSubmission } from '../queue/worker.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 10 * 1024 * 1024 } });

export const submissionsRouter = Router();

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

/**
 * GET /submissions — daftar pengajuan milik mahasiswa sendiri
 * Query opsional: status, reviewStatus
 */
submissionsRouter.get(
  '/submissions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    if (user.role !== 'student') {
      throw new AppError('FORBIDDEN', 'Hanya mahasiswa yang dapat melihat pengajuan pribadi.');
    }

    const { status, reviewStatus } = req.query;
    const { client, db } = createDb();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [eq(submissions.studentId, user.id)];
      if (status && typeof status === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(submissions.status, status as any));
      }
      if (reviewStatus && typeof reviewStatus === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(submissions.reviewStatus, reviewStatus as any));
      }

      const rows = await db
        .select({
          submission: submissions,
          document: documents,
        })
        .from(submissions)
        .leftJoin(documents, eq(documents.submissionId, submissions.id))
        .where(and(...conditions))
        .orderBy(desc(submissions.createdAt));

      const cards = rows.map((r) =>
        toSubmissionCard(r.submission, r.document?.fileName ?? '')
      );

      res.json(cards);
    } finally {
      await client.end();
    }
  }),
);

/**
 * GET /submissions/:publicId/final-form — unduh formulir final (signed URL)
 */
submissionsRouter.get(
  '/submissions/:publicId/final-form',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const { client, db } = createDb();
    try {
      const row = (
        await db
          .select({
            finalFormPath: submissions.finalFormPath,
            finalFormStatus: submissions.finalFormStatus,
            studentId: submissions.studentId,
          })
          .from(submissions)
          .where(eq(submissions.publicId, String(publicId)))
          .limit(1)
      )[0];

      if (!row) {
        throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
      }

      if (req.sessionUser!.role === 'student' && row.studentId !== req.sessionUser!.id) {
        throw new AppError('FORBIDDEN', 'Tidak memiliki akses ke pengajuan ini.');
      }

      if (!row.finalFormPath || row.finalFormStatus === 'none') {
        throw new AppError('NOT_FOUND', 'Formulir final belum tersedia.');
      }

      const signed = await createSignedUrl(bucketForms(), row.finalFormPath);
      res.json(signed);
    } finally {
      await client.end();
    }
  }),
);

export async function runSubmissionNow(submissionId: number): Promise<void> {
  await processSubmission(submissionId);
}

