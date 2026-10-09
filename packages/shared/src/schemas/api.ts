/**
 * Schema request/response API.
 *
 * Acuan: docs/API.md dan ARCHITECTURE §9.
 * Semua tipe di-infer dari zod schema (jangan menulis interface manual).
 */

import { z } from 'zod';
import {
  USER_ROLE,
  REVIEW_STATUS,
  SUBMISSION_STATUS,
  FINAL_FORM_STATUS,
  FINDING_RESULT,
  NOTIFICATION_CHANNEL,
} from '../enums.js';
import { FindingSchema, AgentQuestionSchema } from './precheck.js';

// ── Error API ─────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ── Objek bersama ─────────────────────────────────────────────────────────

/** Profil pengguna yang sedang login. */
export const MeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  nrp: z.string().nullable(),
  role: z.enum(USER_ROLE),
  angkatan: z.number().int().nullable(),
  programStudi: z.string().nullable(),
  departemen: z.string().nullable(),
  className: z.string().nullable(),
  verifierName: z.string().nullable(),
  jabatan: z.string().nullable(),
  hasSignature: z.boolean(),
  telegramLinked: z.boolean(),
});
export type Me = z.infer<typeof MeSchema>;

/** Kartu pengajuan (daftar/list). */
export const SubmissionCardSchema = z.object({
  publicId: z.string().regex(/^SKM-[A-Z0-9]{8}$/),
  batchId: z.string(),
  fileName: z.string(),
  status: z.enum(SUBMISSION_STATUS),
  reviewStatus: z.enum(REVIEW_STATUS),
  activityName: z.string().nullable(),
  estimatedCredit: z.number().nullable(),
  finalCredit: z.number().nullable(),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    })
  ),
  openQuestionCount: z.number().int().min(0),
  lastError: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type SubmissionCard = z.infer<typeof SubmissionCardSchema>;

/** Detail pengajuan (lengkap). */
export const SubmissionDetailSchema = z.object({
  publicId: z.string().regex(/^SKM-[A-Z0-9]{8}$/),
  status: z.enum(SUBMISSION_STATUS),
  reviewStatus: z.enum(REVIEW_STATUS),
  officialStatus: z.enum(['dalam_proses', 'disetujui', 'ditolak']).nullable(),
  student: z.object({
    name: z.string(),
    nrp: z.string(),
    programStudi: z.string(),
    departemen: z.string(),
    angkatan: z.number().int(),
    className: z.string(),
  }),
  verifier: z
    .object({
      name: z.string(),
      jabatan: z.string(),
    })
    .nullable(),
  activity: z.object({
    activityName: z.string(),
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    locationPlatform: z.string(),
    organizer: z.string(),
    attachmentType: z.string(),
  }),
  skem: z.object({
    komponen: z.number().int().min(1).max(3),
    categoryCode: z.string().nullable(),
    level: z.string().nullable(),
    roleInActivity: z.string().nullable(),
    achievement: z.string().nullable(),
    creditEntryId: z.string().nullable(),
    estimatedCredit: z.number().nullable(),
    finalCredit: z.number().nullable(),
    candidates: z
      .object({
        category: z.array(
          z.object({
            code: z.string(),
            label: z.string(),
            confidence: z.number(),
          })
        ),
      })
      .optional(),
  }),
  deadline: z
    .object({
      result: z.enum(FINDING_RESULT),
      validFrom: z.string().nullable(),
      validTo: z.string().nullable(),
      message: z.string(),
    })
    .nullable(),
  findings: z.array(FindingSchema),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    })
  ),
  questions: z.array(AgentQuestionSchema),
  finalForm: z.object({
    status: z.enum(FINAL_FORM_STATUS),
  }),
  reviews: z.array(
    z.object({
      id: z.number().int().positive(),
      stage: z.enum(['verifier', 'validator']),
      decision: z.enum(['approve', 'reject', 'adjust_credit']),
      note: z.string().nullable(),
      reviewerName: z.string(),
      createdAt: z.string().datetime(),
    })
  ),
  timeline: z.array(
    z.object({
      field: z.enum(['status', 'review_status']),
      from: z.string().nullable(),
      to: z.string(),
      at: z.string().datetime(),
      by: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
  tokenUsage: z
    .object({
      calls: z.number().int().min(0),
      promptTokens: z.number().int().min(0),
      completionTokens: z.number().int().min(0),
      cacheHits: z.number().int().min(0),
    })
    .optional(),
});
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

/** Progres batch. */
export const BatchProgressSchema = z.object({
  batch: z.object({
    publicId: z.string(),
    fileCount: z.number().int().min(1).max(10),
  }),
  progress: z.object({
    total: z.number().int().min(0),
    done: z.number().int().min(0),
    counts: z.record(z.enum(REVIEW_STATUS), z.number().int().min(0)),
  }),
  submissions: z.array(SubmissionCardSchema),
});
export type BatchProgress = z.infer<typeof BatchProgressSchema>;

/** Progres kredit mahasiswa. */
export const ProgressSchema = z.object({
  komponen: z.array(
    z.object({
      komponen: z.number().int().min(1).max(3),
      target: z.number(),
      earned: z.number(),
    })
  ),
  total: z.number(),
  target: z.number(),
  fulfilled: z.boolean(),
});
export type Progress = z.infer<typeof ProgressSchema>;

// ── Request body ──────────────────────────────────────────────────────────

/** Body untuk PATCH /submissions/:publicId (edit metadata). */
export const PatchSubmissionBodySchema = z.object({
  activity: z
    .object({
      activityName: z.string().optional(),
      activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      locationPlatform: z.string().optional(),
      organizer: z.string().optional(),
      attachmentType: z.string().optional(),
    })
    .optional(),
  skem: z
    .object({
      categoryCode: z.string().optional(),
      level: z.string().optional(),
      roleInActivity: z.string().optional(),
      achievement: z.string().optional(),
    })
    .optional(),
});
export type PatchSubmissionBody = z.infer<typeof PatchSubmissionBodySchema>;

/** Body untuk POST /submissions/:publicId/answers. */
export const AnswerBodySchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().trim().min(1, 'Jawaban wajib diisi.'),
});
export type AnswerBody = z.infer<typeof AnswerBodySchema>;

