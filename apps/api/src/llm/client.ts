/**
 * Single LLM gateway client. All model calls must pass through this module.
 * Prompts and responses are never logged; only usage metadata is persisted.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { createDb, type Db, type DbClient } from '../db/client.js';
import { llmCalls } from '../db/schema.js';
import { loadEnv } from '../env.js';

export const LLM_TIMEOUT_MS = 45_000;
export const MAX_RETRIES = 1;
export const RETRY_DELAY_MS = 1_000;

export const LlmPurposeSchema = z.enum([
  'extract_text',
  'extract_vision',
  'extract_repair',
  'classify',
  'classify_repair',
]);
export type LlmPurpose = z.infer<typeof LlmPurposeSchema>;
export type LlmErrorKind = 'transient' | 'permanent' | 'invalid_json';

export class LlmError extends Error {
  constructor(
    override message: string,
    readonly kind: LlmErrorKind,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export type LlmTextPart = { type: 'text'; text: string };
export type LlmImagePart = { type: 'image_url'; image_url: { url: string } };
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<LlmTextPart | LlmImagePart>;
};

export interface CallLlmInput<T> {
  purpose: LlmPurpose;
  submissionId: number | null;
  runId: number | null;
  promptVersion: string;
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  repair?: boolean;
}

export interface CallLlmResult<T> {
  data: T;
  usage: { promptTokens: number | null; completionTokens: number | null };
  latencyMs: number;
}

/** One row of `llm_calls`. Never contains prompt or response content. */
export type LlmUsageRecord = typeof llmCalls.$inferInsert;
export type RecordUsage = (record: LlmUsageRecord) => Promise<void>;

export interface GatewayOptions {
  model: string;
  recordUsage: RecordUsage;
  /** Delay before the single retry of a transient error. */
  retryDelayMs?: number;
}

type Usage = CallLlmResult<unknown>['usage'];
type ValidationIssue = { path: string; message: string };
type ParseOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'invalid_json' | 'invalid_json_shape'; issues: ValidationIssue[] };

export function dbUsageRecorder(db: Db): RecordUsage {
  return async (record) => {
    await db.insert(llmCalls).values(record);
  };
}

function usageRecord(
  input: CallLlmInput<unknown>,
  model: string,
  usage: Usage,
  latencyMs: number,
  error: string | null,
): LlmUsageRecord {
  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  return {
    runId: input.runId,
    submissionId: input.submissionId,
    purpose: input.purpose,
    model,
    promptVersion: input.promptVersion,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    latencyMs,
    cacheHit: false,
    error,
  };
}

const NO_USAGE: Usage = { promptTokens: null, completionTokens: null };

function safeErrorMessage(error: unknown): string {
  if (error instanceof LlmError) return error.message;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'Gateway timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'Gateway unreachable';
  if (error instanceof OpenAI.APIError) return `Gateway ${error.status ?? 'error'}`;
  return 'Gateway request failed';
}

