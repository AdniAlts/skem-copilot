/** Database-backed analysis worker. Pre-check implementation is a stub until BE-03/BE-04. */

import { and, eq, lt, sql } from 'drizzle-orm';
import { describeModels, LlmError, resolveLlmModels } from '../llm/client.js';
import { loadEnv } from '../env.js';
import { createDb } from '../db/client.js';
import { documents, precheckRuns, statusHistory, submissions, users, findings, agentQuestions } from '../db/schema.js';
import { runPrecheck } from '../agent/precheck.js';
import { createDocumentReader } from '../reader/index.js';
import { InvalidDocumentError } from '../reader/errors.js';
import { creditTable, guidelineSections, rules } from '../rules/config.js';
import { bucketCertificates, downloadObject } from '../services/storage.js';
import type { PrecheckResult } from '../agent/precheck.js';

export type WorkerConfig = { concurrency: number; maxAttempts: number; pollMs: number; lockTimeoutMs: number };

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  concurrency: Math.min(2, rules.worker.concurrency),
  maxAttempts: rules.worker.maxAttempts,
  pollMs: 2000,
  lockTimeoutMs: 5 * 60 * 1000,
};

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
      model: describeModels(resolveLlmModels(loadEnv())),
      status: 'running',
    }).returning({ id: precheckRuns.id });
    if (!run) return;
    try {
      const [context] = await db.select({ document: documents, student: users })
        .from(documents)
        .innerJoin(users, eq(users.id, submission.studentId))
        .where(eq(documents.submissionId, submission.id))
        .limit(1);
      if (!context) throw new Error('Dokumen sertifikat tidak ditemukan.');
      const pdf = await downloadObject(bucketCertificates(), context.document.filePath);
      const result: PrecheckResult = await runPrecheck({
        submissionId: submission.id,
        runId: run.id,
        pdf,
        sha256: context.document.sha256,
        student: { name: context.student.name, angkatan: context.student.angkatan ?? 0 },
        today: new Date().toISOString().slice(0, 10),
        answers: {},
      }, { reader: createDocumentReader(), rules, creditTable, guidelineSections });

      await db.transaction(async (tx) => {
        const [updated] = await tx.update(submissions).set({
          reviewStatus: result.reviewStatus,
          activityName: result.activityName,
          activityDate: result.activityDate,
          locationPlatform: result.locationPlatform,
          organizer: result.organizer,
          attachmentType: result.attachmentType,
          komponen: result.komponen,
          categoryCode: result.categoryCode,
          level: result.level,
          roleInActivity: result.role,
          achievement: result.achievement,
          estimatedCredit: result.estimatedCredit === null ? null : String(result.estimatedCredit),
          creditEntryId: result.creditEntryId,
          warnings: result.warnings.map((warning) => ({
            code: typeof warning.data?.code === 'string' ? warning.data.code : `${warning.checkType.toUpperCase()}_WARNING`,
            message: warning.message,
          })),
          lockedAt: null,
          lastError: null,
          updatedAt: new Date(),
        }).where(and(eq(submissions.id, submission.id), eq(submissions.reviewStatus, 'analyzing'))).returning({ id: submissions.id });
        if (!updated) {
          await tx.update(precheckRuns).set({ status: 'done', extracted: result.extractedFields, classification: result.classification, readerStrategy: result.readerStrategy, finishedAt: new Date() }).where(eq(precheckRuns.id, run.id));
          return;
        }
        if (result.findings.length) {
          await tx.insert(findings).values(result.findings.map((item) => ({
            runId: run.id,
            checkType: item.checkType,
            result: item.result,
            confidence: item.confidence ?? null,
            guidelineRef: item.guidelineRef?.id ?? null,
            message: item.message,
            data: item.data ?? null,
          })));
        }
        await tx.delete(agentQuestions).where(eq(agentQuestions.submissionId, submission.id));
        if (result.questions.length) {
          await tx.insert(agentQuestions).values(result.questions.map((question) => ({
            submissionId: submission.id,
            runId: run.id,
            seq: question.seq,
            field: question.field,
            question: question.question,
            options: question.options,
            answer: null,
          })));
        }
        await tx.insert(statusHistory).values({ submissionId: submission.id, field: 'review_status', fromValue: 'analyzing', toValue: result.reviewStatus, changedBy: null, note: 'Pre-check worker selesai' });
        await tx.update(precheckRuns).set({ status: 'done', extracted: result.extractedFields, classification: result.classification, readerStrategy: result.readerStrategy, finishedAt: new Date() }).where(eq(precheckRuns.id, run.id));
      });
    } catch (error) {
      const attempts = submission.attempts;
      const permanent = error instanceof InvalidDocumentError || (error instanceof LlmError && error.kind === 'permanent');
      const retry = !permanent && attempts < config.maxAttempts;
      const safeError = error instanceof LlmError ? error.message : error instanceof Error ? error.name : 'Pre-check gagal';
      const nextStatus = retry ? 'queued' : 'error';
      await db.transaction(async (tx) => {
        const [changed] = await tx.update(submissions).set({
          reviewStatus: nextStatus,
          lockedAt: null,
          nextAttemptAt: retry ? new Date(Date.now() + 5000 * 2 ** attempts) : null,
          lastError: safeError,
          updatedAt: new Date(),
        }).where(and(eq(submissions.id, submission.id), eq(submissions.reviewStatus, 'analyzing'))).returning({ id: submissions.id });
        if (changed) {
          await tx.insert(statusHistory).values({
            submissionId: submission.id,
            field: 'review_status',
            fromValue: 'analyzing',
            toValue: nextStatus,
            changedBy: null,
            note: safeError,
          });
        }
        await tx.update(precheckRuns).set({ status: 'failed', error: safeError, finishedAt: new Date() }).where(eq(precheckRuns.id, run.id));
      });
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
