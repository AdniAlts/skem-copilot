import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { ExtractedFieldsSchema } from '@skem/shared';
import type { PatchSubmissionBody } from '@skem/shared';
import type { Db } from '../db/client.js';
import { agentQuestions, findings, precheckRuns, statusHistory, submissions, users } from '../db/schema.js';
import { creditTable, guidelineSections, rules } from '../rules/config.js';
import { recheck } from '../rules/recheck.js';

export type PatchSubmissionInput = {
  submissionId: number;
  studentId: number;
  patch?: PatchSubmissionBody;
  answer?: { questionId: number; value: string };
};

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validIsoDate(value: string | null): boolean {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function recheckDraft(db: Db, input: PatchSubmissionInput): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx.select({
      submission: submissions,
      studentName: users.name,
      angkatan: users.angkatan,
    }).from(submissions).innerJoin(users, eq(users.id, submissions.studentId))
      .where(and(eq(submissions.id, input.submissionId), eq(submissions.studentId, input.studentId)))
      .limit(1)
      .for('update', { of: submissions });
    if (!current) throw new Error('NOT_FOUND');
    if (current.submission.status !== 'draft' || current.submission.reviewStatus === 'analyzing' || current.submission.reviewStatus === 'queued' || current.submission.reviewStatus === 'cancelled') throw new Error('CONFLICT');

    const [latestRun] = await tx.select().from(precheckRuns)
      .where(eq(precheckRuns.submissionId, input.submissionId)).orderBy(sql`${precheckRuns.id} desc`).limit(1);
    const extractedResult = ExtractedFieldsSchema.safeParse(latestRun?.extracted);
    if (!latestRun || !extractedResult.success) throw new Error('PRECHECK_REQUIRED');
    const extracted = extractedResult.data;
    const answersRows = await tx.select().from(agentQuestions).where(eq(agentQuestions.submissionId, input.submissionId));
    const answers = Object.fromEntries(answersRows.flatMap((row) => row.answer === null ? [] : [[row.field, row.answer]]));
    const activity = input.patch?.activity;
    const skem = input.patch?.skem;
    const questionFieldsToClear = new Set<string>();
    if (activity && hasOwn(activity, 'activityName')) questionFieldsToClear.add('activity_name');
    if (activity && hasOwn(activity, 'activityDate')) {
      questionFieldsToClear.add('activity_date');
      questionFieldsToClear.add('activity_end_date');
    }
    if (skem && hasOwn(skem, 'categoryCode')) questionFieldsToClear.add('category');
    if (skem && hasOwn(skem, 'level')) {
      questionFieldsToClear.add('participant_scope');
      questionFieldsToClear.add('level');
    }
    if (skem && hasOwn(skem, 'roleInActivity')) questionFieldsToClear.add('role');
    if (skem && hasOwn(skem, 'achievement')) questionFieldsToClear.add('achievement');
    if (questionFieldsToClear.size) {
      for (const field of questionFieldsToClear) delete answers[field];
      await tx.update(agentQuestions).set({ answer: null, answeredAt: null })
        .where(and(eq(agentQuestions.submissionId, input.submissionId), inArray(agentQuestions.field, [...questionFieldsToClear])));
    }
    const activityName = activity && hasOwn(activity, 'activityName') ? activity.activityName! : current.submission.activityName;
    const activityDate = activity && hasOwn(activity, 'activityDate') ? activity.activityDate! : current.submission.activityDate;
    const locationPlatform = activity && hasOwn(activity, 'locationPlatform') ? activity.locationPlatform! : current.submission.locationPlatform;
    const organizer = activity && hasOwn(activity, 'organizer') ? activity.organizer! : current.submission.organizer;
    const attachmentType = activity && hasOwn(activity, 'attachmentType') ? activity.attachmentType! : current.submission.attachmentType;
    const categoryCode = skem && hasOwn(skem, 'categoryCode') ? skem.categoryCode! : current.submission.categoryCode;
    const categoryRow = categoryCode ? creditTable.entries.find((entry) => entry.categoryCode === categoryCode) : undefined;
    if (categoryCode && !categoryRow) throw new Error('INVALID_CATEGORY');
    const component = categoryRow?.komponen ?? (categoryCode === null ? null : current.submission.komponen);
    const level = skem && hasOwn(skem, 'level') ? skem.level! : current.submission.level;
    const role = skem && hasOwn(skem, 'roleInActivity') ? skem.roleInActivity! : current.submission.roleInActivity;
    const achievement = skem && hasOwn(skem, 'achievement') ? skem.achievement! : current.submission.achievement;

    if (!validIsoDate(activityDate)) throw new Error('INVALID_DATE');
    if (input.answer) {
      const [question] = await tx.select().from(agentQuestions)
        .where(and(eq(agentQuestions.id, input.answer.questionId), eq(agentQuestions.submissionId, input.submissionId))).limit(1);
      if (!question) throw new Error('QUESTION_NOT_FOUND');
      const options = Array.isArray(question.options) ? question.options as { value?: unknown }[] : [];
      const validOption = options.some((option) => option.value === input.answer!.value);
      const validFreeText = options.length === 0 && (
        question.field === 'activity_name' ||
        (question.field === 'activity_date' && validIsoDate(input.answer.value))
      );
      if (!validOption && !validFreeText) throw new Error('INVALID_ANSWER');
      answers[question.field] = input.answer.value;
      await tx.update(agentQuestions).set({ answer: input.answer.value, answeredAt: new Date() })
        .where(eq(agentQuestions.id, question.id));
    }

    const now = new Date();
    const [locked] = await tx.update(submissions).set({ updatedAt: now })
      .where(and(
        eq(submissions.id, input.submissionId),
        eq(submissions.status, 'draft'),
        notInArray(submissions.reviewStatus, ['analyzing', 'queued', 'cancelled']),
      )).returning({ id: submissions.id });
    if (!locked) throw new Error('CONFLICT');

    const result = recheck({
      documentKind: extracted.document_kind,
      recipientName: extracted.recipient_name.value,
      accountName: current.studentName,
      angkatan: current.angkatan ?? 0,
      activityName,
      activityEndDate: activityDate,
      komponen: component,
      categoryCode,
      level,
      role,
      achievement,
      answers,
      today: now.toISOString().slice(0, 10),
    }, { rules, creditTable, guidelineSections });

    const warnings = result.warnings.map((warning) => ({
      code: typeof warning.data?.code === 'string' ? warning.data.code : `${warning.checkType.toUpperCase()}_WARNING`,
      message: warning.message,
    }));
    await tx.update(submissions).set({
      activityName: result.activityName,
      activityDate: result.activityEndDate,
      locationPlatform,
      organizer,
      attachmentType,
      komponen: result.komponen,
      categoryCode: result.categoryCode,
      level: result.level,
      roleInActivity: result.role,
      achievement: result.achievement,
      estimatedCredit: result.estimatedCredit === null ? null : String(result.estimatedCredit),
      creditEntryId: result.creditEntryId,
      reviewStatus: result.reviewStatus,
      warnings,
      updatedAt: now,
    }).where(eq(submissions.id, input.submissionId));

    const [run] = await tx.insert(precheckRuns).values({
      submissionId: input.submissionId,
      attempt: latestRun.attempt,
      model: latestRun.model,
      readerStrategy: latestRun.readerStrategy,
      status: 'done',
      extracted,
      classification: latestRun.classification,
      startedAt: now,
      finishedAt: now,
    }).returning({ id: precheckRuns.id });
    if (!run) throw new Error('PRECHECK_RUN_CREATE_FAILED');
    if (result.findings.length) await tx.insert(findings).values(result.findings.map((finding) => ({
      runId: run.id,
      checkType: finding.checkType,
      result: finding.result,
      confidence: finding.confidence ?? null,
      guidelineRef: finding.guidelineRef?.id ?? null,
      message: finding.message,
      data: finding.data ?? null,
    })));
    if (current.submission.reviewStatus !== result.reviewStatus) {
      await tx.insert(statusHistory).values({
        submissionId: input.submissionId,
        field: 'review_status',
        fromValue: current.submission.reviewStatus,
        toValue: result.reviewStatus,
        changedBy: input.studentId,
        note: input.answer ? 'Mahasiswa menjawab pertanyaan pre-check' : 'Metadata diperbarui; aturan deterministik dijalankan ulang',
      });
    }
  });
}
