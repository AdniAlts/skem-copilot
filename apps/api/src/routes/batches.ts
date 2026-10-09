import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { customAlphabet } from 'nanoid';

import { BatchProgressSchema } from '@skem/shared';
import { createDb } from '../db/client.js';
import { batches, classes, documents, statusHistory, submissions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import {
  certificatePath,
  validateBatchFiles,
} from '../services/batch-upload.js';
import { bucketCertificates, uploadObject } from '../services/storage.js';
import { toSubmissionCard } from '../services/submission-card.js';

const publicId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const batchId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 11, fileSize: 10 * 1024 * 1024 },
});

export const batchesRouter = Router();

const toCard = toSubmissionCard;

batchesRouter.post(
  '/batches',
  requireAuth(),
  upload.array('files', 11),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const validated = validateBatchFiles(req.files as Express.Multer.File[] | undefined);
    const { client, db } = createDb();
    const uploaded: string[] = [];
    try {
      const classRow = user.classId
        ? (await db.select({ id: classes.id }).from(classes).where(eq(classes.id, user.classId)).limit(1))[0]
        : null;
      if (!classRow) throw new AppError('CONFLICT', 'Akun mahasiswa belum memiliki kelas.');

      const batchPublicId = `BCH-${batchId()}`;
      const uploadItems = validated.map((item) => ({
        item,
        submissionPublicId: `SKM-${publicId()}`,
      }));
      for (const { item, submissionPublicId } of uploadItems) {
        const path = certificatePath(user.id, submissionPublicId);
        await uploadObject(bucketCertificates(), path, item.file.buffer, 'application/pdf');
        uploaded.push(path);
      }

      const created = await db.transaction(async (tx) => {
        const [batch] = await tx.insert(batches).values({
          publicId: batchPublicId,
          studentId: user.id,
          fileCount: validated.length,
        }).returning({ id: batches.id, publicId: batches.publicId, fileCount: batches.fileCount });
        if (!batch) throw new AppError('INTERNAL', 'Batch gagal dibuat.');
        const result: { row: typeof submissions.$inferSelect; fileName: string }[] = [];
        for (const [index, { item, submissionPublicId }] of uploadItems.entries()) {
          const path = certificatePath(user.id, submissionPublicId);
          const [submission] = await tx.insert(submissions).values({
            publicId: submissionPublicId,
            batchId: batch.id,
            studentId: user.id,
            classId: classRow.id,
            status: 'draft',
            reviewStatus: 'queued',
          }).returning();
          if (!submission) throw new AppError('INTERNAL', 'Submission gagal dibuat.');
          await tx.insert(documents).values({
            submissionId: submission.id,
            type: index === 0 ? 'certificate' : 'supporting',
            filePath: path,
            fileName: item.file.originalname,
            mime: 'application/pdf',
            sizeBytes: item.file.size,
            sha256: item.sha256,
          });
          await tx.insert(statusHistory).values({
            submissionId: submission.id,
            field: 'review_status',
            fromValue: null,
            toValue: 'queued',
            changedBy: null,
            note: 'Berkas masuk antrian pre-check',
          });
          result.push({ row: submission, fileName: item.file.originalname });
        }
        return { batch, submissions: result };
      });
      res.status(201).json({
        batch: { publicId: created.batch.publicId, fileCount: created.batch.fileCount },
        submissions: created.submissions.map(({ row, fileName }) => toCard(row, fileName)),
      });
    } catch (error) {
      if (uploaded.length) {
        const { removeObject } = await import('../services/storage.js');
        await Promise.allSettled(uploaded.map((path) => removeObject(bucketCertificates(), path)));
      }
      throw error;
    } finally {
      await client.end();
    }
  }),
);

batchesRouter.get(
  '/batches/:publicId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const batch = (await db.select().from(batches).where(and(eq(batches.publicId, String(req.params.publicId)), eq(batches.studentId, user.id))).limit(1))[0];
      if (!batch) throw new AppError('NOT_FOUND', 'Batch tidak ditemukan.');
      const rows = await db.select({ submission: submissions, document: documents })
        .from(submissions).leftJoin(documents, eq(documents.submissionId, submissions.id))
        .where(eq(submissions.batchId, batch.id)).orderBy(submissions.createdAt);
      const cards = rows.map(({ submission, document }) => toCard(submission, document?.fileName ?? ''));
      const counts = Object.fromEntries(['queued', 'analyzing', 'ready', 'needs_fix', 'problem', 'error'].map((status) => [status, cards.filter((card) => card.reviewStatus === status).length]));
      const body = BatchProgressSchema.parse({ batch: { publicId: batch.publicId, fileCount: batch.fileCount }, progress: { total: cards.length, done: cards.filter((card) => !['queued', 'analyzing'].includes(card.reviewStatus)).length, counts }, submissions: cards });
      res.json(body);
    } finally {
      await client.end();
    }
  }),
);

batchesRouter.get(
  '/submissions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const filters = [eq(submissions.studentId, user.id)];
      if (typeof req.query.status === 'string') filters.push(eq(submissions.status, req.query.status as never));
      if (typeof req.query.reviewStatus === 'string') filters.push(eq(submissions.reviewStatus, req.query.reviewStatus as never));
      const rows = await db.select({ submission: submissions, document: documents }).from(submissions).leftJoin(documents, eq(documents.submissionId, submissions.id)).where(and(...filters)).orderBy(desc(submissions.createdAt));
      res.json(rows.map(({ submission, document }) => toCard(submission, document?.fileName ?? '')));
    } finally {
      await client.end();
    }
  }),
);
