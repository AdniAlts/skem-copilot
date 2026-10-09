/**
 * Schema keluaran DocumentReader (ekstraksi field dari sertifikat).
 *
 * ATURAN KERAS: schema ini TIDAK boleh mengandung field kredit.
 * Kredit hanya dihitung oleh lookup_credit_table (rules/credit.ts).
 *
 * Acuan: ARCHITECTURE §7 (ExtractedFields).
 */

import { z } from 'zod';

/** Field hasil ekstraksi dengan confidence. */
export const ExtractedFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

/** Jenis dokumen yang terdeteksi. */
export const DocumentKindSchema = z.enum(['certificate', 'decree', 'other']);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

/**
 * Hasil ekstraksi field dari dokumen.
 *
 * Semua field opsional (nullable) karena LLM mungkin tidak menemukan semua field.
 * Confidence menunjukkan keyakinan model (0–1).
 *
 * TIDAK ADA field kredit di sini.
 */
export const ExtractedFieldsSchema = z.object({
  document_kind: DocumentKindSchema,
  recipient_name: ExtractedFieldSchema,
  activity_name: ExtractedFieldSchema,
  activity_start_date: ExtractedFieldSchema,
  activity_end_date: ExtractedFieldSchema,
  organizer: ExtractedFieldSchema,
  location_platform: ExtractedFieldSchema,
  role_text: ExtractedFieldSchema,
  achievement_text: ExtractedFieldSchema,
  participant_scope_text: ExtractedFieldSchema,
});
export type ExtractedFields = z.infer<typeof ExtractedFieldsSchema>;
