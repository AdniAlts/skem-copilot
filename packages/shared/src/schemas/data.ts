/**
 * Schema untuk file data JSON di repo.
 *
 * Acuan: ARCHITECTURE §2 (data/) dan §12 (answer_key.json).
 */

import { z } from 'zod';
import { REVIEW_STATUS } from '../enums.js';

// ── credit_table.json ─────────────────────────────────────────────────────

/** Satu baris tabel bobot kredit. */
export const CreditTableEntrySchema = z.object({
  id: z.string(),
  komponen: z.number().int().min(1).max(3),
  bidang: z.enum(['A', 'B', 'C']),
  categoryCode: z.string(),
  categoryLabel: z.string(),
  level: z.string(),
  role: z.string(),
  credit: z.number().min(0),
  basis: z.string(),
  ref: z.string(),
});
export type CreditTableEntry = z.infer<typeof CreditTableEntrySchema>;

/** Schema lengkap credit_table.json. */
export const CreditTableSchema = z.object({
  version: z.string(),
  entries: z.array(CreditTableEntrySchema),
});
export type CreditTable = z.infer<typeof CreditTableSchema>;

// ── guideline_sections.json ───────────────────────────────────────────────

/** Satu bagian Pedoman yang dipecah. */
export const GuidelineSectionEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  ref: z.string(),
  text: z.string(),
  tags: z.array(z.string()),
  categoryCodes: z.array(z.string()).optional(),
});
export type GuidelineSectionEntry = z.infer<typeof GuidelineSectionEntrySchema>;

/** Schema lengkap guideline_sections.json. */
export const GuidelineSectionsSchema = z.object({
  version: z.string(),
  sections: z.array(GuidelineSectionEntrySchema),
});
export type GuidelineSections = z.infer<typeof GuidelineSectionsSchema>;

// ── rules.json ────────────────────────────────────────────────────────────

/** Konfigurasi aturan untuk agent dan validasi. */
export const RulesSchema = z.object({
  confidenceThreshold: z.number().min(0).max(1),
  nameMatch: z.object({
    warnMin: z.number().min(0).max(1),
  }),
  worker: z.object({
    concurrency: z.number().int().min(1).max(2),
    maxAttempts: z.number().int().min(1),
  }),
  dateRules: z.object({
    angkatan2024MinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    angkatan2025PlusWindowYears: z.number().int().min(1),
  }),
  maxQuestionsPerSubmission: z.number().int().min(1).max(3),
});
export type Rules = z.infer<typeof RulesSchema>;

// ── answer_key.json ───────────────────────────────────────────────────────

/** Satu kasus test set. */
export const TestCaseSchema = z.object({
  id: z.string(),
  file: z.string(),
  split: z.enum(['tuning', 'heldout']),
  account: z.object({
    name: z.string(),
    angkatan: z.number().int(),
  }),
  submissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.record(z.string()),
  expected: z.object({
    review_status_before_answer: z.enum(REVIEW_STATUS).optional(),
    review_status: z.enum(REVIEW_STATUS),
    category_code: z.string(),
    level: z.string(),
    role: z.string(),
    credit_entry_id: z.string(),
    errors: z.array(z.string()),
  }),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

/** Schema lengkap answer_key.json. */
export const AnswerKeySchema = z.object({
  cases: z.array(TestCaseSchema),
});
export type AnswerKey = z.infer<typeof AnswerKeySchema>;

// ── seed data ─────────────────────────────────────────────────────────────

/** Data kelas untuk seed. */
export const SeedClassSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});
export type SeedClass = z.infer<typeof SeedClassSchema>;

/** Data pengguna untuk seed. */
export const SeedUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  nrp: z.string().nullable(),
  role: z.enum(['student', 'verifier', 'validator', 'unit']),
  angkatan: z.number().int().nullable(),
  programStudi: z.string().nullable(),
  departemen: z.string().nullable(),
  jabatan: z.string().nullable(),
  classId: z.number().int().positive().nullable(),
});
export type SeedUser = z.infer<typeof SeedUserSchema>;

/** Schema lengkap seed data. */
export const SeedDataSchema = z.object({
  classes: z.array(SeedClassSchema),
  users: z.array(SeedUserSchema),
});
export type SeedData = z.infer<typeof SeedDataSchema>;
