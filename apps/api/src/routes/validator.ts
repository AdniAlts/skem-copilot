/**
 * GET /validator/queue — antrian `waiting_validator` lintas kelas, filter `classId`.
 * POST /validator/submissions/:publicId/credit — ubah kredit final dengan alasan wajib.
 * POST /validator/submissions/:publicId/validate — setujui; kredit final = nilai terakhir.
 * POST /validator/submissions/:publicId/reject — tolak dengan alasan wajib.
 * POST /validator/submissions/:publicId/regenerate-form — buat ulang PDF final yang belum `ready`.
 */

import { and, asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import {
  CreditAdjustBodySchema,
  CreditAdjustResponseSchema,
  RegenerateFormResponseSchema,
  ValidateBodySchema,
  ValidateResponseSchema,
  ValidatorQueueQuerySchema,
  ValidatorQueueResponseSchema,
  ValidatorRejectBodySchema,
  ValidatorRejectResponseSchema,
} from '@skem/shared';

import { createDb } from '../db/client.js';
import type { Db } from '../db/client.js';
import { classes, notifications, reviews, statusHistory, submissions, users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { SessionUser } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { creditTable } from '../rules/config.js';
import { generateFinalForm } from '../services/final-form.js';

export const validatorRouter = Router();

const categoryLabels = new Map(creditTable.entries.map((entry) => [entry.categoryCode, entry.categoryLabel]));

type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];

const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));
const formatCredit = (value: number): string => value.toFixed(2);

async function lockWaiting(tx: DbTx, publicId: string) {
  const [row] = await tx.select().from(submissions).where(eq(submissions.publicId, publicId)).limit(1).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
  if (row.status !== 'waiting_validator') throw new AppError('INVALID_TRANSITION', 'Pengajuan tidak sedang menunggu Validator.');
  return row;
}

async function finish(tx: DbTx, user: SessionUser, row: typeof submissions.$inferSelect, decision: 'approve' | 'reject', note: string | null, finalCredit: number | null) {
  const toStatus = decision === 'approve' ? 'approved' : 'rejected';
  await tx.update(submissions).set({
    status: toStatus,
    ...(finalCredit === null ? {} : { finalCredit: formatCredit(finalCredit) }),
    updatedAt: new Date(),
  }).where(and(eq(submissions.id, row.id), eq(submissions.status, 'waiting_validator')));
  const [review] = await tx.insert(reviews).values({
    submissionId: row.id,
    reviewerId: user.id,
    stage: 'validator',
    decision,
    note,
  }).returning({ id: reviews.id });
  await tx.insert(statusHistory).values({
    submissionId: row.id,
    field: 'status',
    fromValue: 'waiting_validator',
    toValue: toStatus,
    changedBy: user.id,
    note: note ?? `Divalidasi dengan kredit final ${formatCredit(finalCredit!)}.`,
  });
  const activity = row.activityName ?? row.publicId;
  await tx.insert(notifications).values({
    userId: row.studentId,
    submissionId: row.id,
    channel: 'in_app',
    triggerReviewId: review!.id,
    title: decision === 'approve' ? 'Pengajuan SKEM disetujui' : 'Pengajuan ditolak Validator',
    body: decision === 'approve'
      ? `${activity} disetujui dengan kredit final ${formatCredit(finalCredit!)}.`
      : `${activity} ditolak. Alasan: ${note}`,
    status: 'pending',
  });
}

validatorRouter.get(
  '/validator/queue',
  requireAuth(),
  requireRole('validator'),
  asyncHandler(async (req, res) => {
    const parsed = ValidatorQueueQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Parameter antrian tidak valid.', { issues: parsed.error.issues });
    const { client, db } = createDb();
    try {
      const rows = await db.select({ submission: submissions, studentName: users.name, nrp: users.nrp, className: classes.name })
        .from(submissions)
        .innerJoin(users, eq(users.id, submissions.studentId))
        .leftJoin(classes, eq(classes.id, submissions.classId))
        .where(and(
          eq(submissions.status, 'waiting_validator'),
          ...(parsed.data.classId === undefined ? [] : [eq(submissions.classId, parsed.data.classId)]),
        ))
        .orderBy(asc(submissions.submittedAt), asc(submissions.id));
      const items = rows.map(({ submission, studentName, nrp, className }) => ({
        publicId: submission.publicId,
        studentName,
        nrp,
        className,
        activityName: submission.activityName,
        categoryLabel: submission.categoryCode ? categoryLabels.get(submission.categoryCode) ?? submission.categoryCode : null,
        level: submission.level,
        estimatedCredit: toNumber(submission.estimatedCredit),
        finalCredit: toNumber(submission.finalCredit),
        flagCount: Array.isArray(submission.warnings) ? submission.warnings.length : 0,
        finalFormStatus: submission.finalFormStatus,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      }));
      res.json(ValidatorQueueResponseSchema.parse({
        summary: { waiting: items.length, formFailed: items.filter((item) => item.finalFormStatus === 'failed').length },
        items,
      }));
    } finally {
      await client.end();
    }
  }),
);

