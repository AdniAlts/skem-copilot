import type {
  ApproveResponse,
  RejectResponse,
  SignedUrlResponse,
  SubmissionDetail,
  VerifierQueueQuery,
  VerifierQueueResponse,
} from '@skem/shared';
import { apiClient } from './client';

/*
 * Klien API layar Verifikator. Sengaja TANPA fallback data contoh: pengajuan kelas lain
 * atau kegagalan server harus tampil sebagai error, bukan data palsu yang bisa diputuskan.
 */

export function getVerifierQueue(
  query: Partial<VerifierQueueQuery> = {},
): Promise<VerifierQueueResponse> {
  const params = new URLSearchParams();
  if (query.aiStatus) params.set('aiStatus', query.aiStatus);
  if (query.sort) params.set('sort', query.sort);
  const search = params.toString();
  return apiClient.get<VerifierQueueResponse>(`/api/verifier/queue${search ? `?${search}` : ''}`);
}

export function getVerifierSubmission(publicId: string): Promise<SubmissionDetail> {
  return apiClient.get<SubmissionDetail>(`/api/submissions/${encodeURIComponent(publicId)}`);
}

export function getVerifierCertificateUrl(publicId: string): Promise<SignedUrlResponse> {
  return apiClient.get<SignedUrlResponse>(
    `/api/submissions/${encodeURIComponent(publicId)}/certificate`,
  );
}

export function approveSubmission(publicId: string, note?: string): Promise<ApproveResponse> {
  const trimmed = note?.trim();
  return apiClient.post<ApproveResponse>(
    `/api/verifier/submissions/${encodeURIComponent(publicId)}/approve`,
    trimmed ? { note: trimmed } : {},
  );
}

export function rejectSubmission(publicId: string, note: string): Promise<RejectResponse> {
  return apiClient.post<RejectResponse>(
    `/api/verifier/submissions/${encodeURIComponent(publicId)}/reject`,
    { note: note.trim() },
  );
}
