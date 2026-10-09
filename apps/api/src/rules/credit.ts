import type { CreditTable, LookupCreditResult } from '@skem/shared';

export type CreditLookupInput = {
  komponen: number;
  categoryCode: string;
  /** null = kolom tingkat kosong di Lampiran (mis. Komponen 1–2, bidang D). */
  level: string | null;
  /** null = kolom jabatan/prestasi kosong di Lampiran. */
  role: string | null;
};

/**
 * Tool `lookup_credit_table`: satu-satunya sumber angka kredit (LLM tidak pernah menebak).
 * Cocok persis pada komponen, kategori, tingkat, dan peran; `null` bukan wildcard.
 */
export function lookupCreditTable(
  table: CreditTable,
  input: CreditLookupInput,
): LookupCreditResult {
  const entry = table.entries.find(
    (e) =>
      e.komponen === input.komponen &&
      e.categoryCode === input.categoryCode &&
      e.level === input.level &&
      e.role === input.role,
  );
  if (!entry) {
    return { found: false, reason: 'COMBINATION_NOT_FOUND' };
  }
  return { found: true, entryId: entry.id, credit: entry.credit, ref: entry.ref };
}