validatorRouter.post(
  '/validator/submissions/:publicId/credit',
  requireAuth(),
  requireRole('validator'),
  asyncHandler(async (req, res) => {
    const parsed = CreditAdjustBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Kredit final atau alasan tidak valid.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const result = await db.transaction(async (tx) => {
        const row = await lockWaiting(tx, String(req.params.publicId));
        const previousCredit = toNumber(row.finalCredit) ?? toNumber(row.estimatedCredit);
        if (previousCredit === null) throw new AppError('CONFLICT', 'Estimasi kredit belum tersedia.');
        if (formatCredit(previousCredit) === formatCredit(parsed.data.finalCredit)) {
          throw new AppError('VALIDATION_ERROR', 'Kredit final sama dengan nilai saat ini.');
        }
        await tx.update(submissions).set({ finalCredit: formatCredit(parsed.data.finalCredit), updatedAt: new Date() })
          .where(eq(submissions.id, row.id));
        const [review] = await tx.insert(reviews).values({
          submissionId: row.id,
          reviewerId: user.id,
          stage: 'validator',
          decision: 'adjust_credit',
          previousCredit: formatCredit(previousCredit),
          adjustedCredit: formatCredit(parsed.data.finalCredit),
          adjustReason: parsed.data.reason,
        }).returning();
        return { previousCredit, review: review! };
      });
      res.json(CreditAdjustResponseSchema.parse({
        previousCredit: result.previousCredit,
        finalCredit: parsed.data.finalCredit,
        review: {
          id: result.review.id,
          stage: 'validator',
          decision: 'adjust_credit',
          note: result.review.adjustReason,
          reviewerName: user.name,
          createdAt: result.review.createdAt.toISOString(),
        },
      }));
    } finally {
      await client.end();
    }
  }),
);

validatorRouter.post(
  '/validator/submissions/:publicId/validate',
  requireAuth(),
  requireRole('validator'),
  asyncHandler(async (req, res) => {
    const parsed = ValidateBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Body validasi harus kosong; ubah kredit lewat /credit.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const finalCredit = await db.transaction(async (tx) => {
        const row = await lockWaiting(tx, String(req.params.publicId));
        const credit = toNumber(row.finalCredit) ?? toNumber(row.estimatedCredit);
        if (credit === null) throw new AppError('CONFLICT', 'Estimasi kredit belum tersedia.');
        await finish(tx, user, row, 'approve', null, credit);
        return credit;
      });
      res.json(ValidateResponseSchema.parse({ status: 'approved', finalCredit }));
    } finally {
      await client.end();
    }
  }),
);

validatorRouter.post(
  '/validator/submissions/:publicId/regenerate-form',
  requireAuth(),
  requireRole('validator'),
  asyncHandler(async (req, res) => {
    const { client, db } = createDb();
    let submissionId: number;
    try {
      submissionId = await db.transaction(async (tx) => {
        const row = await lockWaiting(tx, String(req.params.publicId));
        if (row.finalFormStatus === 'ready') throw new AppError('CONFLICT', 'Formulir final sudah tersedia.');
        return row.id;
      });
    } finally {
      await client.end();
    }
    const status = await generateFinalForm(submissionId);
    res.json(RegenerateFormResponseSchema.parse({ finalForm: { status } }));
  }),
);

validatorRouter.post(
  '/validator/submissions/:publicId/reject',
  requireAuth(),
  requireRole('validator'),
  asyncHandler(async (req, res) => {
    const parsed = ValidatorRejectBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Alasan penolakan wajib diisi.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      await db.transaction(async (tx) => {
        const row = await lockWaiting(tx, String(req.params.publicId));
        await finish(tx, user, row, 'reject', parsed.data.note, null);
      });
      res.json(ValidatorRejectResponseSchema.parse({ status: 'rejected' }));
    } finally {
      await client.end();
    }
  }),
);
