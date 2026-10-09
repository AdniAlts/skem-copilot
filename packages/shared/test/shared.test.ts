/**
 * Tes untuk @skem/shared.
 *
 * Acceptance criteria L-03:
 * 1. Enum snapshot (nilai identik dengan ARCHITECTURE §3.1)
 * 2. RejectBody menolak whitespace
 * 3. CreditAdjustBody menolak alasan kosong/whitespace
 * 4. SubmitBody batas 1-10
 */

import { describe, it, expect } from 'vitest';
import {
  // Enum
  USER_ROLE,
  REVIEW_STATUS,
  SUBMISSION_STATUS,
  RUN_STATUS,
  READER_STRATEGY,
  CHECK_TYPE,
  FINDING_RESULT,
  DOCUMENT_TYPE,
  REVIEW_STAGE,
  REVIEW_DECISION,
  FINAL_FORM_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  PARTICIPANT_SCOPE,
  OFFICIAL_STATUS,
  // Schema
  RejectBodySchema,
  CreditAdjustBodySchema,
  SubmitBodySchema,
  ValidatorRejectBodySchema,
  // Helper
  toOfficialStatus,
  // Labels
  REVIEW_STATUS_LABELS,
  SUBMISSION_STATUS_LABELS,
  OFFICIAL_STATUS_LABELS,
} from '../src/index.js';

describe('Enums (ARCHITECTURE §3.1)', () => {
  it('USER_ROLE', () => {
    expect(USER_ROLE).toMatchInlineSnapshot(`
      [
        "student",
        "verifier",
        "validator",
        "unit",
      ]
    `);
  });

  it('REVIEW_STATUS', () => {
    expect(REVIEW_STATUS).toMatchInlineSnapshot(`
      [
        "queued",
        "analyzing",
        "ready",
        "needs_fix",
        "problem",
        "error",
        "cancelled",
      ]
    `);
  });

  it('SUBMISSION_STATUS', () => {
    expect(SUBMISSION_STATUS).toMatchInlineSnapshot(`
      [
        "draft",
        "waiting_verifier",
        "waiting_validator",
        "approved",
        "rejected",
      ]
    `);
  });

  it('RUN_STATUS', () => {
    expect(RUN_STATUS).toMatchInlineSnapshot(`
      [
        "running",
        "done",
        "failed",
      ]
    `);
  });

  it('READER_STRATEGY', () => {
    expect(READER_STRATEGY).toMatchInlineSnapshot(`
      [
        "text",
        "vision",
        "ocr",
        "cache",
      ]
    `);
  });

  it('CHECK_TYPE', () => {
    expect(CHECK_TYPE).toMatchInlineSnapshot(`
      [
        "category",
        "level",
        "role",
        "activity_name",
        "name_match",
        "deadline",
        "completeness",
        "credit",
      ]
    `);
  });

  it('FINDING_RESULT', () => {
    expect(FINDING_RESULT).toMatchInlineSnapshot(`
      [
        "pass",
        "warn",
        "fail",
      ]
    `);
  });

  it('DOCUMENT_TYPE', () => {
    expect(DOCUMENT_TYPE).toMatchInlineSnapshot(`
      [
        "certificate",
        "supporting",
      ]
    `);
  });

  it('REVIEW_STAGE', () => {
    expect(REVIEW_STAGE).toMatchInlineSnapshot(`
      [
        "verifier",
        "validator",
      ]
    `);
  });

  it('REVIEW_DECISION', () => {
    expect(REVIEW_DECISION).toMatchInlineSnapshot(`
      [
        "approve",
        "reject",
        "adjust_credit",
      ]
    `);
  });

  it('FINAL_FORM_STATUS', () => {
    expect(FINAL_FORM_STATUS).toMatchInlineSnapshot(`
      [
        "none",
        "ready",
        "failed",
      ]
    `);
  });

  it('NOTIFICATION_CHANNEL', () => {
    expect(NOTIFICATION_CHANNEL).toMatchInlineSnapshot(`
      [
        "in_app",
        "telegram",
      ]
    `);
  });

  it('NOTIFICATION_STATUS', () => {
    expect(NOTIFICATION_STATUS).toMatchInlineSnapshot(`
      [
        "pending",
        "sent",
        "failed",
      ]
    `);
  });

  it('PARTICIPANT_SCOPE (non-DB)', () => {
    expect(PARTICIPANT_SCOPE).toMatchInlineSnapshot(`
      [
        "campus",
        "regional",
        "national",
        "international",
      ]
    `);
  });

  it('OFFICIAL_STATUS (non-DB)', () => {
    expect(OFFICIAL_STATUS).toMatchInlineSnapshot(`
      [
        "dalam_proses",
        "disetujui",
        "ditolak",
      ]
    `);
  });
});

