import type {
  CreditAdjustResponse,
  RegenerateFormResponse,
  ValidateResponse,
  ValidatorQueueResponse,
  ValidatorRejectResponse,
} from '@skem/shared';
import { apiClient } from './client';

/* Klien API layar Validator. Tanpa fallback: keputusan yang gagal harus tampil sebagai error. */

const decisionPath = (publicId: string, action: string) =>
  `/api/validator/submissions/${encodeURIComponent(publicId)}/${action}`;

export function getValidatorQueue(): Promise<ValidatorQueueResponse> {
  return apiClient.get<ValidatorQueueResponse>('/api/validator/queue');
}

export function adjustFinalCredit(
  publicId: string,
  finalCredit: number,
  reason: string,
): Promise<CreditAdjustResponse> {
  return apiClient.post<CreditAdjustResponse>(decisionPath(publicId, 'credit'), {
    finalCredit,
    reason: reason.trim(),
  });
}

export function validateSubmission(publicId: string): Promise<ValidateResponse> {
  return apiClient.post<ValidateResponse>(decisionPath(publicId, 'validate'), {});
}

export function rejectAsValidator(
  publicId: string,
  note: string,
): Promise<ValidatorRejectResponse> {
  return apiClient.post<ValidatorRejectResponse>(decisionPath(publicId, 'reject'), {
    note: note.trim(),
  });
}

export function regenerateFinalForm(publicId: string): Promise<RegenerateFormResponse> {
  return apiClient.post<RegenerateFormResponse>(decisionPath(publicId, 'regenerate-form'), {});
}
