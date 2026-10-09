/** Classifier tests: mocked client, candidate allow-list, no credit output. */

import { describe, expect, it } from 'vitest';
import { ExtractedFieldsSchema, type ClassificationResult } from '@skem/shared';
import { classifyActivity, type ClassificationCaller } from '../../src/agent/classify.js';
import type { CandidateGroups } from '../../src/agent/candidates.js';

const candidates: CandidateGroups = {
  category: [{ code: 'K3-B01', label: 'Lomba Karya Ilmiah', confidence: 0.8 }],
  level: [{ code: 'Nasional', label: 'Nasional', confidence: 0.7 }],
  role: [{ code: 'Juara II', label: 'Juara II', confidence: 0.9 }],
  achievement: [{ code: 'Juara II', label: 'Juara II', confidence: 0.9 }],
};

const fields = ExtractedFieldsSchema.parse({
  document_kind: 'certificate',
  recipient_name: { value: 'Budi Santoso', confidence: 0.99 },
  activity_name: { value: 'Lomba Karya Ilmiah', confidence: 0.9 },
  activity_start_date: { value: null, confidence: 0 },
  activity_end_date: { value: '2026-09-01', confidence: 0.8 },
  organizer: { value: null, confidence: 0 },
  location_platform: { value: null, confidence: 0 },
  role_text: { value: 'Juara II', confidence: 0.9 },
  achievement_text: { value: 'Juara II', confidence: 0.9 },
  participant_scope_text: { value: null, confidence: 0 },
});

const validResult: ClassificationResult = {
  category: [{ code: 'K3-B01', confidence: 0.9 }],
  level: [{ code: 'Nasional', confidence: 0.8 }],
  role: [{ code: 'Juara II', confidence: 0.9 }],
  achievement: [{ code: 'Juara II', confidence: 0.9 }],
  activity_name_full: null,
  missing: [],
};

function fakeClient(result: ClassificationResult, inspect?: (messages: unknown) => void): ClassificationCaller {
  return async (input) => {
    inspect?.(input.messages);
    return { data: result, usage: { promptTokens: 10, completionTokens: 5 }, latencyMs: 2 };
  };
}

describe('classifyActivity', () => {
  it('sends only supplied candidates and relevant guideline sections', async () => {
    let serialized = '';
    const result = await classifyActivity(fields, candidates, [{ id: 'level-guide', title: 'Tingkat', ref: 'p. 10', text: 'cakupan peserta' }], { submissionId: 1, runId: 2 }, fakeClient(validResult, (messages) => { serialized = JSON.stringify(messages); }));
    expect(result).toEqual(validResult);
    expect(serialized).toContain('level-guide');
    expect(serialized).toContain('K3-B01');
    expect(serialized).not.toContain('credit');
  });

  it('rejects a code outside provided candidates', async () => {
    const invalid = { ...validResult, category: [{ code: 'NOT-A-CANDIDATE', confidence: 0.99 }] };
    await expect(classifyActivity(fields, candidates, [], { submissionId: 1, runId: 2 }, fakeClient(invalid)))
      .rejects.toThrow('outside candidates');
  });
});
