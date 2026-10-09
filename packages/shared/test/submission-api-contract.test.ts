import { describe, expect, it } from 'vitest';
import { AnswerBodySchema, PatchSubmissionBodySchema, SubmissionDetailSchema, SubmitBodySchema } from '../src/index.js';

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
});
