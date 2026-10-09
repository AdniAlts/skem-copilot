/**
 * Dipanggil setelah transaksi persetujuan Verifikator di-commit.
 * BE-08 mengisi pembuatan PDF final, BE-09 mengisi notifikasi Telegram.
 * Kegagalan hook tidak membatalkan persetujuan.
 */
export async function onVerifierApproved(submissionId: number): Promise<void> {
  void submissionId;
}