/** Body untuk POST /submissions/submit. */
export const SubmitBodySchema = z.object({
  publicIds: z
    .array(z.string().regex(/^SKM-[A-Z0-9]{8}$/))
    .min(1, 'Minimal 1 pengajuan.')
    .max(10, 'Maksimal 10 pengajuan.'),
});
export type SubmitBody = z.infer<typeof SubmitBodySchema>;

/** Body untuk POST /verifier/submissions/:publicId/approve. */
export const ApproveBodySchema = z.object({
  note: z.string().optional(),
});
export type ApproveBody = z.infer<typeof ApproveBodySchema>;

/** Body untuk POST /verifier/submissions/:publicId/reject. */
export const RejectBodySchema = z.object({
  note: z.string().trim().min(1, 'Alasan penolakan wajib diisi.'),
});
export type RejectBody = z.infer<typeof RejectBodySchema>;

/** Body untuk POST /validator/submissions/:publicId/credit. */
export const CreditAdjustBodySchema = z.object({
  finalCredit: z.number().min(0),
  reason: z.string().trim().min(1, 'Alasan perubahan kredit wajib diisi.'),
});
export type CreditAdjustBody = z.infer<typeof CreditAdjustBodySchema>;

/** Body untuk POST /validator/submissions/:publicId/reject. */
export const ValidatorRejectBodySchema = z.object({
  note: z.string().trim().min(1, 'Alasan penolakan wajib diisi.'),
});
export type ValidatorRejectBody = z.infer<typeof ValidatorRejectBodySchema>;

/** Body untuk POST /auth/mock-login. */
export const MockLoginBodySchema = z.object({
  userId: z.number().int().positive(),
});
export type MockLoginBody = z.infer<typeof MockLoginBodySchema>;

/** Body untuk PUT /me/signature (JSON). */
export const SignatureBodySchema = z.object({
  dataUrl: z.string().startsWith('data:image/png;base64,'),
});
export type SignatureBody = z.infer<typeof SignatureBodySchema>;

