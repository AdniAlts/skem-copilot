/** Pemilihan kasus dan eksekusi eval per kasus (kegagalan satu kasus tidak menghentikan eval). */

import type { TestCase } from '@skem/shared';
import type { CaseOutcome, CaseUsage, EvalSplit, ScoredResult } from './score.js';

export type CaseSelection = { split: EvalSplit; ids?: string[]; limit?: number };

/**
 * Filter split SELALU diterapkan lebih dulu: `--split=heldout` tidak pernah menjalankan kasus
 * `tuning` (dan sebaliknya), walaupun id-nya disebut di `--ids`.
 */
export function selectCases(cases: TestCase[], selection: CaseSelection): TestCase[] {
  const inSplit =
    selection.split === 'all' ? cases : cases.filter((c) => c.split === selection.split);
  const byId = selection.ids?.length
    ? inSplit.filter((c) => selection.ids?.includes(c.id))
    : inSplit;
  return selection.limit === undefined ? byId : byId.slice(0, selection.limit);
}

const PARTICIPANT_SCOPES = new Set(['campus', 'regional', 'national', 'international', 'unknown']);

/**
 * Kunci jawaban menulis jawaban tingkat sebagai `level: "national"`, sedangkan agent menanyakan
 * cakupan peserta lewat field `participant_scope`. Nilai cakupan dipetakan; lainnya diteruskan.
 */
export function mapAnswers(answers: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [field, value] of Object.entries(answers)) {
    if (field === 'level' && PARTICIPANT_SCOPES.has(value)) mapped.participant_scope = value;
    else mapped[field] = value;
  }
  return mapped;
}

export type CaseRun = { before: ScoredResult; after: ScoredResult };
export type CaseRunner = (testCase: TestCase, usage: CaseUsage) => Promise<CaseRun>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export async function runCases(
  cases: TestCase[],
  runCase: CaseRunner,
  onCaseDone?: (outcome: CaseOutcome, index: number) => void,
): Promise<CaseOutcome[]> {
  const outcomes: CaseOutcome[] = [];
  for (const [index, testCase] of cases.entries()) {
    const usage: CaseUsage = { calls: 0, promptTokens: 0, completionTokens: 0 };
    let outcome: CaseOutcome;
    try {
      const { before, after } = await runCase(testCase, usage);
      outcome = { testCase, before, after, error: null, usage };
    } catch (error) {
      outcome = { testCase, before: null, after: null, error: errorMessage(error), usage };
    }
    outcomes.push(outcome);
    onCaseDone?.(outcome, index);
  }
  return outcomes;
}
