import { generateFinalForm } from './final-form.js';

/**
 * Dipanggil setelah transaksi persetujuan Verifikator di-commit.
 * Checkpoint B: membuat PDF final (`final_form_status` ready/failed).
 * BE-09 menambahkan notifikasi Telegram di sini.
 * Kegagalan hook tidak membatalkan persetujuan.
 */
export async function onVerifierApproved(submissionId: number): Promise<void> {
  await generateFinalForm(submissionId);
}
