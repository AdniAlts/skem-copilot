import creditTableData from '../../../../data/credit_table.json';
import type { CreditTable } from '@skem/shared';

export const creditTable = creditTableData as CreditTable;

export interface CreditCalcParams {
  komponen: number;
  categoryCode: string | null;
  level: string | null;
  role: string | null;
}

export interface CreditCalcResult {
  found: boolean;
  credit: number | null;
  entryId: string | null;
  ref?: string;
  reason?: string;
}

export function calculateEstimatedCredit(params: CreditCalcParams): CreditCalcResult {
  if (!params.categoryCode) {
    return { found: false, credit: null, entryId: null, reason: 'Pilih kategori kegiatan terlebih dahulu.' };
  }

  // Level & role normalization: empty string treated as null
  const targetLevel = params.level && params.level.trim() !== '' ? params.level.trim() : null;
  const targetRole = params.role && params.role.trim() !== '' ? params.role.trim() : null;

  const entry = creditTable.entries.find((e) => {
    if (e.komponen !== params.komponen) return false;
    if (e.categoryCode !== params.categoryCode) return false;

    // Matching level: case-insensitive match or exact null
    const entryLevel = e.level ? e.level.toLowerCase().trim() : null;
    const queryLevel = targetLevel ? targetLevel.toLowerCase().trim() : null;
    if (entryLevel !== queryLevel) return false;

    // Matching role: case-insensitive match or exact null
    const entryRole = e.role ? e.role.toLowerCase().trim() : null;
    const queryRole = targetRole ? targetRole.toLowerCase().trim() : null;
    if (entryRole !== queryRole) return false;

    return true;
  });

  if (!entry) {
    return {
      found: false,
      credit: null,
      entryId: null,
      reason: 'Kombinasi kategori, tingkat, dan peran ini tidak ditemukan pada tabel bobot SKEM. Pengajuan ini akan diarahkan ke Unit Kemahasiswaan.',
    };
  }

  return {
    found: true,
    credit: entry.credit,
    entryId: entry.id,
    ref: entry.ref,
  };
}