/** Timeouts and dropped connections (no HTTP status), 429, and 5xx are worth one retry. */
function isTransient(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionError) return true;
  if (error instanceof OpenAI.APIError) return error.status === 429 || (error.status ?? 0) >= 500;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponse<T>(raw: string, schema: z.ZodType<T>): ParseOutcome<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: 'invalid_json',
      issues: [{ path: '', message: 'Response is not valid JSON' }],
    };
  }
  const validated = schema.safeParse(parsed);
  if (validated.success) return { ok: true, data: validated.data };
  return {
    ok: false,
    error: 'invalid_json_shape',
    issues: validated.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Repair prompt: only the original system instructions (schema description), the invalid
 * response, and the validation issues. Never resends user content or images.
 */
function makeRepairMessages(
  original: ChatMessage[],
  raw: string,
  issues: ValidationIssue[],
): ChatMessage[] {
  const instructions = original
    .filter((message) => message.role === 'system' && typeof message.content === 'string')
    .map((message) => message.content as string);
  return [
    {
      role: 'system',
      content: [
        'Perbaiki JSON berikut agar sesuai instruksi dan schema. Kembalikan hanya satu object JSON tanpa penjelasan.',
        ...instructions,
      ].join('\n\n'),
    },
    { role: 'user', content: JSON.stringify({ invalidResponse: raw, validationErrors: issues }) },
  ];
}

/** Sends one request, retrying a transient failure once. Failed attempts are recorded here. */
async function requestWithRetry(
  openai: OpenAI,
  input: CallLlmInput<unknown>,
  options: GatewayOptions,
): Promise<{ raw: string; usage: Usage; latencyMs: number }> {
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    try {
      const response = await openai.chat.completions.create({
        model: options.model,
        messages: input.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      return {
        raw: response.choices[0]?.message.content ?? '',
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? null,
          completionTokens: response.usage?.completion_tokens ?? null,
        },
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const transient = isTransient(error);
      await options.recordUsage(
        usageRecord(input, options.model, NO_USAGE, Date.now() - started, safeErrorMessage(error)),
      );
      if (!transient || attempt >= MAX_RETRIES) {
        throw new LlmError(safeErrorMessage(error), transient ? 'transient' : 'permanent', error);
      }
      await sleep(options.retryDelayMs ?? RETRY_DELAY_MS);
    }
  }
}

export async function callWithClient<T>(
  openai: OpenAI,
  input: CallLlmInput<T>,
  options: GatewayOptions,
): Promise<CallLlmResult<T>> {
  const { raw, usage, latencyMs } = await requestWithRetry(openai, input, options);

  if (!raw) {
    await options.recordUsage(
      usageRecord(input, options.model, usage, latencyMs, 'empty_response'),
    );
    throw new LlmError('Gateway returned empty response', 'permanent');
  }

  const outcome = parseResponse(raw, input.schema);
  await options.recordUsage(
    usageRecord(input, options.model, usage, latencyMs, outcome.ok ? null : outcome.error),
  );
  if (outcome.ok) return { data: outcome.data, usage, latencyMs };

  if (input.repair) {
    throw new LlmError('Gateway returned invalid JSON after repair', 'invalid_json');
  }
  const repairPurpose: LlmPurpose =
    input.purpose === 'extract_text' || input.purpose === 'extract_vision'
      ? 'extract_repair'
      : 'classify_repair';
  return callWithClient(
    openai,
    {
      ...input,
      purpose: repairPurpose,
      messages: makeRepairMessages(input.messages, raw, outcome.issues),
      repair: true,
    },
    options,
  );
}

let gateway: { openai: OpenAI; options: GatewayOptions; db: DbClient } | null = null;

/** Lazily creates one gateway client and one DB connection shared by all calls. */
function sharedGateway() {
  if (!gateway) {
    const env = loadEnv();
    const db = createDb();
    gateway = {
      db,
      openai: new OpenAI({
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
        timeout: LLM_TIMEOUT_MS,
        maxRetries: 0,
      }),
      options: { model: env.LLM_MODEL, recordUsage: dbUsageRecorder(db.db) },
    };
  }
  return gateway;
}

let usageRecorderOverride: RecordUsage | null = null;

/**
 * Redirects usage records away from `llm_calls` (e.g. eval runs must not pollute the token log
 * used for scoring). Returns a function that restores the default recorder.
 */
export function overrideLlmUsageRecorder(recorder: RecordUsage): () => void {
  usageRecorderOverride = recorder;
  return () => {
    usageRecorderOverride = null;
  };
}

export async function callLlm<T>(input: CallLlmInput<T>): Promise<CallLlmResult<T>> {
  const { openai, options } = sharedGateway();
  return callWithClient(openai, input, {
    ...options,
    recordUsage: usageRecorderOverride ?? options.recordUsage,
  });
}

/** Closes the shared DB connection (for scripts that must exit). */
export async function closeLlmGateway(): Promise<void> {
  if (!gateway) return;
  await gateway.db.client.end();
  gateway = null;
}
