/** Pre-check orchestration tests with deterministic reader/classifier doubles. */

import { describe, expect, it } from 'vitest';
import { ExtractedFieldsSchema, type ClassificationResult } from '@skem/shared';
import { runPrecheck } from '../../src/agent/precheck.js';
import type { CandidateGroups } from '../../src/agent/candidates.js';
import type { ClassificationCaller } from '../../src/agent/classify.js';
import { creditTable, guidelineSections, rules } from '../../src/rules/config.js';

const fields = ExtractedFieldsSchema.parse({
  document_kind: 'certificate',
  recipient_name: { value: 'Budi Santoso', confidence: 0.99 },
  activity_name: { value: 'Juara II Lomba Karya Ilmiah', confidence: 0.95 },
  activity_start_date: { value: null, confidence: 0 },
  activity_end_date: { value: '2026-09-01', confidence: 0.9 },
  organizer: { value: 'Panitia', confidence: 0.8 },
  location_platform: { value: 'Surabaya', confidence: 0.8 },
  role_text: { value: 'Juara II', confidence: 0.9 },
  achievement_text: { value: 'Juara II', confidence: 0.9 },
  participant_scope_text: { value: null, confidence: 0 },
});

function classification(
  candidates: CandidateGroups,
  missing: string[],
  categoryCode = 'K3-B01',
  preferredRole = 'Juara II',
): ClassificationResult {
  const category = candidates.category.find((candidate) => candidate.code === categoryCode) ?? candidates.category[0]!;
  const choose = (candidate: CandidateGroups['category'][number], confidence = 0.9) => [{ ...candidate, confidence }];
  return {
    category: choose(category),
    level: choose(candidates.level.find((candidate) => candidate.code === 'Nasional') ?? candidates.level[0]!, 0.5),
    role: choose(candidates.role.find((candidate) => candidate.code === preferredRole) ?? candidates.role[0]!),
    achievement: choose(candidates.achievement.find((candidate) => candidate.code === preferredRole) ?? candidates.achievement[0]!),
    activity_name_full: null,
    missing,
  };
}

function makeClassifier(missing: string[], categoryCode?: string, preferredRole?: string): { classify: ClassificationCaller; callCount: () => number } {
  let calls = 0;
  const classify: ClassificationCaller = async (request) => {
    calls += 1;
    const message = request.messages[1]?.content;
    if (typeof message !== 'string') throw new Error('Expected JSON classification input');
    const payload = JSON.parse(message) as { candidates: CandidateGroups };
    return {
      data: classification(payload.candidates, missing, categoryCode, preferredRole),
      usage: { promptTokens: 1, completionTokens: 1 },
      latencyMs: 1,
    };
  };
  return { classify, callCount: () => calls };
}

