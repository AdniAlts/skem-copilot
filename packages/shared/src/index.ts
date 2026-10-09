/**
 * @skem/shared — enum, zod schema, dan tipe bersama untuk SKEM AI Co-Pilot.
 *
 * Sumber kebenaran kontrak API, LLM, dan data.
 * Perubahan harus dilakukan bersamaan di shared, docs/API.md, dan ARCHITECTURE.
 */

// ── Konstanta ─────────────────────────────────────────────────────────────
export { API_PREFIX } from './constants.js';

// ── Enum ──────────────────────────────────────────────────────────────────
export {
  // Enum Postgres
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
  // Enum non-DB
  PARTICIPANT_SCOPE,
  OFFICIAL_STATUS,
  // Error codes
  ERROR_CODES,
  // Helper
  DB_ENUMS,
} from './enums.js';

export type {
  UserRole,
  ReviewStatus,
  SubmissionStatus,
  RunStatus,
  ReaderStrategy,
  CheckType,
  FindingResult,
  DocumentType,
  ReviewStage,
  ReviewDecision,
  FinalFormStatus,
  NotificationChannel,
  NotificationStatus,
  ParticipantScope,
  OfficialStatus,
  ErrorCode,
} from './enums.js';

// ── Labels ────────────────────────────────────────────────────────────────
export {
  REVIEW_STATUS_LABELS,
  SUBMISSION_STATUS_LABELS,
  OFFICIAL_STATUS_LABELS,
  FINAL_FORM_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  SUBMISSION_STATUS_COLORS,
  OFFICIAL_STATUS_COLORS,
} from './labels.js';

// ── Helper ────────────────────────────────────────────────────────────────
export { toOfficialStatus } from './to-official-status.js';

// ── Schema: Extraction (LLM output, tanpa kredit) ────────────────────────
export {
  ExtractedFieldSchema,
  DocumentKindSchema,
  ExtractedFieldsSchema,
} from './schemas/extraction.js';
export type { ExtractedField, DocumentKind, ExtractedFields } from './schemas/extraction.js';

// ── Schema: Precheck (klasifikasi, temuan, pertanyaan) ────────────────────
export {
  CandidateSchema,
  ClassificationResultSchema,
  GuidelineRefSchema,
  FindingSchema,
  QuestionOptionSchema,
  AgentQuestionSchema,
  MatchNameResultSchema,
  CheckDeadlineResultSchema,
  LookupCreditResultSchema,
  GuidelineSectionSchema,
  GetRelevantSectionsResultSchema,
  AskStudentResultSchema,
} from './schemas/precheck.js';
export type {
  Candidate,
  ClassificationResult,
  GuidelineRef,
  Finding,
  QuestionOption,
  AgentQuestion,
  MatchNameResult,
  CheckDeadlineResult,
  LookupCreditResult,
  GuidelineSection,
  GetRelevantSectionsResult,
  AskStudentResult,
} from './schemas/precheck.js';

// ── Schema: API (request/response) ────────────────────────────────────────
export {
  ApiErrorSchema,
  MeSchema,
  SubmissionCardSchema,
  SubmissionDetailSchema,
  BatchProgressSchema,
  ProgressSchema,
  PatchSubmissionBodySchema,
  AnswerBodySchema,
  SubmitBodySchema,
  ApproveBodySchema,
  RejectBodySchema,
  CreditAdjustBodySchema,
  ValidatorRejectBodySchema,
  MockLoginBodySchema,
  SignatureBodySchema,
  CreateBatchResponseSchema,
  SubmitResponseSchema,
  ApproveResponseSchema,
  RejectResponseSchema,
  CreditAdjustResponseSchema,
  ValidateResponseSchema,
  ValidatorRejectResponseSchema,
  MockUserSchema,
  NotificationSchema,
  SignatureResponseSchema,
  SignedUrlResponseSchema,
  TelegramLinkResponseSchema,
  UnitSummarySchema,
  TokenStatsSchema,
  HealthResponseSchema,
} from './schemas/api.js';
export type {
  ApiError,
  Me,
  SubmissionCard,
  SubmissionDetail,
  BatchProgress,
  Progress,
  PatchSubmissionBody,
  AnswerBody,
  SubmitBody,
  ApproveBody,
  RejectBody,
  CreditAdjustBody,
  ValidatorRejectBody,
  MockLoginBody,
  SignatureBody,
  CreateBatchResponse,
  SubmitResponse,
  ApproveResponse,
  RejectResponse,
  CreditAdjustResponse,
  ValidateResponse,
  ValidatorRejectResponse,
  MockUser,
  Notification,
  SignatureResponse,
  SignedUrlResponse,
  TelegramLinkResponse,
  UnitSummary,
  TokenStats,
  HealthResponse,
} from './schemas/api.js';

// ── Schema: Data files ────────────────────────────────────────────────────
export {
  CREDIT_TABLE_BIDANG,
  CreditTableEntrySchema,
  CreditTableSchema,
  GuidelineSectionEntrySchema,
  GuidelineSectionsSchema,
  RulesSchema,
  TestCaseSchema,
  AnswerKeySchema,
  SeedClassSchema,
  SeedUserSchema,
  SeedDataSchema,
} from './schemas/data.js';
export type {
  CreditTableEntry,
  CreditTable,
  GuidelineSectionEntry,
  GuidelineSections,
  Rules,
  TestCase,
  AnswerKey,
  SeedClass,
  SeedUser,
  SeedData,
} from './schemas/data.js';
