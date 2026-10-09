/**
 * Pemetaan submission_status → official_status.
 *
 * Acuan: ARCHITECTURE §4.2
 * - draft → (belum ada status resmi, null)
 * - waiting_verifier, waiting_validator → dalam_proses
 * - approved → disetujui
 * - rejected → ditolak
 */

import type { SubmissionStatus, OfficialStatus } from './enums.js';

/**
 * Mengembalikan official_status dari submission_status.
 * `draft` mengembalikan `null` karena pengajuan belum diajukan.
 */
export function toOfficialStatus(
  status: SubmissionStatus
): OfficialStatus | null {
  switch (status) {
    case 'draft':
      return null;
    case 'waiting_verifier':
    case 'waiting_validator':
      return 'dalam_proses';
    case 'approved':
      return 'disetujui';
    case 'rejected':
      return 'ditolak';
  }
}
