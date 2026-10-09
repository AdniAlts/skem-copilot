import type { SubmissionCard } from '@skem/shared';
import type { submissions } from '../db/schema.js';

export function toSubmissionCard(row: typeof submissions.$inferSelect, fileName: string): SubmissionCard {
  return {
    publicId: row.publicId,
    batchId: row.batchId ? String(row.batchId) : '',
    fileName,
    status: row.status,
    reviewStatus: row.reviewStatus,
    activityName: row.activityName,
    estimatedCredit: row.estimatedCredit === null ? null : Number(row.estimatedCredit),
    finalCredit: row.finalCredit === null ? null : Number(row.finalCredit),
    warnings: Array.isArray(row.warnings) ? row.warnings as { code: string; message: string }[] : [],
    openQuestionCount: 0,
    lastError: row.lastError,
    updatedAt: row.updatedAt.toISOString(),
  };
}
