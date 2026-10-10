import { describe, expect, it } from 'vitest';
import {
  AnswerBodySchema,
  ApproveBodySchema,
  CreditAdjustBodySchema,
  PatchSubmissionBodySchema,
  RejectBodySchema,
  SubmissionDetailSchema,
  SubmitBodySchema,
  ValidateBodySchema,
  ValidatorQueueQuerySchema,
  ValidatorQueueResponseSchema,
  ValidatorRejectBodySchema,
  VerifierQueueQuerySchema,
  VerifierQueueResponseSchema,
} from '../src/index.js';

describe('submission API contracts', () => {
  it('allows unextracted activity metadata to be null in detail', () => {
    const parsed = SubmissionDetailSchema.parse({
      publicId: 'SKM-1234ABCD',
      status: 'draft',
      reviewStatus: 'queued',
      officialStatus: null,
      student: { name: 'Student', nrp: '123', programStudi: 'TI', departemen: 'TIK', angkatan: 2025, className: 'A' },
      verifier: null,
      activity: { activityName: null, activityDate: null, locationPlatform: null, organizer: null, attachmentType: null },
      skem: { komponen: null, categoryCode: null, level: null, roleInActivity: null, achievement: null, creditEntryId: null, estimatedCredit: null, finalCredit: null },
      deadline: null,
      findings: [],
      warnings: [],
      questions: [],
      finalForm: { status: 'none' },
      reviews: [],
      timeline: [],
    });
    expect(parsed.activity.activityDate).toBeNull();
    expect(parsed.skem.komponen).toBeNull();
  });

  it('rejects identity fields in metadata patch body', () => {
    expect(PatchSubmissionBodySchema.safeParse({ student: { name: 'Changed', nrp: '999' } }).success).toBe(false);
    expect(PatchSubmissionBodySchema.safeParse({ activity: { activityName: 'Event', nrp: '999' } }).success).toBe(false);
  });

  it('rejects empty metadata groups', () => {
    expect(PatchSubmissionBodySchema.safeParse({ activity: {} }).success).toBe(false);
    expect(PatchSubmissionBodySchema.safeParse({ skem: {} }).success).toBe(false);
  });

  it('limits free-text answer size', () => {
    expect(AnswerBodySchema.safeParse({ questionId: 1, answer: 'a'.repeat(500) }).success).toBe(true);
    expect(AnswerBodySchema.safeParse({ questionId: 1, answer: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects duplicate IDs in submit batches', () => {
    expect(SubmitBodySchema.safeParse({ publicIds: ['SKM-12345678', 'SKM-12345678'] }).success).toBe(false);
  });

  it('defaults verifier queue sort to oldest and rejects unknown filters', () => {
    expect(VerifierQueueQuerySchema.parse({})).toEqual({ sort: 'oldest' });
    expect(VerifierQueueQuerySchema.parse({ aiStatus: 'warning', sort: 'flags' })).toEqual({ aiStatus: 'warning', sort: 'flags' });
    expect(VerifierQueueQuerySchema.safeParse({ aiStatus: 'ready' }).success).toBe(false);
    expect(VerifierQueueQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
  });

  it('requires a non-blank reject note and bounds verifier notes', () => {
    expect(RejectBodySchema.safeParse({ note: '   ' }).success).toBe(false);
    expect(RejectBodySchema.safeParse({}).success).toBe(false);
    expect(RejectBodySchema.safeParse({ note: 'a'.repeat(1001) }).success).toBe(false);
    expect(ApproveBodySchema.safeParse({ note: 'a'.repeat(1001) }).success).toBe(false);
    expect(ApproveBodySchema.parse({ note: '  ok  ' })).toEqual({ note: 'ok' });
  });

  it('parses verifier queue response items', () => {
    const parsed = VerifierQueueResponseSchema.parse({
      className: 'D3-IT-A 2024',
      summary: { waiting: 1, withWarnings: 1 },
      items: [{
        publicId: 'SKM-1234ABCD',
        studentName: 'Student',
        activityName: null,
        categoryLabel: null,
        level: null,
        estimatedCredit: null,
        aiStatus: 'warning',
        flagCount: 1,
        submittedAt: '2026-10-10T00:00:00.000Z',
      }],
    });
    expect(parsed.items[0]?.aiStatus).toBe('warning');
  });

  it('bounds validator credit to 0..3 with at most two decimals and a bounded reason', () => {
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 1.25, reason: 'ok' }).success).toBe(true);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 3, reason: 'ok' }).success).toBe(true);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 3.01, reason: 'ok' }).success).toBe(false);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: -0.01, reason: 'ok' }).success).toBe(false);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 0.125, reason: 'ok' }).success).toBe(false);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 0.1 + 0.2, reason: 'ok' }).success).toBe(true);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 1, reason: '   ' }).success).toBe(false);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 1, reason: 'a'.repeat(1001) }).success).toBe(false);
    expect(CreditAdjustBodySchema.safeParse({ finalCredit: 1, reason: 'ok', extra: 1 }).success).toBe(false);
  });

  it('requires a bounded validator reject note and an empty validate body', () => {
    expect(ValidatorRejectBodySchema.safeParse({ note: '  ' }).success).toBe(false);
    expect(ValidatorRejectBodySchema.safeParse({ note: 'a'.repeat(1001) }).success).toBe(false);
    expect(ValidateBodySchema.safeParse({}).success).toBe(true);
    expect(ValidateBodySchema.safeParse({ finalCredit: 1 }).success).toBe(false);
  });

  it('parses validator queue query and response', () => {
    expect(ValidatorQueueQuerySchema.parse({ classId: '2' })).toEqual({ classId: 2 });
    expect(ValidatorQueueQuerySchema.safeParse({ classId: 'x' }).success).toBe(false);
    expect(ValidatorQueueQuerySchema.safeParse({ sort: 'newest' }).success).toBe(false);
    const parsed = ValidatorQueueResponseSchema.parse({
      summary: { waiting: 1, formFailed: 0 },
      items: [{
        publicId: 'SKM-1234ABCD',
        studentName: 'Student',
        nrp: null,
        className: null,
        activityName: null,
        categoryLabel: null,
        level: null,
        estimatedCredit: 0.5,
        finalCredit: null,
        flagCount: 0,
        finalFormStatus: 'none',
        submittedAt: null,
      }],
    });
    expect(parsed.items[0]?.finalFormStatus).toBe('none');
  });
});
