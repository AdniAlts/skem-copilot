import type { Finding, TestCase } from '@skem/shared';
import { describe, expect, it } from 'vitest';
import {
  renderMarkdown,
  scoreEval,
  type CaseOutcome,
  type ScoredResult,
} from '../../src/eval/score';

function testCase(overrides: Partial<TestCase['expected']> & { id?: string } = {}): TestCase {
  const { id = 'c001', ...expected } = overrides;
  return {
    id,
    file: `cases/${id}.pdf`,
    split: 'tuning',
    account: { name: 'Budi Santoso', angkatan: 2025 },
    submissionDate: '2026-10-09',
    answers: {},
    expected: {
      review_status: 'ready',
      category_code: 'K3-B01',
      level: 'Nasional',
      role: 'Juara II',
      credit_entry_id: 'K3-B01-NAS-JUARA2',
      errors: [],
      ...expected,
    },
  };
}

function result(overrides: Partial<ScoredResult> = {}): ScoredResult {
  return {
    reviewStatus: 'ready',
    findings: [],
    questions: [],
    classification: {
      category: [
        { code: 'K3-B01', confidence: 0.9 },
        { code: 'K3-B03', confidence: 0.1 },
      ],
      level: [],
      role: [],
      achievement: [],
      activity_name_full: null,
      missing: [],
    },
    level: 'Nasional',
    role: 'Juara II',
    creditEntryId: 'K3-B01-NAS-JUARA2',
    readerStrategy: 'text',
    ...overrides,
  };
}

const finding = (checkType: Finding['checkType'], findingResult: Finding['result']): Finding => ({
  checkType,
  result: findingResult,
  message: 'x',
});

function outcome(partial: Partial<CaseOutcome> & { testCase: TestCase }): CaseOutcome {
  return {
    before: result(),
    after: result(),
    error: null,
    usage: { calls: 2, promptTokens: 100, completionTokens: 20 },
    ...partial,
  };
}

describe('scoreEval', () => {
  it('menghitung metrik dengan ukuran sampel', () => {
    const report = scoreEval('tuning', [
      outcome({ testCase: testCase({ id: 'c001' }) }),
      outcome({
        testCase: testCase({ id: 'c002' }),
        after: result({ creditEntryId: null, reviewStatus: 'needs_fix' }),
      }),
    ]);
    expect(report.cases).toBe(2);
    expect(report.status).toEqual({ n: 2, correct: 1 });
    expect(report.creditExact).toEqual({ n: 2, correct: 1 });
    expect(report.categoryTop1).toEqual({ n: 2, correct: 2 });
  });

  it('top-3 kategori menghitung kandidat kedua dan ketiga', () => {
    const report = scoreEval('tuning', [
      outcome({ testCase: testCase({ category_code: 'K3-B03' }) }),
    ]);
    expect(report.categoryTop1).toEqual({ n: 1, correct: 0 });
    expect(report.categoryTop3).toEqual({ n: 1, correct: 1 });
  });

  it('nilai kosong "" di kunci jawaban setara null di hasil', () => {
    const report = scoreEval('tuning', [
      outcome({
        testCase: testCase({
          category_code: 'K1-03',
          level: '',
          role: 'Peserta',
          credit_entry_id: 'K1-03-PESERTA',
        }),
        after: result({ level: null, role: 'Peserta', creditEntryId: 'K1-03-PESERTA' }),
      }),
    ]);
    expect(report.level).toEqual({ n: 1, correct: 1 });
  });

  it('kasus tanpa kategori di kunci tidak ikut metrik kategori/tingkat/peran', () => {
    const report = scoreEval('tuning', [
      outcome({
        testCase: testCase({ category_code: '', level: '', role: '', credit_entry_id: '' }),
      }),
    ]);
    expect(report.categoryTop1.n).toBe(0);
    expect(report.level.n).toBe(0);
    expect(report.creditExact.n).toBe(1);
  });

  it('deteksi kesalahan memakai hasil sebelum jawaban dan menghitung salah alarm', () => {
    const report = scoreEval('tuning', [
      outcome({
        testCase: testCase({
          id: 'c001',
          errors: ['level'],
          review_status_before_answer: 'needs_fix',
        }),
        before: result({
          reviewStatus: 'needs_fix',
          questions: [
            { seq: 1, field: 'participant_scope', question: '?', options: [], answer: null },
          ],
        }),
      }),
      outcome({
        testCase: testCase({ id: 'c002', errors: ['name_mismatch'] }),
        before: result({ findings: [finding('name_match', 'fail')] }),
      }),
      outcome({
        testCase: testCase({ id: 'c003' }),
        before: result({ findings: [finding('name_match', 'warn'), finding('level', 'warn')] }),
      }),
    ]);
    expect(report.byError.level).toEqual({ n: 1, detected: 1, falseAlarms: 1 });
    expect(report.byError.name_mismatch).toEqual({ n: 1, detected: 1, falseAlarms: 0 });
    expect(report.statusBeforeAnswer).toEqual({ n: 1, correct: 1 });
  });

  it('kasus yang gagal dijalankan dihitung salah, bukan dibuang', () => {
    const report = scoreEval('heldout', [
      outcome({
        testCase: testCase({ errors: ['deadline'] }),
        before: null,
        after: null,
        error: 'Gateway timeout',
      }),
    ]);
    expect(report.failedRuns).toBe(1);
    expect(report.status).toEqual({ n: 1, correct: 0 });
    expect(report.byError.deadline).toEqual({ n: 1, detected: 0, falseAlarms: 0 });
    expect(report.perCase[0]?.error).toBe('Gateway timeout');
  });

  it('menjumlahkan token dan rata-rata per kasus', () => {
    const report = scoreEval('tuning', [
      outcome({ testCase: testCase({ id: 'c001' }) }),
      outcome({
        testCase: testCase({ id: 'c002' }),
        usage: { calls: 0, promptTokens: 0, completionTokens: 0 },
        before: result({ readerStrategy: 'cache' }),
      }),
    ]);
    expect(report.tokens).toEqual({
      calls: 2,
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      avgPerCase: 60,
      cacheHits: 1,
    });
  });
});

describe('renderMarkdown', () => {
  it('setiap angka menyebut n, dan judul menyebut split', () => {
    const markdown = renderMarkdown(
      scoreEval('heldout', [outcome({ testCase: testCase({ errors: ['credit'] }) })]),
    );
    expect(markdown).toContain('split `heldout`, 1 kasus');
    expect(markdown).toContain('| Status kartu akhir (setelah jawaban) | 1/1 (100,0%) |');
    expect(markdown).toContain('| credit | 0/1 (0,0%) | 0 dari 0 kasus |');
  });
});
