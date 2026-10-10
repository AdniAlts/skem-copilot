import { apiClient } from './client';
import type { VerifierQueueResponse, ApproveResponse, RejectResponse } from '@skem/shared';

/** Demo fallback untuk antrian verifikator. */
function demoQueue(): VerifierQueueResponse {
  return {
    className: '2 D3 IT B',
    summary: { waiting: 2, withWarnings: 1 },
    items: [
      {
        publicId: 'SKM-7Q2K9D1A',
        studentName: 'Budi Santoso',
        activityName: 'Lomba Desain Poster Nasional 2026',
        categoryLabel: 'K3-B01 - Prestasi Lomba Karya Ilmiah / Penalaran / Inovasi',
        level: 'Nasional',
        estimatedCredit: 1.1,
        aiStatus: 'clean',
        flagCount: 0,
        submittedAt: '2026-10-09T08:00:00.000Z',
      },
      {
        publicId: 'SKM-8P3L0E2B',
        studentName: 'Nisa Rahma',
        activityName: 'Pelatihan Kepemimpinan Mahasiswa',
        categoryLabel: 'K2-C01 - Panitia Kegiatan Resmi PENS',
        level: 'Kampus',
        estimatedCredit: 0.25,
        aiStatus: 'warning',
        flagCount: 2,
        submittedAt: '2026-10-09T09:30:00.000Z',
      },
    ],
  };
}

/** Mengambil antrian verifikator kelas. */
export async function getVerifierQueue(params?: {
  aiStatus?: 'clean' | 'warning';
  sort?: 'oldest' | 'newest' | 'flags';
}): Promise<VerifierQueueResponse> {
  const query = new URLSearchParams();
  if (params?.aiStatus) query.set('aiStatus', params.aiStatus);
  if (params?.sort) query.set('sort', params.sort);
  const qs = query.toString();
  try {
    return await apiClient.get<VerifierQueueResponse>(`/api/verifier/queue${qs ? `?${qs}` : ''}`);
  } catch {
    return demoQueue();
  }
}

/** Menyetujui pengajuan (e-sign Verifikator). */
export async function approveSubmission(
  publicId: string,
  payload?: { note?: string },
): Promise<ApproveResponse> {
  try {
    return await apiClient.post<ApproveResponse>(
      `/api/verifier/submissions/${publicId}/approve`,
      payload ?? {},
    );
  } catch {
    // Demo fallback
    return { status: 'waiting_validator', finalForm: { status: 'none' } };
  }
}

/** Menolak pengajuan dengan alasan wajib. */
export async function rejectSubmission(
  publicId: string,
  note: string,
): Promise<RejectResponse> {
  try {
    return await apiClient.post<RejectResponse>(
      `/api/verifier/submissions/${publicId}/reject`,
      { note },
    );
  } catch {
    return { status: 'rejected' };
  }
}
