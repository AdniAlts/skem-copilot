/**
 * Enum Postgres dan enum non-DB untuk SKEM AI Co-Pilot.
 *
 * Nilai enum persis seperti ARCHITECTURE §3.1.
 * Perubahan harus dilakukan bersamaan di shared, docs/API.md, dan ARCHITECTURE.
 */

// ── Enum Postgres (disimpan di database) ──────────────────────────────────

export const USER_ROLE = ['student', 'verifier', 'validator', 'unit'] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const REVIEW_STATUS = [
  'queued',
  'analyzing',
  'ready',
  'needs_fix',
  'problem',
  'error',
  'cancelled',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const SUBMISSION_STATUS = [
  'draft',
  'waiting_verifier',
  'waiting_validator',
  'approved',
  'rejected',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];

export const RUN_STATUS = ['running', 'done', 'failed'] as const;
export type RunStatus = (typeof RUN_STATUS)[number];

export const READER_STRATEGY = ['text', 'vision', 'ocr', 'cache'] as const;
export type ReaderStrategy = (typeof READER_STRATEGY)[number];

export const CHECK_TYPE = [
  'category',
  'level',
  'role',
  'activity_name',
  'name_match',
  'deadline',
  'completeness',
  'credit',
] as const;
export type CheckType = (typeof CHECK_TYPE)[number];

export const FINDING_RESULT = ['pass', 'warn', 'fail'] as const;
export type FindingResult = (typeof FINDING_RESULT)[number];

export const DOCUMENT_TYPE = ['certificate', 'supporting'] as const;
export type DocumentType = (typeof DOCUMENT_TYPE)[number];

export const REVIEW_STAGE = ['verifier', 'validator'] as const;
export type ReviewStage = (typeof REVIEW_STAGE)[number];

export const REVIEW_DECISION = ['approve', 'reject', 'adjust_credit'] as const;
export type ReviewDecision = (typeof REVIEW_DECISION)[number];

export const FINAL_FORM_STATUS = ['none', 'ready', 'failed'] as const;
export type FinalFormStatus = (typeof FINAL_FORM_STATUS)[number];

export const NOTIFICATION_CHANNEL = ['in_app', 'telegram'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const NOTIFICATION_STATUS = ['pending', 'sent', 'failed'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[number];

// ── Enum non-DB (hanya di shared) ─────────────────────────────────────────

/** Cakupan peserta — jawaban pertanyaan agent untuk field `level`. */
export const PARTICIPANT_SCOPE = [
  'campus',
  'regional',
  'national',
  'international',
] as const;
export type ParticipantScope = (typeof PARTICIPANT_SCOPE)[number];

/** Status resmi pengajuan (tampilan di UI mahasiswa). */
export const OFFICIAL_STATUS = ['dalam_proses', 'disetujui', 'ditolak'] as const;
export type OfficialStatus = (typeof OFFICIAL_STATUS)[number];

// ── Kode error API ────────────────────────────────────────────────────────

export const ERROR_CODES = {
  VALIDATION_ERROR: { http: 400, label: 'Validasi gagal' },
  TOO_MANY_FILES: { http: 400, label: 'Terlalu banyak file' },
  UNAUTHENTICATED: { http: 401, label: 'Belum masuk' },
  FORBIDDEN: { http: 403, label: 'Tidak memiliki akses' },
  NOT_FOUND: { http: 404, label: 'Tidak ditemukan' },
  CONFLICT: { http: 409, label: 'Konflik status' },
  INVALID_TRANSITION: { http: 409, label: 'Transisi tidak sah' },
  SIGNATURE_REQUIRED: { http: 409, label: 'Tanda tangan belum ada' },
  PAYLOAD_TOO_LARGE: { http: 413, label: 'File terlalu besar' },
  UNSUPPORTED_MEDIA_TYPE: { http: 415, label: 'Jenis file tidak didukung' },
  INTERNAL: { http: 500, label: 'Gangguan sistem' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ── Helper ────────────────────────────────────────────────────────────────

/** Semua nilai enum DB untuk keperluan validasi/tes. */
export const DB_ENUMS = {
  USER_ROLE,
  REVIEW_STATUS,
  SUBMISSION_STATUS,
  RUN_STATUS,
  READER_STRATEGY,
  CHECK_TYPE,
  FINDING_RESULT,
  DOCUMENT_TYPE,
  REVIEW_STAGE,
  REVIEW_DECISION,
  FINAL_FORM_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
} as const;