describe('RejectBody validation', () => {
  it('menerima alasan valid', () => {
    const result = RejectBodySchema.safeParse({ note: 'Data tidak lengkap.' });
    expect(result.success).toBe(true);
  });

  it('menolak alasan kosong', () => {
    const result = RejectBodySchema.safeParse({ note: '' });
    expect(result.success).toBe(false);
  });

  it('menolak alasan whitespace saja', () => {
    const result = RejectBodySchema.safeParse({ note: '   ' });
    expect(result.success).toBe(false);
  });

  it('menolak tanpa field note', () => {
    const result = RejectBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ValidatorRejectBody validation', () => {
  it('menerima alasan valid', () => {
    const result = ValidatorRejectBodySchema.safeParse({
      note: 'Kredit tidak sesuai.',
    });
    expect(result.success).toBe(true);
  });

  it('menolak alasan whitespace saja', () => {
    const result = ValidatorRejectBodySchema.safeParse({ note: '\t\n' });
    expect(result.success).toBe(false);
  });
});

describe('CreditAdjustBody validation', () => {
  it('menerima data valid', () => {
    const result = CreditAdjustBodySchema.safeParse({
      finalCredit: 0.5,
      reason: 'Kegiatan seharusnya 0.5 kredit.',
    });
    expect(result.success).toBe(true);
  });

  it('menolak alasan kosong', () => {
    const result = CreditAdjustBodySchema.safeParse({
      finalCredit: 0.5,
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('menolak alasan whitespace saja', () => {
    const result = CreditAdjustBodySchema.safeParse({
      finalCredit: 0.5,
      reason: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('menolak kredit negatif', () => {
    const result = CreditAdjustBodySchema.safeParse({
      finalCredit: -0.5,
      reason: 'Alasan valid.',
    });
    expect(result.success).toBe(false);
  });
});

describe('SubmitBody validation', () => {
  it('menerima 1 publicId', () => {
    const result = SubmitBodySchema.safeParse({
      publicIds: ['SKM-7Q2K9D1A'],
    });
    expect(result.success).toBe(true);
  });

  it('menerima 10 publicIds', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `SKM-${String(i).padStart(8, 'A')}`);
    const result = SubmitBodySchema.safeParse({ publicIds: ids });
    expect(result.success).toBe(true);
  });

  it('menolak 0 publicIds', () => {
    const result = SubmitBodySchema.safeParse({ publicIds: [] });
    expect(result.success).toBe(false);
  });

  it('menolak 11 publicIds', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `SKM-${String(i).padStart(8, 'A')}`);
    const result = SubmitBodySchema.safeParse({ publicIds: ids });
    expect(result.success).toBe(false);
  });

  it('menolak format publicId tidak valid', () => {
    const result = SubmitBodySchema.safeParse({
      publicIds: ['INVALID-ID'],
    });
    expect(result.success).toBe(false);
  });
});

describe('toOfficialStatus()', () => {
  it('draft → null', () => {
    expect(toOfficialStatus('draft')).toBeNull();
  });

  it('waiting_verifier → dalam_proses', () => {
    expect(toOfficialStatus('waiting_verifier')).toBe('dalam_proses');
  });

  it('waiting_validator → dalam_proses', () => {
    expect(toOfficialStatus('waiting_validator')).toBe('dalam_proses');
  });

  it('approved → disetujui', () => {
    expect(toOfficialStatus('approved')).toBe('disetujui');
  });

  it('rejected → ditolak', () => {
    expect(toOfficialStatus('rejected')).toBe('ditolak');
  });
});

describe('Labels (Bahasa Indonesia)', () => {
  it('REVIEW_STATUS_LABELS lengkap', () => {
    expect(Object.keys(REVIEW_STATUS_LABELS)).toHaveLength(7);
    expect(REVIEW_STATUS_LABELS.queued).toBe('Menunggu antrean');
    expect(REVIEW_STATUS_LABELS.needs_fix).toBe('Perlu perbaikan');
  });

  it('SUBMISSION_STATUS_LABELS lengkap', () => {
    expect(Object.keys(SUBMISSION_STATUS_LABELS)).toHaveLength(5);
    expect(SUBMISSION_STATUS_LABELS.waiting_verifier).toBe('Menunggu Verifikator');
  });

  it('OFFICIAL_STATUS_LABELS lengkap', () => {
    expect(Object.keys(OFFICIAL_STATUS_LABELS)).toHaveLength(3);
    expect(OFFICIAL_STATUS_LABELS.dalam_proses).toBe('Dalam proses');
  });
});
