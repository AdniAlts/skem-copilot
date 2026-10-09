/** Pure mapping from deterministic findings and unresolved questions to review_status. */

import type { DocumentKind, Finding, ReviewStatus } from '@skem/shared';

export type StatusMapperInput = {
  documentKind: DocumentKind;
  findings: Finding[];
  missingFields: string[];
  openQuestions: string[];
  confidenceThreshold: number;
};

export type StatusMapperResult = {
  reviewStatus: Extract<ReviewStatus, 'ready' | 'needs_fix' | 'problem'>;
  warnings: Finding[];
};

export function mapReviewStatus(input: StatusMapperInput): StatusMapperResult {
  const warnings = input.findings.filter((finding) => finding.result === 'warn');
  const problem = input.documentKind === 'other' || input.findings.some((finding) =>
    finding.result === 'fail' && (finding.checkType === 'name_match' || finding.checkType === 'deadline' || finding.checkType === 'completeness'),
  );
  if (problem) return { reviewStatus: 'problem', warnings };

  const needsFix = input.openQuestions.length > 0 || input.missingFields.length > 0 || input.findings.some((finding) =>
    (finding.checkType === 'credit' && finding.result === 'fail') ||
    (finding.confidence !== undefined && finding.confidence < input.confidenceThreshold),
  );
  return { reviewStatus: needsFix ? 'needs_fix' : 'ready', warnings };
}
