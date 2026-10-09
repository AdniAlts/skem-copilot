/**
 * Schema untuk file data JSON di repo.
 *
 * Acuan: ARCHITECTURE §2 (data/) dan §12 (answer_key.json).
 */

import { z } from 'zod';
import { CHECK_TYPE, REVIEW_STATUS } from '../enums.js';

// ── credit_table.json ─────────────────────────────────────────────────────

/** Bidang Komponen 3 di Lampiran Pedoman. Komponen 1 dan 2 tidak punya bidang. */
export const CREDIT_TABLE_BIDANG = ['A', 'B', 'C', 'D'] as const;

/**
 * Satu baris tabel bobot kredit.
 * `level` dan `role` bernilai null jika kolomnya kosong di Lampiran
 * (mis. Komponen 1–2 tanpa tingkat, bidang D tanpa jabatan).
 */
export const CreditTableEntrySchema = z.object({
  id: z.string().min(1),
  komponen: z.number().int().min(1).max(3),
  bidang: z.enum(CREDIT_TABLE_BIDANG).nullable(),
  categoryCode: z.string().min(1),
  categoryLabel: z.string().min(1),
  level: z.string().min(1).nullable(),
  role: z.string().min(1).nullable(),
  credit: z.number().min(0),
  basis: z.string().min(1),
  ref: z.string().min(1),
});
export type CreditTableEntry = z.infer<typeof CreditTableEntrySchema>;

/** Schema lengkap credit_table.json, termasuk keunikan id dan kombinasi lookup. */
export const CreditTableSchema = z
  .object({
    version: z.string().min(1),
    entries: z.array(CreditTableEntrySchema).min(1),
  })
  .superRefine((table, ctx) => {
    const ids = new Set<string>();
    const combos = new Set<string>();
    table.entries.forEach((entry, index) => {
      if (ids.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entries', index, 'id'],
          message: `Duplicate id: ${entry.id}`,
        });
      }
      ids.add(entry.id);

      const combo = JSON.stringify([entry.categoryCode, entry.level, entry.role]);
      if (combos.has(combo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entries', index],
          message: `Duplicate (categoryCode, level, role): ${combo}`,
        });
      }
      combos.add(combo);

      if ((entry.komponen === 3) !== (entry.bidang !== null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entries', index, 'bidang'],
          message: 'bidang is required for komponen 3 and must be null otherwise',
        });
      }
    });
  });
export type CreditTable = z.infer<typeof CreditTableSchema>;

// ── guideline_sections.json ───────────────────────────────────────────────

const GUIDELINE_TAG_PATTERN = /^(check|topic):[a-z0-9_-]+$/;
const CHECK_TAG_PREFIX = 'check:';

/**
 * Satu bagian Pedoman yang dipecah.
 * Tag `check:<check_type>` harus salah satu CHECK_TYPE; tag lain memakai `topic:<slug>`.
 */
export const GuidelineSectionEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be kebab-case'),
  title: z.string().min(1),
  ref: z.string().min(1),
  text: z.string().min(1),
  tags: z
    .array(
      z
        .string()
        .regex(GUIDELINE_TAG_PATTERN, 'tag must be check:<type> or topic:<slug>')
        .refine(
          (tag) =>
            !tag.startsWith(CHECK_TAG_PREFIX) ||
            (CHECK_TYPE as readonly string[]).includes(tag.slice(CHECK_TAG_PREFIX.length)),
          'check tag must use a CHECK_TYPE value',
        ),
    )
    .min(1),
  categoryCodes: z.array(z.string().min(1)).optional(),
});
export type GuidelineSectionEntry = z.infer<typeof GuidelineSectionEntrySchema>;

/** Schema lengkap guideline_sections.json, termasuk keunikan id (dirujuk findings.guideline_ref). */
export const GuidelineSectionsSchema = z
  .object({
    version: z.string().min(1),
    sections: z.array(GuidelineSectionEntrySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    data.sections.forEach((section, index) => {
      if (ids.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sections', index, 'id'],
          message: `Duplicate id: ${section.id}`,
        });
      }
      ids.add(section.id);
    });
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
    /** Angkatan pertama yang wajib SKEM (Ketentuan Peralihan poin 1). Di bawahnya → fail. */
    minAngkatan: z.number().int(),
    angkatan2024MinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    angkatan2025PlusWindowYears: z.number().int().min(1),
    /**
     * Perkiraan awal masa studi (MM-DD di tahun angkatan). Kegiatan sebelum tanggal ini
     * hanya diberi peringatan (Ketentuan Umum SKEM poin 8), bukan ditolak.
     */
    studyStartMonthDay: z.string().regex(/^\d{2}-\d{2}$/),
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
