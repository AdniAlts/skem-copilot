import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';

import { createDb } from '../db/client.js';
import { documents, submissions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { certificatePath, validatePdfFile } from '../services/batch-upload.js';
import { bucketCertificates, removeObject, uploadObject } from '../services/storage.js';
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