describe('runPrecheck', () => {
  it('asks participant scope, then recheck maps national to official credit without a second classification', async () => {
    const fake = makeClassifier(['level']);
    const first = await runPrecheck({
      submissionId: 1,
      runId: 2,
      pdf: Buffer.from('%PDF fixture'),
      sha256: 'fixture-hash',
      student: { name: 'Budi Santoso', angkatan: 2025 },
      today: '2026-10-09',
      answers: {},
    }, {
      reader: { read: async () => ({ strategy: 'text', fields }) },
      classify: fake.classify,
      rules,
      creditTable,
      guidelineSections,
    });
    expect(first.reviewStatus).toBe('needs_fix');
    expect(first.questions[0]?.field).toBe('participant_scope');
    expect(first.questions[0]?.options).toHaveLength(5);

    const afterAnswer = await runPrecheck({
      submissionId: 1,
      runId: 3,
      pdf: Buffer.from('%PDF fixture'),
      sha256: 'fixture-hash',
      student: { name: 'Budi Santoso', angkatan: 2025 },
      today: '2026-10-09',
      answers: { participant_scope: 'national' },
      classification: first.classification,
      extractedFields: fields,
    }, {
      reader: { read: async () => { throw new Error('recheck must not reread PDF'); } },
      classify: fake.classify,
      rules,
      creditTable,
      guidelineSections,
    });
    expect(afterAnswer.reviewStatus).toBe('ready');
    expect(afterAnswer.level).toBe('Nasional');
    expect(afterAnswer.creditEntryId).toBe('K3-B01-NAS-JUARA2');
    expect(fake.callCount()).toBe(1);
  });

  it('keeps a minor spelling difference ready with a NAME_SPELLING warning', async () => {
    const fake = makeClassifier([], 'K1-03', 'Peserta');
    const spellingFields = ExtractedFieldsSchema.parse({
      ...fields,
      recipient_name: { value: 'Rizki Pratama', confidence: 0.99 },
      activity_name: { value: 'LKMM Pra-TD', confidence: 0.95 },
      activity_end_date: { value: '2025-09-01', confidence: 0.9 },
      role_text: { value: 'Peserta', confidence: 0.9 },
      achievement_text: { value: null, confidence: 0 },
    });
    const result = await runPrecheck({
      submissionId: 1,
      runId: 4,
      pdf: Buffer.from('%PDF fixture'),
      sha256: 'fixture-spelling',
      student: { name: 'Rizky Pratama', angkatan: 2024 },
      today: '2026-10-09',
      answers: {},
    }, {
      reader: { read: async () => ({ strategy: 'text', fields: spellingFields }) },
      classify: fake.classify,
      rules,
      creditTable,
      guidelineSections,
    });
    expect(result.reviewStatus).toBe('ready');
    expect(result.warnings.some((warning) => warning.data?.code === 'NAME_SPELLING')).toBe(true);
    expect(result.findings.every((finding) => finding.guidelineRef?.id)).toBe(true);
  });

  it('leaves estimated credit null when selected combination is absent from the official table', async () => {
    const result = await runPrecheck({
      submissionId: 1,
      runId: 5,
      pdf: Buffer.from('%PDF fixture'),
      sha256: 'fixture-credit-missing',
      student: { name: 'Farhan Ramadhan', angkatan: 2024 },
      today: '2026-10-09',
      answers: {},
      extractedFields: ExtractedFieldsSchema.parse({ ...fields, recipient_name: { value: 'Farhan Ramadhan', confidence: 0.99 } }),
      classification: {
        category: [{ code: 'K3-C02', confidence: 0.95 }],
        level: [{ code: 'Internasional', confidence: 0.95 }],
        role: [{ code: 'Pelatih', confidence: 0.95 }],
        achievement: [{ code: 'Pelatih', confidence: 0.95 }],
        activity_name_full: null,
        missing: [],
      },
    }, {
      reader: { read: async () => { throw new Error('cached fields should skip reader'); } },
      rules,
      creditTable,
      guidelineSections,
    });
    expect(result.reviewStatus).toBe('needs_fix');
    expect(result.estimatedCredit).toBeNull();
    expect(result.findings.find((finding) => finding.checkType === 'credit')?.result).toBe('fail');
  });

  it('flags a different recipient as problem and explains both names', async () => {
    const fake = makeClassifier([]);
    const wrongRecipient = ExtractedFieldsSchema.parse({ ...fields, recipient_name: { value: 'Nisa Rahma', confidence: 0.99 } });
    const result = await runPrecheck({
      submissionId: 1,
      runId: 2,
      pdf: Buffer.from('%PDF fixture'),
      sha256: 'fixture-name-mismatch',
      student: { name: 'Budi Santoso', angkatan: 2025 },
      today: '2026-10-09',
      answers: { participant_scope: 'national' },
    }, {
      reader: { read: async () => ({ strategy: 'text', fields: wrongRecipient }) },
      classify: fake.classify,
      rules,
      creditTable,
      guidelineSections,
    });
    expect(result.reviewStatus).toBe('problem');
    expect(result.findings.find((item) => item.checkType === 'name_match')?.message).toContain('Nisa Rahma');
    expect(result.findings.find((item) => item.checkType === 'name_match')?.message).toContain('Budi Santoso');
  });
});
