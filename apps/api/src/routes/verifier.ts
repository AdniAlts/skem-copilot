/**
 * GET /verifier/queue — antrian `waiting_verifier` kelas Verifikator.
 * POST /verifier/submissions/:publicId/approve — setujui dengan tanda tangan tersimpan.
 * POST /verifier/submissions/:publicId/reject — tolak dengan alasan wajib.
 * Verifikator tidak memiliki endpoint tulis lain.
 */

import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import {
  ApproveBodySchema,
  ApproveResponseSchema,
  RejectBodySchema,
  RejectResponseSchema,
  VerifierQueueQuerySchema,
  VerifierQueueResponseSchema,
} from '@skem/shared';

import { createDb } from '../db/client.js';
import type { Db } from '../db/client.js';
import { classes, notifications, reviews, statusHistory, submissions, users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { SessionUser } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { creditTable } from '../rules/config.js';
import { onVerifierApproved } from '../services/verifier-hooks.js';

export const verifierRouter = Router();

const categoryLabels = new Map(creditTable.entries.map((entry) => [entry.categoryCode, entry.categoryLabel]));

type Decision = 'approve' | 'reject';

async function decide(db: Db, user: SessionUser, publicId: string, decision: Decision, note: string | undefined): Promise<number> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ id: submissions.id, classId: submissions.classId, studentId: submissions.studentId, status: submissions.status, activityName: submissions.activityName })
      .from(submissions).where(eq(submissions.publicId, publicId)).limit(1).for('update');
    if (!row || user.classId === null || row.classId !== user.classId) throw new AppError('NOT_FOUND', 'Pengajuan tidak ditemukan.');
    if (row.status !== 'waiting_verifier') throw new AppError('INVALID_TRANSITION', 'Pengajuan tidak sedang menunggu Verifikator.');
    if (decision === 'approve') {
      const [account] = await tx.select({ signaturePath: users.signaturePath }).from(users).where(eq(users.id, user.id)).limit(1);
      if (!account?.signaturePath) throw new AppError('SIGNATURE_REQUIRED', 'Tanda tangan Verifikator wajib disiapkan sebelum menyetujui.');
    }

    const toStatus = decision === 'approve' ? 'waiting_validator' : 'rejected';
    const now = new Date();
    await tx.update(submissions).set({ status: toStatus, updatedAt: now })
      .where(and(eq(submissions.id, row.id), eq(submissions.status, 'waiting_verifier')));
    const [review] = await tx.insert(reviews).values({
      submissionId: row.id,
      reviewerId: user.id,
      stage: 'verifier',
      decision,
      note: note || null,
      signatureApplied: decision === 'approve',
    }).returning({ id: reviews.id });
    await tx.insert(statusHistory).values({
      submissionId: row.id,
      field: 'status',
      fromValue: 'waiting_verifier',
      toValue: toStatus,
      changedBy: user.id,
      note: note || (decision === 'approve' ? 'Disetujui Verifikator dengan tanda tangan.' : null),
    });
    const activity = row.activityName ?? publicId;
    await tx.insert(notifications).values({
      userId: row.studentId,
      submissionId: row.id,
      channel: 'in_app',
      triggerReviewId: review!.id,
      title: decision === 'approve' ? 'Pengajuan disetujui Verifikator' : 'Pengajuan ditolak Verifikator',
      body: decision === 'approve'
        ? `${activity} disetujui dan diteruskan ke Validator.`
        : `${activity} ditolak. Alasan: ${note}`,
      status: 'pending',
    });
    return row.id;
  });
}

verifierRouter.get(
  '/verifier/queue',
  requireAuth(),
  requireRole('verifier'),
  asyncHandler(async (req, res) => {
    const parsed = VerifierQueueQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Parameter antrian tidak valid.', { issues: parsed.error.issues });
    const user = req.sessionUser!;
    if (user.classId === null) {
      res.json(VerifierQueueResponseSchema.parse({ className: null, summary: { waiting: 0, withWarnings: 0 }, items: [] }));
      return;
    }
    const { client, db } = createDb();
    try {
      const [klass] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, user.classId)).limit(1);
      const rows = await db.select({ submission: submissions, studentName: users.name })
        .from(submissions).innerJoin(users, eq(users.id, submissions.studentId))
        .where(and(eq(submissions.classId, user.classId), eq(submissions.status, 'waiting_verifier')));
      const all = rows.map(({ submission, studentName }) => {
        const flagCount = Array.isArray(submission.warnings) ? submission.warnings.length : 0;
        return {
          publicId: submission.publicId,
          studentName,
          activityName: submission.activityName,
          categoryLabel: submission.categoryCode ? categoryLabels.get(submission.categoryCode) ?? submission.categoryCode : null,
          level: submission.level,
          estimatedCredit: submission.estimatedCredit === null ? null : Number(submission.estimatedCredit),
          aiStatus: flagCount > 0 ? 'warning' as const : 'clean' as const,
          flagCount,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        };
      });
      const time = (value: string | null) => (value ? Date.parse(value) : 0);
      const items = all
        .filter((item) => !parsed.data.aiStatus || item.aiStatus === parsed.data.aiStatus)
        .sort((a, b) => {
          if (parsed.data.sort === 'newest') return time(b.submittedAt) - time(a.submittedAt);
          if (parsed.data.sort === 'flags' && a.flagCount !== b.flagCount) return b.flagCount - a.flagCount;
          return time(a.submittedAt) - time(b.submittedAt);
        });
      res.json(VerifierQueueResponseSchema.parse({
        className: klass?.name ?? null,
        summary: { waiting: all.length, withWarnings: all.filter((item) => item.aiStatus === 'warning').length },
        items,
      }));
    } finally {
      await client.end();
    }
  }),
);

verifierRouter.post(
  '/verifier/submissions/:publicId/approve',
  requireAuth(),
  requireRole('verifier'),
  asyncHandler(async (req, res) => {
    const parsed = ApproveBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Catatan tidak valid.', { issues: parsed.error.issues });
    const { client, db } = createDb();
    try {
      const submissionId = await decide(db, req.sessionUser!, String(req.params.publicId), 'approve', parsed.data.note);
      await onVerifierApproved(submissionId).catch(() => undefined);
      const [row] = await db.select({ finalFormStatus: submissions.finalFormStatus }).from(submissions).where(eq(submissions.id, submissionId)).limit(1);
      res.json(ApproveResponseSchema.parse({ status: 'waiting_validator', finalForm: { status: row?.finalFormStatus ?? 'none' } }));
    } finally {
      await client.end();
    }
  }),
);

verifierRouter.post(
  '/verifier/submissions/:publicId/reject',
  requireAuth(),
  requireRole('verifier'),
  asyncHandler(async (req, res) => {
    const parsed = RejectBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Alasan penolakan wajib diisi.', { issues: parsed.error.issues });
    const { client, db } = createDb();
    try {
      await decide(db, req.sessionUser!, String(req.params.publicId), 'reject', parsed.data.note);
      res.json(RejectResponseSchema.parse({ status: 'rejected' }));
    } finally {
      await client.end();
    }
  }),
);
