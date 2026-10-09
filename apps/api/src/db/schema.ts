/**
 * Skema database (Drizzle ORM, Postgres).
 *
 * Acuan mengikat: ARCHITECTURE §3.1 (enum) dan §3.2 (tabel).
 * Nama tabel/kolom snake_case, waktu timestamptz default now(),
 * kredit numeric(4,2) (dikonversi ke number di batas API).
 */

import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import {
  CHECK_TYPE,
  DOCUMENT_TYPE,
  FINAL_FORM_STATUS,
  FINDING_RESULT,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  READER_STRATEGY,
  REVIEW_DECISION,
  REVIEW_STAGE,
  REVIEW_STATUS,
  RUN_STATUS,
  SUBMISSION_STATUS,
  USER_ROLE,
} from '@skem/shared';

// ── Enum Postgres ─────────────────────────────────────────────────────────

export const userRole = pgEnum('user_role', USER_ROLE);
export const reviewStatus = pgEnum('review_status', REVIEW_STATUS);
export const submissionStatus = pgEnum('submission_status', SUBMISSION_STATUS);
export const runStatus = pgEnum('run_status', RUN_STATUS);
export const readerStrategy = pgEnum('reader_strategy', READER_STRATEGY);
export const checkType = pgEnum('check_type', CHECK_TYPE);
export const findingResult = pgEnum('finding_result', FINDING_RESULT);
export const documentType = pgEnum('document_type', DOCUMENT_TYPE);
export const reviewStage = pgEnum('review_stage', REVIEW_STAGE);
export const reviewDecision = pgEnum('review_decision', REVIEW_DECISION);
export const finalFormStatus = pgEnum('final_form_status', FINAL_FORM_STATUS);
export const notificationChannel = pgEnum('notification_channel', NOTIFICATION_CHANNEL);
export const notificationStatus = pgEnum('notification_status', NOTIFICATION_STATUS);

// ── classes ───────────────────────────────────────────────────────────────

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  advisorId: integer('advisor_id').references((): AnyPgColumn => users.id),
});

// ── users ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    nrp: text('nrp'),
    role: userRole('role').notNull(),
    angkatan: integer('angkatan'),
    programStudi: text('program_studi'),
    departemen: text('departemen'),
    jabatan: text('jabatan'),
    classId: integer('class_id').references(() => classes.id),
    signaturePath: text('signature_path'),
    telegramChatId: text('telegram_chat_id'),
    telegramLinkToken: text('telegram_link_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('users_nrp_unique').on(t.nrp), index('users_class_id_idx').on(t.classId)],
);

// FK lingkar: classes.advisor_id → users (diisi setelah users ada)
// (drizzle-kit mendukung FK lintas tabel yang didefinisikan di sini)

// ── batches ───────────────────────────────────────────────────────────────

export const batches = pgTable(
  'batches',
  {
    id: serial('id').primaryKey(),
    publicId: text('public_id').notNull().unique(),
    studentId: integer('student_id')
      .notNull()
      .references(() => users.id),
    fileCount: integer('file_count').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('batches_file_count_check', sql`${t.fileCount} BETWEEN 1 AND 10`)],
);

// ── submissions ───────────────────────────────────────────────────────────

export const submissions = pgTable(
  'submissions',
  {
    id: serial('id').primaryKey(),
    publicId: text('public_id').notNull().unique(),
    batchId: integer('batch_id').references(() => batches.id),
    studentId: integer('student_id')
      .notNull()
      .references(() => users.id),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id),
    status: submissionStatus('status').notNull().default('draft'),
    reviewStatus: reviewStatus('review_status').notNull().default('queued'),
    activityName: text('activity_name'),
    activityDate: date('activity_date'),
    locationPlatform: text('location_platform'),
    organizer: text('organizer'),
    attachmentType: text('attachment_type'),
    komponen: integer('komponen'),
    categoryCode: text('category_code'),
    level: text('level'),
    roleInActivity: text('role_in_activity'),
    achievement: text('achievement'),
    creditEntryId: text('credit_entry_id'),
    estimatedCredit: numeric('estimated_credit', { precision: 4, scale: 2 }),
    finalCredit: numeric('final_credit', { precision: 4, scale: 2 }),
    warnings: jsonb('warnings').notNull().default([]),
    finalFormPath: text('final_form_path'),
    finalFormStatus: finalFormStatus('final_form_status').notNull().default('none'),
    attempts: integer('attempts').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('submissions_queued_idx')
      .on(t.createdAt)
      .where(sql`review_status = 'queued'`),
    index('submissions_class_status_idx').on(t.classId, t.status),
    index('submissions_student_status_idx').on(t.studentId, t.status),
    index('submissions_batch_idx').on(t.batchId),
  ],
);

// ── documents ─────────────────────────────────────────────────────────────

export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    type: documentType('type').notNull(),
    filePath: text('file_path').notNull(),
    fileName: text('file_name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    pageCount: integer('page_count'),
  },
  (t) => [
    index('documents_submission_idx').on(t.submissionId),
    index('documents_sha256_idx').on(t.sha256),
  ],
);

// ── precheck_runs ─────────────────────────────────────────────────────────

