/**
 * API functions untuk batch upload dan submission operations.
 */

import { apiClient } from './client';
import type {
  SubmissionCard,
  BatchProgress,
  CreateBatchResponse,
} from '@skem/shared';

/**
 * Upload batch PDF (1-10 file).
 */
export async function uploadBatch(files: File[]): Promise<CreateBatchResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  return apiClient.post<CreateBatchResponse>('/api/batches', formData);
}

/**
 * Ambil progres batch dan daftar submission.
 */
export async function getBatchProgress(publicId: string): Promise<BatchProgress> {
  return apiClient.get<BatchProgress>(`/api/batches/${publicId}`);
}

/**
 * Ambil daftar submission mahasiswa (dengan filter opsional).
 */
export async function getSubmissions(params?: {
  status?: string;
  reviewStatus?: string;
}): Promise<SubmissionCard[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.reviewStatus) searchParams.set('reviewStatus', params.reviewStatus);
  
  const query = searchParams.toString();
  return apiClient.get<SubmissionCard[]>(
    `/api/submissions${query ? `?${query}` : ''}`
  );
}

/**
 * Batalkan submission (hanya untuk status draft).
 */
export async function cancelSubmission(publicId: string): Promise<void> {
  return apiClient.post<void>(`/api/submissions/${publicId}/cancel`);
}

/**
 * Unggah ulang file untuk submission (hanya untuk status draft).
 */
export async function reuploadSubmission(
  publicId: string,
  file: File
): Promise<SubmissionCard> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<SubmissionCard>(
    `/api/submissions/${publicId}/reupload`,
    formData
  );
}

/**
 * Coba lagi analisis submission (hanya untuk status error).
 */
export async function retrySubmission(publicId: string): Promise<SubmissionCard> {
  return apiClient.post<SubmissionCard>(`/api/submissions/${publicId}/retry`);
}
