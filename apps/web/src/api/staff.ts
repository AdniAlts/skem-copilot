import type { SignedUrlResponse, SubmissionDetail } from '@skem/shared';
import { apiClient } from './client';

/*
 * Data pengajuan untuk layar staf. Sengaja TANPA fallback data contoh: pengajuan yang tidak
 * boleh diakses atau kegagalan server harus tampil sebagai error, bukan data palsu yang bisa
 * diputuskan.
 */

const submissionPath = (publicId: string) => `/api/submissions/${encodeURIComponent(publicId)}`;

export function getStaffSubmission(publicId: string): Promise<SubmissionDetail> {
  return apiClient.get<SubmissionDetail>(submissionPath(publicId));
}

export function getStaffCertificateUrl(publicId: string): Promise<SignedUrlResponse> {
  return apiClient.get<SignedUrlResponse>(`${submissionPath(publicId)}/certificate`);
}

export function getStaffFinalFormUrl(publicId: string): Promise<SignedUrlResponse> {
  return apiClient.get<SignedUrlResponse>(`${submissionPath(publicId)}/final-form`);
}
