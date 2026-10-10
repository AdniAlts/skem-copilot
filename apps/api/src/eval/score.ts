/**
 * Penilaian eval (fungsi murni): membandingkan hasil pre-check dengan kunci jawaban test set.
 * Setiap angka membawa ukuran sampelnya (n) dan split-nya.
 */

import type { TestCase } from '@skem/shared';
import type { PrecheckResult } from '../agent/precheck.js';

export type EvalSplit = TestCase['split'] | 'all';

export type ScoredResult = Pick<
  PrecheckResult,
  | 'reviewStatus'
  | 'findings'
  | 'questions'
  | 'classification'
  | 'level'
  | 'role'
  | 'creditEntryId'
  | 'readerStrategy'
>;

export type CaseUsage = { calls: number; promptTokens: number; completionTokens: number };

export type CaseOutcome = {
  testCase: TestCase;
  /** Hasil sebelum jawaban mahasiswa (yang dideteksi agent). */
  before: ScoredResult | null;
  /** Hasil setelah jawaban dari kunci diterapkan (cek ulang tanpa LLM). */
  after: ScoredResult | null;
  error: string | null;
  usage: CaseUsage;
};

export type Ratio = { n: number; correct: number };
export type ErrorDetection = { n: number; detected: number; falseAlarms: number };

export type EvalReport = {
  split: EvalSplit;
  cases: number;
  failedRuns: number;
  status: Ratio;
  statusBeforeAnswer: Ratio;
  categoryTop1: Ratio;
  categoryTop3: Ratio;
  level: Ratio;
  role: Ratio;
  creditExact: Ratio;
  byError: Record<string, ErrorDetection>;
  tokens: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    avgPerCase: number;
    cacheHits: number;
  };
  perCase: Array<{
    id: string;
    expectedStatus: string;
    actualStatus: string | null;
    creditEntryId: string | null;
    totalTokens: number;
    readerStrategy: string | null;
    error: string | null;
  }>;
};

function nonPass(result: ScoredResult, checkType: string): boolean {
  return result.findings.some((f) => f.checkType === checkType && f.result !== 'pass');
}

function failed(result: ScoredResult, checkType: string): boolean {
  return result.findings.some((f) => f.checkType === checkType && f.result === 'fail');
}

function asked(result: ScoredResult, ...fields: string[]): boolean {
  return result.questions.some((q) => fields.includes(q.field));
}

/**
 * Bukti bahwa agent mendeteksi tiap jenis kesalahan di kunci jawaban.
 * Peringatan nama (warn) bukan kesalahan `name_mismatch`; hanya `fail` (orang lain).
 */
export const ERROR_EVIDENCE: Record<string, (result: ScoredResult) => boolean> = {
  category: (r) => nonPass(r, 'category') || failed(r, 'completeness') || asked(r, 'category'),
  level: (r) => nonPass(r, 'level') || asked(r, 'level', 'participant_scope'),
  role: (r) => nonPass(r, 'role') || asked(r, 'role', 'achievement'),
  activity_name: (r) => nonPass(r, 'activity_name') || asked(r, 'activity_name'),
  name_mismatch: (r) => failed(r, 'name_match'),
  deadline: (r) => failed(r, 'deadline'),
  credit: (r) => failed(r, 'credit'),
  completeness: (r) => failed(r, 'completeness'),
};

/** Kunci jawaban memakai "" untuk kosong; hasil pre-check memakai null. */
function blankToNull(value: string): string | null {
  return value === '' ? null : value;
}

function ratio(items: boolean[]): Ratio {
  return { n: items.length, correct: items.filter(Boolean).length };
}