// ── Response ──────────────────────────────────────────────────────────────

/** Response untuk POST /batches. */
export const CreateBatchResponseSchema = z.object({
  batch: z.object({
    publicId: z.string(),
    fileCount: z.number().int().min(1).max(10),
  }),
  submissions: z.array(SubmissionCardSchema),
});
export type CreateBatchResponse = z.infer<typeof CreateBatchResponseSchema>;

/** Response untuk POST /submissions/submit. */
export const SubmitResponseSchema = z.object({
  submitted: z.array(z.string()),
  skipped: z.array(
    z.object({
      publicId: z.string(),
      reason: z.string(),
    })
  ),
});
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;

/** Response untuk POST /verifier/submissions/:publicId/approve. */
export const ApproveResponseSchema = z.object({
  status: z.literal('waiting_validator'),
  finalForm: z.object({
    status: z.enum(FINAL_FORM_STATUS),
  }),
});
export type ApproveResponse = z.infer<typeof ApproveResponseSchema>;

/** Response untuk POST /verifier/submissions/:publicId/reject. */
export const RejectResponseSchema = z.object({
  status: z.literal('rejected'),
});
export type RejectResponse = z.infer<typeof RejectResponseSchema>;

/** Response untuk POST /validator/submissions/:publicId/credit. */
export const CreditAdjustResponseSchema = z.object({
  previousCredit: z.number(),
  finalCredit: z.number(),
  review: z.object({
    id: z.number().int().positive(),
    stage: z.literal('validator'),
    decision: z.literal('adjust_credit'),
    note: z.string().nullable(),
    reviewerName: z.string(),
    createdAt: z.string().datetime(),
  }),
});
export type CreditAdjustResponse = z.infer<typeof CreditAdjustResponseSchema>;

/** Response untuk POST /validator/submissions/:publicId/validate. */
export const ValidateResponseSchema = z.object({
  status: z.literal('approved'),
  finalCredit: z.number(),
});
export type ValidateResponse = z.infer<typeof ValidateResponseSchema>;

/** Response untuk POST /validator/submissions/:publicId/reject. */
export const ValidatorRejectResponseSchema = z.object({
  status: z.literal('rejected'),
});
export type ValidatorRejectResponse = z.infer<typeof ValidatorRejectResponseSchema>;

/** Response untuk GET /auth/mock-users. */
export const MockUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  role: z.enum(USER_ROLE),
  className: z.string().nullable(),
});
export type MockUser = z.infer<typeof MockUserSchema>;

/** Response untuk GET /notifications. */
export const NotificationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  submissionPublicId: z.string().nullable(),
  channel: z.enum(NOTIFICATION_CHANNEL),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

/** Response untuk GET /me/signature. */
export const SignatureResponseSchema = z.object({
  hasSignature: z.boolean(),
});
export type SignatureResponse = z.infer<typeof SignatureResponseSchema>;

/** Response untuk GET /submissions/:publicId/certificate dan /final-form. */
export const SignedUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresIn: z.number().int().positive(),
});
export type SignedUrlResponse = z.infer<typeof SignedUrlResponseSchema>;

/** Response untuk POST /me/telegram/link. */
export const TelegramLinkResponseSchema = z.object({
  deepLink: z.string().url(),
});
export type TelegramLinkResponse = z.infer<typeof TelegramLinkResponseSchema>;

/** Response untuk GET /unit/summary. */
export const UnitSummarySchema = z.object({
  byStatus: z.record(z.string(), z.number().int().min(0)),
  byClass: z.record(z.string(), z.number().int().min(0)),
  byFindingType: z.record(z.string(), z.number().int().min(0)),
});
export type UnitSummary = z.infer<typeof UnitSummarySchema>;

/** Response untuk GET /stats/tokens. */
export const TokenStatsSchema = z.object({
  totalCalls: z.number().int().min(0),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  perSubmissionAvg: z.number(),
  byPurpose: z.record(z.string(), z.number().int().min(0)),
});
export type TokenStats = z.infer<typeof TokenStatsSchema>;

/** Response untuk GET /health. */
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.enum(['ok', 'error']),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
