/** Fixed pre-check orchestration: reader → deterministic rules → classify → credit lookup. */

import type {
  ClassificationResult,
  CreditTable,
  ExtractedFields,
  Finding,
  GuidelineSections,
  Rules,
} from '@skem/shared';
import { buildCandidates, NO_LEVEL_CODE, NO_ROLE_CODE, type CandidateGroups } from './candidates.js';
import { classifyActivity, type ClassificationCaller } from './classify.js';
import { buildQuestions, type TemplateQuestion } from './questions.js';
import type { DocumentReader, ReaderStrategy } from '../reader/index.js';
import { getRelevantSections } from '../rules/guideline.js';
import { recheck } from '../rules/recheck.js';

export type PrecheckInput = {
  submissionId: number;
  runId: number;
  pdf: Buffer;
  sha256: string;
  student: { name: string; angkatan: number };
  today: string;
  answers: Record<string, string>;
  extractedFields?: ExtractedFields;
  classification?: ClassificationResult;
};

export type PrecheckResult = {
  reviewStatus: 'ready' | 'needs_fix' | 'problem';
  findings: Finding[];
  warnings: Finding[];
  questions: TemplateQuestion[];
  extractedFields: ExtractedFields;
  classification: ClassificationResult | null;
  readerStrategy: ReaderStrategy;
  activityName: string | null;
  activityDate: string | null;
  locationPlatform: string | null;
  organizer: string | null;
  attachmentType: string;
  komponen: number | null;
  categoryCode: string | null;
  level: string | null;
  role: string | null;
  achievement: string | null;
  estimatedCredit: number | null;
  creditEntryId: string | null;
};

export type PrecheckDependencies = {
  reader: Pick<DocumentReader, 'read'>;
  classify?: ClassificationCaller;
  rules: Rules;
  creditTable: CreditTable;
  guidelineSections: GuidelineSections;
};

const SCOPE_LEVELS = new Set(['Kampus', 'Regional', 'Nasional', 'Internasional']);

function confidenceMissing(classification: ClassificationResult, threshold: number): string[] {
  const missing = new Set(classification.missing);
  for (const field of ['category', 'level', 'role', 'achievement'] as const) {
    const top = classification[field][0];
    if (!top || top.confidence < threshold) missing.add(field);
  }
  return [...missing];
}

function hasScopeLevels(categories: CandidateGroups['category'], table: CreditTable): boolean {
  const codes = new Set(categories.map((candidate) => candidate.code));
  return table.entries.some((entry) => codes.has(entry.categoryCode) && entry.level !== null && SCOPE_LEVELS.has(entry.level));
}

function toQuestions(missing: string[], candidates: CandidateGroups, scopeLevels: boolean, answers: Record<string, string>): TemplateQuestion[] {
  const normalized = missing
    .map((field) => field === 'level' && scopeLevels ? 'participant_scope' : field)
    .filter((field) => !answers[field] && !(field === 'level' && answers.participant_scope));
  return buildQuestions(normalized, candidates);
}

function refForFinding(sections: GuidelineSections, checkType: Finding['checkType'], categoryCode: string | null) {
  const section = sections.sections.find((item) =>
    item.tags.includes(`check:${checkType}`) && (!categoryCode || !item.categoryCodes || item.categoryCodes.includes(categoryCode)),
  ) ?? sections.sections.find((item) => item.tags.includes(`check:${checkType}`)) ?? sections.sections[0];
  return section ? { id: section.id, title: section.title, ref: section.ref } : null;
}

