import { asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { AgentQuestionSchema, FindingSchema, SubmissionDetailSchema } from '@skem/shared';
import type { Db } from '../db/client.js';
import { agentQuestions, classes, findings, llmCalls, precheckRuns, reviews, statusHistory, submissions, users } from '../db/schema.js';
import { guidelineSections } from '../rules/config.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function toFinding(row: typeof findings.$inferSelect) {
  const sectionId = row.guidelineRef;
  const section = sectionId ? guidelineSections.sections.find((item) => item.id === sectionId) : undefined;
  return FindingSchema.parse({
    checkType: row.checkType,
    result: row.result,
    ...(row.confidence === null ? {} : { confidence: row.confidence }),
    message: row.message,
    guidelineRef: section ? { id: section.id, title: section.title, ref: section.ref } : null,
    ...(asRecord(row.data) ? { data: asRecord(row.data)! } : {}),
  });
}

export async function getSubmissionDetail(db: Db, publicId: string) {
  const advisor = alias(users, 'advisor');
  const [record] = await db.select({
    submission: submissions,
    student: users,
    className: classes.name,
    verifierName: advisor.name,
    verifierJabatan: advisor.jabatan,
  }).from(submissions)
    .innerJoin(users, eq(users.id, submissions.studentId))
    .leftJoin(classes, eq(classes.id, submissions.classId))
    .leftJoin(advisor, eq(advisor.id, classes.advisorId))
    .where(eq(submissions.publicId, publicId))
    .limit(1);
  if (!record) return null;

  const [latestRun] = await db.select().from(precheckRuns)
    .where(eq(precheckRuns.submissionId, record.submission.id))
    .orderBy(desc(precheckRuns.id)).limit(1);
  const findingRows = latestRun
    ? await db.select().from(findings).where(eq(findings.runId, latestRun.id)).orderBy(asc(findings.id))
    : [];
  const questionRows = await db.select().from(agentQuestions)
    .where(eq(agentQuestions.submissionId, record.submission.id)).orderBy(asc(agentQuestions.seq));
  const reviewRows = await db.select({ review: reviews, reviewerName: users.name })
    .from(reviews).innerJoin(users, eq(users.id, reviews.reviewerId))
    .where(eq(reviews.submissionId, record.submission.id)).orderBy(asc(reviews.id));
  const actor = alias(users, 'history_actor');
  const historyRows = await db.select({ history: statusHistory, actorName: actor.name })
    .from(statusHistory).leftJoin(actor, eq(actor.id, statusHistory.changedBy))
    .where(eq(statusHistory.submissionId, record.submission.id)).orderBy(asc(statusHistory.id));
  const [usage] = await db.select({
    calls: sql<number>`count(*)::int`,
    promptTokens: sql<number>`coalesce(sum(${llmCalls.promptTokens}), 0)::int`,
    completionTokens: sql<number>`coalesce(sum(${llmCalls.completionTokens}), 0)::int`,
    cacheHits: sql<number>`coalesce(sum(case when ${llmCalls.cacheHit} then 1 else 0 end), 0)::int`,
  }).from(llmCalls).where(eq(llmCalls.submissionId, record.submission.id));
  const tokenUsage = usage ?? { calls: 0, promptTokens: 0, completionTokens: 0, cacheHits: 0 };
  const classification = asRecord(latestRun?.classification);
  const candidateRows = classification && Array.isArray(classification.category)
    ? classification.category.flatMap((item) => {
      const candidate = asRecord(item);
      if (!candidate || typeof candidate.code !== 'string' || typeof candidate.confidence !== 'number') return [];
      return [{
        code: candidate.code,
        label: typeof candidate.label === 'string' ? candidate.label : candidate.code,
        confidence: candidate.confidence,
      }];
    })
    : undefined;
  const deadlineRow = findingRows.find((item) => item.checkType === 'deadline');
  const deadlineData = asRecord(deadlineRow?.data);
  const warnings = Array.isArray(record.submission.warnings) ? record.submission.warnings : [];

  const officialStatus = record.submission.status === 'waiting_verifier' || record.submission.status === 'waiting_validator'
    ? 'dalam_proses'
    : record.submission.status === 'approved' ? 'disetujui'
      : record.submission.status === 'rejected' ? 'ditolak' : null;

  return SubmissionDetailSchema.parse({
    publicId: record.submission.publicId,
    status: record.submission.status,
    reviewStatus: record.submission.reviewStatus,
    officialStatus,
    student: {
      name: record.student.name,
      nrp: record.student.nrp ?? '',
      programStudi: record.student.programStudi ?? '',
      departemen: record.student.departemen ?? '',
      angkatan: record.student.angkatan ?? 0,
      className: record.className ?? '',
    },
    verifier: record.verifierName ? { name: record.verifierName, jabatan: record.verifierJabatan ?? '' } : null,
    activity: {
      activityName: record.submission.activityName,
      activityDate: record.submission.activityDate,
      locationPlatform: record.submission.locationPlatform,
      organizer: record.submission.organizer,
      attachmentType: record.submission.attachmentType,
    },
    skem: {
      komponen: record.submission.komponen,
      categoryCode: record.submission.categoryCode,
      level: record.submission.level,
      roleInActivity: record.submission.roleInActivity,
      achievement: record.submission.achievement,
      creditEntryId: record.submission.creditEntryId,
      estimatedCredit: record.submission.estimatedCredit === null ? null : Number(record.submission.estimatedCredit),
      finalCredit: record.submission.finalCredit === null ? null : Number(record.submission.finalCredit),
      ...(candidateRows ? { candidates: { category: candidateRows } } : {}),
    },
    deadline: deadlineRow ? {
      result: deadlineRow.result,
      validFrom: typeof deadlineData?.validFrom === 'string' ? deadlineData.validFrom : null,
      validTo: typeof deadlineData?.validTo === 'string' ? deadlineData.validTo : null,
      message: deadlineRow.message,
    } : null,
    findings: findingRows.map(toFinding),
    warnings: warnings as { code: string; message: string }[],
    questions: questionRows.map((row) => AgentQuestionSchema.parse({
      id: row.id,
      seq: row.seq,
      field: row.field,
      question: row.question,
      options: Array.isArray(row.options) ? row.options : [],
      answer: row.answer,
    })),
    finalForm: { status: record.submission.finalFormStatus },
    reviews: reviewRows.map(({ review, reviewerName }) => ({
      id: review.id,
      stage: review.stage,
      decision: review.decision,
      note: review.note,
      reviewerName,
      createdAt: review.createdAt.toISOString(),
    })),
    timeline: historyRows.map(({ history, actorName }) => ({
      field: history.field,
      from: history.fromValue,
      to: history.toValue,
      at: history.createdAt.toISOString(),
      by: actorName,
      note: history.note,
    })),
    tokenUsage: {
      calls: tokenUsage.calls,
      promptTokens: tokenUsage.promptTokens,
      completionTokens: tokenUsage.completionTokens,
      cacheHits: tokenUsage.cacheHits,
    },
  });
}
