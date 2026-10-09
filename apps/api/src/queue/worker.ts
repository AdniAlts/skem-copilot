/** Database-backed analysis worker. Pre-check implementation is a stub until BE-03/BE-04. */

import { and, eq, lt, sql } from 'drizzle-orm';
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
    const stale = await db.select({ id: submissions.id, attempts: submissions.attempts })
      .from(submissions)
      .where(and(eq(submissions.reviewStatus, 'analyzing'), lt(submissions.lockedAt, cutoff)));
    for (const job of stale) {
      const status = job.attempts >= config.maxAttempts ? 'error' : 'queued';
      await db.transaction(async (tx) => {
        await tx.update(submissions).set({
          reviewStatus: status,
          lockedAt: null,
          nextAttemptAt: status === 'queued' ? new Date() : null,
          lastError: 'Worker restart recovery',
          updatedAt: new Date(),
        }).where(and(eq(submissions.id, job.id), eq(submissions.reviewStatus, 'analyzing')));
        await tx.insert(statusHistory).values({
          submissionId: job.id,
          field: 'review_status',
          fromValue: 'analyzing',
          toValue: status,
          changedBy: null,
          note: 'Worker restart recovery',
        });
      });
    }
    return stale.length;
  } finally {
    await client.end();
  }
}

export async function processSubmission(submissionId: number, config = DEFAULT_WORKER_CONFIG, alreadyClaimed = false): Promise<void> {
  const { client, db } = createDb();
  try {
    const claimed = alreadyClaimed
      ? await db.select().from(submissions).where(and(eq(submissions.id, submissionId), eq(submissions.reviewStatus, 'analyzing'))).limit(1)
      : await db.update(submissions)
        .set({ reviewStatus: 'analyzing', lockedAt: new Date(), attempts: sql`${submissions.attempts} + 1` })
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
      const jobs = await db.transaction(async (tx) => {
        const limit = Math.max(1, config.concurrency - running);
        const claimed = await tx.execute<{ id: number }>(sql`
          WITH picked AS (
            SELECT id
            FROM submissions
            WHERE review_status = 'queued'
              AND (next_attempt_at IS NULL OR next_attempt_at <= now())
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT ${limit}
          )
          UPDATE submissions
          SET review_status = 'analyzing', locked_at = now(), attempts = attempts + 1, updated_at = now()
          WHERE id IN (SELECT id FROM picked)
          RETURNING id
        `);
        return [...claimed].map((job) => ({ id: Number(job.id) }));
      });
      await Promise.all(jobs.map(async (job) => {
        running += 1;
        try { await processSubmission(job.id, config, true); } finally { running -= 1; }
      }));
    } finally {
      await client.end();
    }
  };
  const timer = setInterval(() => { void tick(); }, config.pollMs);
  return { stop: () => { stopped = true; clearInterval(timer); } };
}
