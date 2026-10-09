/**
 * Schema untuk hasil pre-check (klasifikasi, temuan, pertanyaan agent).
 *
 * Acuan: ARCHITECTURE §8 (kontrak tool agent).
 */

import { z } from 'zod';
import { CHECK_TYPE, FINDING_RESULT } from '../enums.js';

// ── Klasifikasi aktivitas ─────────────────────────────────────────────────

/** Kandidat klasifikasi dengan confidence. */
export const CandidateSchema = z.object({
  code: z.string(),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type Candidate = z.infer<typeof CandidateSchema>;

/** Field opsional dengan confidence (untuk activity_name_full). */
const ExtractedFieldOptionalSchema = z
  .object({
    value: z.string(),
    confidence: z.number().min(0).max(1),
  })
  .nullable();

/**
 * Hasil klasifikasi aktivitas oleh LLM.
 *
 * ATURAN KERAS: TIDAK ada field kredit di sini.
 * Kredit dihitung oleh lookup_credit_table setelah klasifikasi.
 */
export const ClassificationResultSchema = z.object({
  category: z.array(CandidateSchema).min(1).max(3),
  level: z.array(CandidateSchema).min(1).max(3),
  role: z.array(CandidateSchema).min(1).max(3),
  achievement: z.array(CandidateSchema).min(1).max(3),
  activity_name_full: ExtractedFieldOptionalSchema,
  missing: z.array(z.string()),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ── Temuan (findings) ─────────────────────────────────────────────────────

/** Rujukan ke bagian Pedoman. */
export const GuidelineRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  ref: z.string(),
});
export type GuidelineRef = z.infer<typeof GuidelineRefSchema>;

/**
 * Hasil satu pemeriksaan (finding).
 *
 * check_type: kategori pemeriksaan (category, level, role, activity_name, name_match, deadline, completeness, credit)
 * result: pass (lulus), warn (peringatan), fail (gagal)
 */
export const FindingSchema = z.object({
  checkType: z.enum(CHECK_TYPE),
  result: z.enum(FINDING_RESULT),
  confidence: z.number().min(0).max(1).optional(),
  message: z.string(),
  guidelineRef: GuidelineRefSchema.nullable().optional(),
  data: z.record(z.unknown()).optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ── Pertanyaan agent ──────────────────────────────────────────────────────

/** Opsi jawaban pertanyaan agent. */
export const QuestionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

/**
 * Pertanyaan agent untuk mahasiswa.
 *
 * Maks. 3 pertanyaan per kartu (CHECK seq ≤ 3 di database).
 * Pertanyaan tingkat selalu berupa pilihan PARTICIPANT_SCOPE + "unknown".
 */
export const AgentQuestionSchema = z.object({
  id: z.number().int().positive(),
  seq: z.number().int().min(1).max(3),
  field: z.string(),
  question: z.string(),
  options: z.array(QuestionOptionSchema),
  answer: z.string().nullable().optional(),
});
export type AgentQuestion = z.infer<typeof AgentQuestionSchema>;

// ── Hasil tool agent (untuk referensi) ────────────────────────────────────

/**
 * Hasil match_name (fungsi murni).
 * Acuan: ARCHITECTURE §8.
 */
export const MatchNameResultSchema = z.object({
  result: z.enum(FINDING_RESULT),
  score: z.number().min(0).max(1),
});
export type MatchNameResult = z.infer<typeof MatchNameResultSchema>;

/**
 * Hasil check_deadline (fungsi murni).
 * Acuan: ARCHITECTURE §8.
 */
export const CheckDeadlineResultSchema = z.object({
  result: z.enum(FINDING_RESULT),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  message: z.string(),
});
export type CheckDeadlineResult = z.infer<typeof CheckDeadlineResultSchema>;

/**
 * Hasil lookup_credit_table (fungsi murni).
 *
 * ATURAN KERAS: ini satu-satunya sumber kredit, bukan LLM.
 */
export const LookupCreditResultSchema = z.discriminatedUnion('found', [
  z.object({
    found: z.literal(true),
    entryId: z.string(),
    credit: z.number(),
    ref: z.string(),
  }),
  z.object({
    found: z.literal(false),
    reason: z.string(),
  }),
]);
export type LookupCreditResult = z.infer<typeof LookupCreditResultSchema>;

/**
 * Hasil get_relevant_sections (fungsi murni).
 */
export const GuidelineSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  ref: z.string(),
  text: z.string(),
});
export type GuidelineSection = z.infer<typeof GuidelineSectionSchema>;

export const GetRelevantSectionsResultSchema = z.object({
  sections: z.array(GuidelineSectionSchema),
});
export type GetRelevantSectionsResult = z.infer<typeof GetRelevantSectionsResultSchema>;

/**
 * Hasil ask_student (templat kode, bukan LLM).
 */
export const AskStudentResultSchema = z.object({
  field: z.string(),
  question: z.string(),
  options: z.array(QuestionOptionSchema),
});
export type AskStudentResult = z.infer<typeof AskStudentResultSchema>;
