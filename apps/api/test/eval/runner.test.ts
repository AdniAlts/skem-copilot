import type { TestCase } from '@skem/shared';
import { describe, expect, it } from 'vitest';
import { mapAnswers, runCases, selectCases } from '../../src/eval/runner';
import type { ScoredResult } from '../../src/eval/score';

function testCase(id: string, split: TestCase['split']): TestCase {
  return {
    id,
    file: `cases/${id}.pdf`,
    split,
    account: { name: 'Budi', angkatan: 2025 },
    submissionDate: '2026-10-09',
    answers: {},
    expected: {
      review_status: 'ready',
      category_code: '',
      level: '',
      role: '',
      credit_entry_id: '',
      errors: [],
    },
  };
}

const CASES = [
  testCase('c001', 'tuning'),
  testCase('c002', 'tuning'),
  testCase('c007', 'heldout'),
  testCase('c003', 'tuning'),
];

describe('selectCases', () => {
  it('heldout tidak pernah menjalankan kasus tuning, dan sebaliknya', () => {
    expect(selectCases(CASES, { split: 'heldout' }).map((c) => c.id)).toEqual(['c007']);
    expect(selectCases(CASES, { split: 'tuning' }).map((c) => c.id)).toEqual([
      'c001',
      'c002',
      'c003',
    ]);
  });

  it('--ids tetap dibatasi split', () => {
    expect(
      selectCases(CASES, { split: 'heldout', ids: ['c001', 'c007'] }).map((c) => c.id),
    ).toEqual(['c007']);
  });

  it('--limit memotong setelah filter', () => {
    expect(selectCases(CASES, { split: 'tuning', limit: 2 }).map((c) => c.id)).toEqual([
      'c001',
      'c002',
    ]);
    expect(selectCases(CASES, { split: 'all' })).toHaveLength(4);
  });
});

describe('mapAnswers', () => {
  it('jawaban tingkat berupa cakupan dipetakan ke participant_scope', () => {
    expect(mapAnswers({ level: 'national' })).toEqual({ participant_scope: 'national' });
  });

  it('jawaban lain diteruskan apa adanya', () => {
    expect(mapAnswers({ level: 'Nasional', role: 'Ketua' })).toEqual({
      level: 'Nasional',
      role: 'Ketua',
    });
  });
});

describe('runCases', () => {
  const okResult = { reviewStatus: 'ready' } as ScoredResult;

  it('kegagalan satu kasus dicatat dan kasus berikutnya tetap jalan', async () => {
    const outcomes = await runCases(CASES.slice(0, 2), async (testCase, usage) => {
      usage.calls += 1;
      usage.promptTokens += 10;
      if (testCase.id === 'c001') throw new Error('Gateway timeout');
      return { before: okResult, after: okResult };
    });
    expect(outcomes.map((o) => o.error)).toEqual(['Error: Gateway timeout', null]);
    expect(outcomes[0]?.usage).toEqual({ calls: 1, promptTokens: 10, completionTokens: 0 });
    expect(outcomes[1]?.after).toBe(okResult);
  });
});