export function scoreEval(split: EvalSplit, outcomes: CaseOutcome[]): EvalReport {
  const withCategory = outcomes.filter((o) => o.testCase.expected.category_code !== '');
  const categoryCodes = (o: CaseOutcome) =>
    o.after?.classification?.category.map((c) => c.code) ?? [];

  const errorTypes = [...new Set(outcomes.flatMap((o) => o.testCase.expected.errors))].sort();
  const byError: Record<string, ErrorDetection> = {};
  for (const type of errorTypes) {
    const evidence = ERROR_EVIDENCE[type];
    const detection: ErrorDetection = { n: 0, detected: 0, falseAlarms: 0 };
    for (const outcome of outcomes) {
      const expected = outcome.testCase.expected.errors.includes(type);
      const found = outcome.before !== null && evidence !== undefined && evidence(outcome.before);
      if (expected) {
        detection.n += 1;
        if (found) detection.detected += 1;
      } else if (found) {
        detection.falseAlarms += 1;
      }
    }
    byError[type] = detection;
  }

  const promptTokens = outcomes.reduce((sum, o) => sum + o.usage.promptTokens, 0);
  const completionTokens = outcomes.reduce((sum, o) => sum + o.usage.completionTokens, 0);
  const totalTokens = promptTokens + completionTokens;

  return {
    split,
    cases: outcomes.length,
    failedRuns: outcomes.filter((o) => o.error !== null).length,
    status: ratio(outcomes.map((o) => o.after?.reviewStatus === o.testCase.expected.review_status)),
    statusBeforeAnswer: ratio(
      outcomes
        .filter((o) => o.testCase.expected.review_status_before_answer !== undefined)
        .map((o) => o.before?.reviewStatus === o.testCase.expected.review_status_before_answer),
    ),
    categoryTop1: ratio(
      withCategory.map((o) => categoryCodes(o)[0] === o.testCase.expected.category_code),
    ),
    categoryTop3: ratio(
      withCategory.map((o) =>
        categoryCodes(o).slice(0, 3).includes(o.testCase.expected.category_code),
      ),
    ),
    level: ratio(
      withCategory.map(
        (o) => o.after !== null && o.after.level === blankToNull(o.testCase.expected.level),
      ),
    ),
    role: ratio(
      withCategory.map(
        (o) => o.after !== null && o.after.role === blankToNull(o.testCase.expected.role),
      ),
    ),
    creditExact: ratio(
      outcomes.map(
        (o) =>
          o.after !== null &&
          o.after.creditEntryId === blankToNull(o.testCase.expected.credit_entry_id),
      ),
    ),
    byError,
    tokens: {
      calls: outcomes.reduce((sum, o) => sum + o.usage.calls, 0),
      promptTokens,
      completionTokens,
      totalTokens,
      avgPerCase: outcomes.length ? Math.round(totalTokens / outcomes.length) : 0,
      cacheHits: outcomes.filter((o) => o.before?.readerStrategy === 'cache').length,
    },
    perCase: outcomes.map((o) => ({
      id: o.testCase.id,
      expectedStatus: o.testCase.expected.review_status,
      actualStatus: o.after?.reviewStatus ?? null,
      creditEntryId: o.after?.creditEntryId ?? null,
      totalTokens: o.usage.promptTokens + o.usage.completionTokens,
      readerStrategy: o.before?.readerStrategy ?? null,
      error: o.error,
    })),
  };
}

function formatRatio({ n, correct }: Ratio): string {
  if (n === 0) return '— (n = 0)';
  const percent = ((correct / n) * 100).toFixed(1).replace('.', ',');
  return `${correct}/${n} (${percent}%)`;
}

/** Tabel Markdown siap tempel ke README §6–§7. */
export function renderMarkdown(report: EvalReport): string {
  const lines = [
    `### Hasil eval — split \`${report.split}\`, ${report.cases} kasus${report.failedRuns ? ` (${report.failedRuns} gagal dijalankan, dihitung salah)` : ''}`,
    '',
    '| Metrik | Hasil |',
    '|---|---|',
    `| Status kartu akhir (setelah jawaban) | ${formatRatio(report.status)} |`,
    `| Status sebelum jawaban | ${formatRatio(report.statusBeforeAnswer)} |`,
    `| Kategori top-1 | ${formatRatio(report.categoryTop1)} |`,
    `| Kategori top-3 | ${formatRatio(report.categoryTop3)} |`,
    `| Tingkat | ${formatRatio(report.level)} |`,
    `| Peran | ${formatRatio(report.role)} |`,
    `| Entri kredit tepat | ${formatRatio(report.creditExact)} |`,
    '',
    '| Jenis kesalahan | Terdeteksi | Salah alarm |',
    '|---|---|---|',
    ...Object.entries(report.byError).map(
      ([type, d]) =>
        `| ${type} | ${formatRatio({ n: d.n, correct: d.detected })} | ${d.falseAlarms} dari ${report.cases - d.n} kasus |`,
    ),
    '',
    `Token: ${report.tokens.totalTokens} total (${report.tokens.promptTokens} masuk, ${report.tokens.completionTokens} keluar) dalam ${report.tokens.calls} panggilan LLM; rata-rata ${report.tokens.avgPerCase} per kasus; ${report.tokens.cacheHits} kasus dari cache ekstraksi.`,
  ];
  return lines.join('\n');
}
