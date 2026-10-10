import { CreditAdjustBodySchema, type ValidatorQueueResponse } from '@skem/shared';

/** "0,5" atau "0.5" → 0.5; teks kosong/tidak valid → null. */
export function parseCreditInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/**
 * Validasi form "Ubah kredit final" dengan aturan yang sama seperti API
 * (0–3, maks. dua desimal, alasan wajib) ditambah: nilai harus berbeda dari kredit saat ini.
 */
export function validateCreditAdjust(
  creditText: string,
  reason: string,
  currentCredit: number | null,
): { error: string | null; value: number | null } {
  const value = parseCreditInput(creditText);
  if (value === null) return { error: 'Isi kredit final berupa angka, mis. 0,5.', value: null };
  const parsed = CreditAdjustBodySchema.safeParse({ finalCredit: value, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.', value: null };
  }
  if (currentCredit !== null && parsed.data.finalCredit === currentCredit) {
    return { error: 'Kredit final sama dengan nilai saat ini.', value: null };
  }
  return { error: null, value: parsed.data.finalCredit };
}

type QueueItem = ValidatorQueueResponse['items'][number];

/** Kredit yang akan ditetapkan saat Validasi: hasil ubah Validator jika ada, selain itu estimasi. */
export function effectiveCredit(
  item: Pick<QueueItem, 'estimatedCredit' | 'finalCredit'>,
): number | null {
  return item.finalCredit ?? item.estimatedCredit;
}

/** Daftar nama kelas unik di antrian (untuk filter kelas di sisi klien). */
export function queueClassNames(items: QueueItem[]): string[] {
  return [
    ...new Set(items.map((item) => item.className).filter((name): name is string => !!name)),
  ].sort((a, b) => a.localeCompare(b, 'id'));
}
