/**
 * Label UI Bahasa Indonesia untuk setiap status.
 *
 * Status selalu ditampilkan sebagai ikon + teks (tidak hanya warna).
 * Acuan: docs/ui-spec.md §3.
 */

import type {
  ReviewStatus,
  SubmissionStatus,
  OfficialStatus,
  FinalFormStatus,
} from './enums.js';

// ── review_status (kartu analisis) ────────────────────────────────────────

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  queued: 'Menunggu antrean',
  analyzing: 'Sedang dianalisis',
  ready: 'Ready',
  needs_fix: 'Perlu perbaikan',
  problem: 'Bermasalah',
  error: 'Gagal dianalisis',
  cancelled: 'Dibatalkan',
};

// ── submission_status (siklus pengajuan) ──────────────────────────────────

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draf',
  waiting_verifier: 'Menunggu Verifikator',
  waiting_validator: 'Menunggu Validator',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

// ── official_status (status resmi di UI mahasiswa) ────────────────────────

export const OFFICIAL_STATUS_LABELS: Record<OfficialStatus, string> = {
  dalam_proses: 'Dalam proses',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

// ── final_form_status ─────────────────────────────────────────────────────

export const FINAL_FORM_STATUS_LABELS: Record<FinalFormStatus, string> = {
  none: 'Belum tersedia',
  ready: 'Tersedia',
  failed: 'Pembuatan gagal',
};

// ── Warna status (untuk styling) ──────────────────────────────────────────

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  queued: 'gray',
  analyzing: 'teal',
  ready: 'green',
  needs_fix: 'amber',
  problem: 'red',
  error: 'gray',
  cancelled: 'gray',
};

export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: 'gray',
  waiting_verifier: 'blue',
  waiting_validator: 'blue',
  approved: 'green',
  rejected: 'red',
};

export const OFFICIAL_STATUS_COLORS: Record<OfficialStatus, string> = {
  dalam_proses: 'blue',
  disetujui: 'green',
  ditolak: 'red',
};