export const precheckRuns = pgTable(
  'precheck_runs',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    attempt: integer('attempt').notNull(),
    model: text('model').notNull(),
    readerStrategy: readerStrategy('reader_strategy'),
    status: runStatus('status').notNull(),
    extracted: jsonb('extracted'),
    classification: jsonb('classification'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [index('precheck_runs_submission_idx').on(t.submissionId)],
);

// ── findings ──────────────────────────────────────────────────────────────

export const findings = pgTable(
  'findings',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => precheckRuns.id, { onDelete: 'cascade' }),
    checkType: checkType('check_type').notNull(),
    result: findingResult('result').notNull(),
    confidence: real('confidence'),
    guidelineRef: text('guideline_ref'),
    message: text('message').notNull(),
    data: jsonb('data'),
  },
  (t) => [index('findings_run_idx').on(t.runId)],
);

// ── agent_questions ───────────────────────────────────────────────────────

export const agentQuestions = pgTable(
  'agent_questions',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    runId: integer('run_id')
      .notNull()
      .references(() => precheckRuns.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    field: text('field').notNull(),
    question: text('question').notNull(),
    options: jsonb('options'),
    answer: text('answer'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [
    unique('agent_questions_submission_seq_unique').on(t.submissionId, t.seq),
    check('agent_questions_seq_check', sql`${t.seq} BETWEEN 1 AND 3`),
  ],
);

// ── llm_calls ─────────────────────────────────────────────────────────────

export const llmCalls = pgTable(
  'llm_calls',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id').references(() => precheckRuns.id, { onDelete: 'set null' }),
    submissionId: integer('submission_id').references(() => submissions.id, {
      onDelete: 'set null',
    }),
    purpose: text('purpose').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    latencyMs: integer('latency_ms'),
    cacheHit: boolean('cache_hit').notNull().default(false),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('llm_calls_submission_idx').on(t.submissionId),
    index('llm_calls_created_at_idx').on(t.createdAt),
  ],
);

// ── extraction_cache ──────────────────────────────────────────────────────

export const extractionCache = pgTable(
  'extraction_cache',
  {
    sha256: text('sha256').notNull(),
    readerVersion: text('reader_version').notNull(),
    model: text('model').notNull(),
    result: jsonb('result').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sha256, t.readerVersion] })],
);

// ── reviews ───────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    reviewerId: integer('reviewer_id')
      .notNull()
      .references(() => users.id),
    stage: reviewStage('stage').notNull(),
    decision: reviewDecision('decision').notNull(),
    note: text('note'),
    previousCredit: numeric('previous_credit', { precision: 4, scale: 2 }),
    adjustedCredit: numeric('adjusted_credit', { precision: 4, scale: 2 }),
    adjustReason: text('adjust_reason'),
    signatureApplied: boolean('signature_applied').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reviews_submission_idx').on(t.submissionId),
    index('reviews_reviewer_stage_idx').on(t.reviewerId, t.stage),
    check(
      'reviews_reject_note_check',
      sql`(${t.decision} <> 'reject') OR (length(trim(${t.note})) > 0)`,
    ),
    check(
      'reviews_adjust_reason_check',
      sql`(${t.adjustedCredit} IS NULL) OR (length(trim(${t.adjustReason})) > 0)`,
    ),
  ],
);

// ── status_history ────────────────────────────────────────────────────────

export const statusHistory = pgTable(
  'status_history',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    field: text('field').notNull(), // 'status' | 'review_status'
    fromValue: text('from_value'),
    toValue: text('to_value').notNull(),
    changedBy: integer('changed_by').references(() => users.id), // NULL = sistem
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('status_history_submission_created_idx').on(t.submissionId, t.createdAt)],
);

// ── notifications ─────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    submissionId: integer('submission_id').references(() => submissions.id, {
      onDelete: 'cascade',
    }),
    channel: notificationChannel('channel').notNull(),
    triggerReviewId: integer('trigger_review_id').references(() => reviews.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: notificationStatus('status').notNull().default('pending'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_read_idx').on(t.userId, t.readAt)],
);

// ── Relations ─────────────────────────────────────────────────────────────

export const classesRelations = relations(classes, ({ one, many }) => ({
  advisor: one(users, { fields: [classes.advisorId], references: [users.id] }),
  members: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  class: one(classes, { fields: [users.classId], references: [classes.id] }),
  submissions: many(submissions),
  reviews: many(reviews),
  notifications: many(notifications),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  student: one(users, { fields: [batches.studentId], references: [users.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  batch: one(batches, { fields: [submissions.batchId], references: [batches.id] }),
  student: one(users, { fields: [submissions.studentId], references: [users.id] }),
  class: one(classes, { fields: [submissions.classId], references: [classes.id] }),
  documents: many(documents),
  precheckRuns: many(precheckRuns),
  agentQuestions: many(agentQuestions),
  reviews: many(reviews),
  statusHistory: many(statusHistory),
  notifications: many(notifications),
}));

export const precheckRunsRelations = relations(precheckRuns, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [precheckRuns.submissionId],
    references: [submissions.id],
  }),
  findings: many(findings),
  agentQuestions: many(agentQuestions),
  llmCalls: many(llmCalls),
}));