export async function runPrecheck(input: PrecheckInput, dependencies: PrecheckDependencies): Promise<PrecheckResult> {
  const readerResult = input.extractedFields
    ? { strategy: 'cache' as const, fields: input.extractedFields, llmCalls: 0 }
    : await dependencies.reader.read({ sha256: input.sha256, pdf: input.pdf }, { submissionId: input.submissionId, runId: input.runId });
  const fields = readerResult.fields;
  const candidates = buildCandidates(dependencies.creditTable, {
    activityName: fields.activity_name.value ?? '',
    roleText: fields.role_text.value ?? '',
    achievementText: fields.achievement_text.value ?? '',
    participantScopeText: fields.participant_scope_text.value ?? '',
  });
  const sections = getRelevantSections(dependencies.guidelineSections, {
    tags: ['check:category', 'check:level', 'check:role', 'check:activity_name', 'check:completeness', 'check:credit'],
    ...(candidates.category[0] ? { categoryCode: candidates.category[0].code } : {}),
  }).sections;
  const classification = input.classification ?? (readerResult.llmCalls >= 2
    ? null
    : await classifyActivity(
      fields,
      candidates,
      sections,
      { submissionId: input.submissionId, runId: input.runId },
      dependencies.classify,
    ));
  const missingSet = new Set(classification
    ? confidenceMissing(classification, dependencies.rules.confidenceThreshold)
    : ['category', 'level', 'role', 'achievement']);
  if (!fields.recipient_name.value || fields.recipient_name.confidence < dependencies.rules.confidenceThreshold) missingSet.add('recipient_name');
  if (!fields.activity_end_date.value || fields.activity_end_date.confidence < dependencies.rules.confidenceThreshold) missingSet.add('activity_end_date');
  if (!fields.activity_name.value || fields.activity_name.confidence < dependencies.rules.confidenceThreshold) missingSet.add('activity_name');
  const category = classification?.category[0];
  const selectedCategoryRows = dependencies.creditTable.entries.filter((entry) => entry.categoryCode === category?.code);
  const supportsLevels = selectedCategoryRows.some((entry) => entry.level !== null);
  const supportsRoles = selectedCategoryRows.some((entry) => entry.role !== null);
  if (category && !supportsLevels) missingSet.delete('level');
  if (category && !supportsRoles) {
    missingSet.delete('role');
    missingSet.delete('achievement');
  }
  const missing = [...missingSet];
  const scopeLevels = hasScopeLevels(category ? [category] : candidates.category, dependencies.creditTable);
  const questions = toQuestions(missing, candidates, scopeLevels, input.answers);
  const levelCandidate = classification?.level[0];
  const needsScopeAnswer = scopeLevels && missing.includes('level') && !input.answers.participant_scope;
  const roleCandidate = classification?.role[0];
  const achievementCandidate = classification?.achievement[0];
  const selectedLevel = levelCandidate?.code === NO_LEVEL_CODE ? null : levelCandidate?.code ?? null;
  const selectedRole = roleCandidate?.code === NO_ROLE_CODE ? null : roleCandidate?.code ?? null;
  const selectedAchievement = achievementCandidate?.code === NO_ROLE_CODE ? null : achievementCandidate?.code ?? null;
  const categoryEntry = category
    ? dependencies.creditTable.entries.find((entry) => entry.categoryCode === category.code)
    : undefined;
  const component = categoryEntry?.komponen ?? null;
  const activityNameFull = classification?.activity_name_full ?? null;
  const activityName = activityNameFull && activityNameFull.confidence >= dependencies.rules.confidenceThreshold
    ? activityNameFull.value
    : fields.activity_name.value;
  const role = selectedRole;
  const achievement = selectedAchievement;
  const effectiveRole = [
    { code: role, confidence: roleCandidate?.confidence ?? 0 },
    { code: achievement, confidence: achievementCandidate?.confidence ?? 0 },
  ].filter((choice): choice is { code: string; confidence: number } =>
    choice.code !== null && dependencies.creditTable.entries.some((entry) => entry.categoryCode === category?.code && entry.role === choice.code),
  ).sort((a, b) => b.confidence - a.confidence)[0]?.code ?? null;
  const check = recheck({
    documentKind: fields.document_kind,
    recipientName: fields.recipient_name.value,
    accountName: input.student.name,
    angkatan: input.student.angkatan,
    activityName,
    activityEndDate: fields.activity_end_date.value,
    komponen: component,
    categoryCode: category?.code ?? null,
    level: input.answers.participant_scope === 'unknown' || needsScopeAnswer ? null : selectedLevel,
    role: effectiveRole,
    achievement,
    answers: input.answers,
    today: input.today,
  }, {
    rules: dependencies.rules,
    creditTable: dependencies.creditTable,
    guidelineSections: dependencies.guidelineSections,
  });
  const findings = check.findings.filter((item) => !['category', 'level', 'role'].includes(item.checkType));
  for (const [field, candidate] of [
    ['category', category],
    ['level', selectedLevel === null ? null : levelCandidate],
    ['role', effectiveRole === null ? null : roleCandidate],
  ] as const) {
    if (candidate) {
      findings.push({
        checkType: field,
        result: candidate.confidence < dependencies.rules.confidenceThreshold ? 'warn' : 'pass',
        confidence: candidate.confidence,
        message: candidate.confidence < dependencies.rules.confidenceThreshold
          ? `Saran ${field} memiliki keyakinan rendah dan perlu dikonfirmasi.`
          : `Saran ${field} dipilih dari kandidat tabel resmi.`,
        guidelineRef: refForFinding(dependencies.guidelineSections, field, category?.code ?? null),
        data: { code: candidate.code },
      });
    }
  }
  if (fields.activity_name.value && /\b[A-Z]{2,}\b/.test(fields.activity_name.value) && !activityNameFull) {
    findings.push({
      checkType: 'activity_name',
      result: 'warn',
      confidence: fields.activity_name.confidence,
      message: 'Nama kegiatan tampak menggunakan singkatan; periksa nama resmi kegiatan.',
      guidelineRef: refForFinding(dependencies.guidelineSections, 'activity_name', category?.code ?? null),
      data: { code: 'ACTIVITY_NAME_ABBREVIATED' },
    });
  }
  const missingFieldNames = missing.filter((field) => ['recipient_name', 'activity_name', 'activity_end_date'].includes(field));
  const reviewStatus = check.reviewStatus === 'problem'
    ? 'problem'
    : check.reviewStatus === 'needs_fix' || questions.length > 0 || missingFieldNames.length > 0
      ? 'needs_fix'
      : 'ready';
  return {
    reviewStatus,
    findings,
    warnings: findings.filter((finding) => finding.result === 'warn'),
    questions,
    extractedFields: fields,
    classification,
    readerStrategy: readerResult.strategy,
    activityName: check.activityName,
    activityDate: check.activityEndDate,
    locationPlatform: fields.location_platform.value,
    organizer: fields.organizer.value,
    attachmentType: fields.document_kind,
    komponen: check.komponen,
    categoryCode: check.categoryCode,
    level: check.level,
    role: check.role,
    achievement: check.achievement,
    estimatedCredit: check.estimatedCredit,
    creditEntryId: check.creditEntryId,
  };
}
