/**
 * `npm run eval`: menjalankan pipeline pre-check NYATA (gateway LLM) pada test set dan
 * membandingkannya dengan kunci jawaban. Tidak menulis apa pun ke database produksi:
 * token dicatat di memori, cache ekstraksi di berkas lokal, precheck_runs tidak ditulis.
 *
 *   npm run eval -- [--split=tuning|heldout|all] [--limit=N] [--ids=c001,c002] [--no-cache]
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { AnswerKeySchema, ExtractedFieldsSchema, type ExtractedFields } from '@skem/shared';

import { runPrecheck } from '../agent/precheck.js';
import { closeLlmGateway, overrideLlmUsageRecorder } from '../llm/client.js';
import { DocumentReader } from '../reader/index.js';
import { extractTextFields } from '../reader/text-strategy.js';
import { extractVisionFields } from '../reader/vision-strategy.js';
import { creditTable, guidelineSections, rules } from '../rules/config.js';
import { mapAnswers, runCases, selectCases, type CaseRunner } from './runner.js';
import { renderMarkdown, scoreEval, type CaseUsage } from './score.js';

const REPO_ROOT = new URL('../../../../', import.meta.url);
const TESTSET_DIR = new URL('data/testset/', REPO_ROOT);
const REPORTS_DIR = new URL('data/testset/reports/', REPO_ROOT);
const CACHE_FILE = new URL('extraction-cache.json', REPORTS_DIR);
/** Konteks dummy: eval tidak punya baris submissions/precheck_runs. */
const EVAL_CONTEXT = { submissionId: 0, runId: 0 };

const ArgsSchema = z.object({
  split: z.enum(['tuning', 'heldout', 'all']).default('tuning'),
  limit: z.coerce.number().int().positive().optional(),
  ids: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .optional(),
  noCache: z.boolean().default(false),
});
export type EvalArgs = z.infer<typeof ArgsSchema>;

export function parseArgs(argv: string[]): EvalArgs {
  const raw: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (arg === '--no-cache') {
      raw.noCache = true;
      continue;
    }
    const match = /^--(split|limit|ids)(?:=(.*))?$/.exec(arg);
    if (!match) throw new Error(`Argumen tidak dikenal: ${arg}`);
    const value = match[2] ?? argv[++i];
    if (value === undefined) throw new Error(`Argumen ${arg} butuh nilai.`);
    raw[match[1]!] = value;
  }
  return ArgsSchema.parse(raw);
}

type CacheMap = Record<string, ExtractedFields>;

function createFileCache(enabled: boolean) {
  const entries: CacheMap =
    enabled && existsSync(CACHE_FILE)
      ? (JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as CacheMap)
      : {};
  const key = (sha256: string, version: string) => `${version}:${sha256}`;
  return {
    read: async (sha256: string, version: string) => {
      if (!enabled) return null;
      const parsed = ExtractedFieldsSchema.safeParse(entries[key(sha256, version)]);
      return parsed.success ? parsed.data : null;
    },
    write: async (sha256: string, version: string, fields: ExtractedFields) => {
      if (!enabled) return;
      entries[key(sha256, version)] = fields;
      writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
    },
  };
}

function createCaseRunner(noCache: boolean): CaseRunner {
  const cache = createFileCache(!noCache);
  const reader = new DocumentReader({
    readCache: cache.read,
    writeCache: cache.write,
    extractText: extractTextFields,
    extractVision: extractVisionFields,
    // persistRun sengaja tidak diisi: eval tidak menulis precheck_runs.
  });
  const dependencies = { reader, rules, creditTable, guidelineSections };

  return async (testCase, usage: CaseUsage) => {
    const restore = overrideLlmUsageRecorder(async (record) => {
      usage.calls += 1;
      usage.promptTokens += record.promptTokens ?? 0;
      usage.completionTokens += record.completionTokens ?? 0;
    });
    try {
      const pdf = readFileSync(new URL(testCase.file, TESTSET_DIR));
      const base = {
        ...EVAL_CONTEXT,
        pdf,
        sha256: createHash('sha256').update(pdf).digest('hex'),
        student: testCase.account,
        today: testCase.submissionDate,
      };
      const before = await runPrecheck({ ...base, answers: {} }, dependencies);
      const answers = mapAnswers(testCase.answers);
      // Seperti di aplikasi: jawaban hanya menjalankan ulang aturan, tanpa LLM.
      const after = Object.keys(answers).length
        ? await runPrecheck(
            {
              ...base,
              answers,
              extractedFields: before.extractedFields,
              ...(before.classification ? { classification: before.classification } : {}),
            },
            dependencies,
          )
        : before;
      return { before, after };
    } finally {
      restore();
    }
  };
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  mkdirSync(REPORTS_DIR, { recursive: true });
  const answerKey = AnswerKeySchema.parse(
    JSON.parse(readFileSync(new URL('answer_key.json', TESTSET_DIR), 'utf8')),
  );
  const cases = selectCases(answerKey.cases, {
    split: args.split,
    ...(args.ids ? { ids: args.ids } : {}),
    ...(args.limit ? { limit: args.limit } : {}),
  });
  if (cases.length === 0) {
    console.error(`Tidak ada kasus untuk split "${args.split}" dengan filter yang diberikan.`);
    return 1;
  }

  console.log(
    `Eval split=${args.split}, ${cases.length} kasus, cache ${args.noCache ? 'mati' : 'aktif'} — memanggil gateway LLM (memakai token).`,
  );
  try {
    const outcomes = await runCases(cases, createCaseRunner(args.noCache), (outcome, index) => {
      const tokens = outcome.usage.promptTokens + outcome.usage.completionTokens;
      const status = outcome.error
        ? `GAGAL (${outcome.error})`
        : `${outcome.after?.reviewStatus} (harapan ${outcome.testCase.expected.review_status})`;
      console.log(
        `  [${index + 1}/${cases.length}] ${outcome.testCase.id}: ${status}, ${tokens} token`,
      );
    });
    const report = scoreEval(args.split, outcomes);
    const reportFile = new URL(
      `${new Date().toISOString().replace(/[:.]/g, '-')}-${args.split}.json`,
      REPORTS_DIR,
    );
    writeFileSync(reportFile, JSON.stringify({ args, ...report }, null, 2));
    console.log(`\n${renderMarkdown(report)}\n\nLaporan JSON: ${reportFile.pathname}`);
    return 0;
  } finally {
    await closeLlmGateway();
  }
}
