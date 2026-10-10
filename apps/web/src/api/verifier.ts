import { apiClient } from './client';

import type { VerifierQueueResponse, ApproveResponse, RejectResponse } from '@skem/shared';

/*
 * Klien API Verifikator. Sengaja TANPA fallback: keputusan yang gagal (tanda tangan belum ada,
 * pengajuan kelas lain, koneksi putus) harus tampil sebagai error, tidak pernah pura-pura berhasil.
 */

/** Mengambil antrian verifikator kelas. */
export async function getVerifierQueue(params?: {
  aiStatus?: 'clean' | 'warning';
  sort?: 'oldest' | 'newest' | 'flags';
}): Promise<VerifierQueueResponse> {
  const query = new URLSearchParams();
  if (params?.aiStatus) query.set('aiStatus', params.aiStatus);
  if (params?.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiClient.get<VerifierQueueResponse>(`/api/verifier/queue${qs ? `?${qs}` : ''}`);
}

/** Menyetujui pengajuan (e-sign Verifikator). */
export async function approveSubmission(
  publicId: string,
  payload?: { note?: string },
): Promise<ApproveResponse> {
  return apiClient.post<ApproveResponse>(
    `/api/verifier/submissions/${encodeURIComponent(publicId)}/approve`,
    payload ?? {},
  );
}

/** Menolak pengajuan dengan alasan wajib. */
export async function rejectSubmission(publicId: string, note: string): Promise<RejectResponse> {
  return apiClient.post<RejectResponse>(
    `/api/verifier/submissions/${encodeURIComponent(publicId)}/reject`,
    { note },
  );
}
