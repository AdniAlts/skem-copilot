/** Database-backed analysis worker. Pre-check implementation is a stub until BE-03/BE-04. */

import { and, eq, isNull, lte, lt, or } from 'drizzle-orm';
import { createDb } from '../db/client.js';
import { precheckRuns, statusHistory, submissions } from '../db/schema.js';

export type WorkerConfig = { concurrency: number; maxAttempts: number; pollMs: number; lockTimeoutMs: number };

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  concurrency: 1,
  maxAttempts: 3,
  pollMs: 2000,
  lockTimeoutMs: 5 * 60 * 1000,
};

export type PrecheckResult = { reviewStatus: 'ready'; activityName: null; estimatedCredit: null; creditEntryId: null; warnings: [] };

export async function runPrecheck(): Promise<PrecheckResult> {
  return { reviewStatus: 'ready', activityName: null, estimatedCredit: null, creditEntryId: null, warnings: [] };
}

export async function recoverStaleJobs(config = DEFAULT_WORKER_CONFIG): Promise<number> {
  const { client, db } = createDb();
  try {
    const cutoff = new Date(Date.now() - config.lockTimeoutMs);
    const rows = await db.update(submissions)
      .set({ reviewStatus: 'queued', lockedAt: null, lastError: 'Worker restart recovery' })
      .where(and(eq(submissions.reviewStatus, 'analyzing'), lt(submissions.lockedAt, cutoff)))
      .returning({ id: submissions.id });
    return rows.length;
  } finally {
    await client.end();
  }
}

export async function processSubmission(submissionId: number, config = DEFAULT_WORKER_CONFIG): Promise<void> {
  const { client, db } = createDb();
  try {
    const claimed = await db.update(submissions)
      .set({ reviewStatus: 'analyzing', lockedAt: new Date(), attempts: 1 })
      .where(and(eq(submissions.id, submissionId), eq(submissions.reviewStatus, 'queued')))
      .returning();
    const submission = claimed[0];
    if (!submission) return;
    const [run] = await db.insert(precheckRuns).values({
      submissionId: submission.id,
      attempt: submission.attempts,
      model: 'stub',
      status: 'running',
    }).returning({ id: precheckRuns.id });
    if (!run) return;
    try {
      const result = await runPrecheck();
      const [updated] = await db.update(submissions).set({
        reviewStatus: result.reviewStatus,
        activityName: result.activityName,
        estimatedCredit: result.estimatedCredit,
        creditEntryId: result.creditEntryId,
        warnings: result.warnings,
        lockedAt: null,
        lastError: null,
        updatedAt: new Date(),
      }).where(and(eq(submissions.id, submission.id), eq(submissions.reviewStatus, 'analyzing'))).returning({ reviewStatus: submissions.reviewStatus });
      if (updated) {
        await db.insert(statusHistory).values({ submissionId: submission.id, field: 'review_status', fromValue: 'analyzing', toValue: result.reviewStatus, changedBy: null, note: 'Pre-check worker selesai' });
      }
      await db.update(precheckRuns).set({ status: 'done', finishedAt: new Date() }).where(eq(precheckRuns.id, run.id));
    } catch (error) {
      const attempts = submission.attempts;
      const retry = attempts < config.maxAttempts;
      await db.update(submissions).set({
        reviewStatus: retry ? 'queued' : 'error',
        lockedAt: null,
        nextAttemptAt: retry ? new Date(Date.now() + 5000 * 2 ** attempts) : null,
        lastError: error instanceof Error ? error.name : 'Pre-check gagal',
        updatedAt: new Date(),
      }).where(eq(submissions.id, submission.id));
      await db.update(precheckRuns).set({ status: 'failed', error: error instanceof Error ? error.name : 'Pre-check gagal', finishedAt: new Date() }).where(eq(precheckRuns.id, run.id));
    }
  } finally {
    await client.end();
  }
}

export function startWorker(config = DEFAULT_WORKER_CONFIG): { stop: () => void } {
  if (process.env.NODE_ENV === 'test') return { stop: () => undefined };
  let stopped = false;
  let running = 0;
  const tick = async (): Promise<void> => {
    if (stopped || running >= config.concurrency) return;
    const { client, db } = createDb();
    try {
      const jobs = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(and(eq(submissions.reviewStatus, 'queued'), or(isNull(submissions.nextAttemptAt), lte(submissions.nextAttemptAt, new Date()))))
        .orderBy(submissions.createdAt)
        .limit(config.concurrency - running);
      await Promise.all(jobs.map(async (job) => {
        running += 1;
        try { await processSubmission(job.id, config); } finally { running -= 1; }
      }));
    } finally {
      await client.end();
    }
  };
  const timer = setInterval(() => { void tick(); }, config.pollMs);
  return { stop: () => { stopped = true; clearInterval(timer); } };
}
