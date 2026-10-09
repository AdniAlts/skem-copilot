/**
 * Single LLM gateway client. All model calls must pass through this module.
 * Prompts and responses are never logged; only usage metadata is persisted.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { createDb, type Db } from '../db/client.js';
import { llmCalls } from '../db/schema.js';
import { loadEnv } from '../env.js';

export const LLM_TIMEOUT_MS = 45_000;
export const MAX_RETRIES = 1;

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

type AuditInput = {
  db: Db;
  input: CallLlmInput<unknown>;
  purpose: LlmPurpose;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  error: string | null;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof LlmError) return error.message;
  if (error instanceof OpenAI.APIError) return `Gateway ${error.status ?? 'unknown'}`;
  if (error instanceof Error) return error.name === 'AbortError' ? 'Gateway timeout' : error.name;
  return 'Gateway request failed';
}

function isTransient(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) return error.status === 429 || (error.status ?? 0) >= 500;
  if (error instanceof Error) return error.name === 'AbortError' || error.name === 'TypeError';
  return false;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function recordAudit(input: AuditInput): Promise<void> {
  await input.db.insert(llmCalls).values({
    runId: input.input.runId,
    submissionId: input.input.submissionId,
    purpose: input.purpose,
    model: input.model,
    promptVersion: input.input.promptVersion,
    promptTokens: input.promptTokens ?? 0,
    completionTokens: input.completionTokens ?? 0,
    totalTokens: input.promptTokens !== null && input.completionTokens !== null
      ? input.promptTokens + input.completionTokens
      : 0,
    latencyMs: input.latencyMs,
    cacheHit: false,
    error: input.error,
  });
}

function makeRepairMessages(original: ChatMessage[], raw: string, schema: z.ZodType<unknown>): ChatMessage[] {
  const validation = schema.safeParse(isJsonObject(raw) ? raw : null);
  return [
    {
      role: 'system',
      content: 'Perbaiki JSON berikut. Kembalikan hanya satu object JSON yang sesuai schema. Jangan menambah penjelasan.',
    },
    {
      role: 'user',
      content: JSON.stringify({ originalMessages: original, invalidResponse: raw, validationError: validation.success ? null : validation.error.issues }),
    },
  ];
}

export async function callLlm<T>(input: CallLlmInput<T>): Promise<CallLlmResult<T>> {
  const env = loadEnv();
  const { client, db } = createDb();
  const openai = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL, timeout: LLM_TIMEOUT_MS, maxRetries: 0 });
  try {
    return await callWithClient(openai, db, input);
  } finally {
    await client.end();
  }
}

export async function callWithClient<T>(
  openai: OpenAI,
  db: Db,
  input: CallLlmInput<T>,
): Promise<CallLlmResult<T>> {
  const env = loadEnv();
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= MAX_RETRIES) {
    const started = Date.now();
    try {
      const response = await openai.chat.completions.create({
        model: env.LLM_MODEL,
        messages: input.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      const raw = response.choices[0]?.message.content;
      if (!raw) throw new LlmError('Gateway returned empty response', 'permanent');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const usage = {
          promptTokens: response.usage?.prompt_tokens ?? null,
          completionTokens: response.usage?.completion_tokens ?? null,
        };
        const latencyMs = Date.now() - started;
        await recordAudit({ db, input, purpose: input.purpose, model: env.LLM_MODEL, ...usage, latencyMs, error: 'invalid_json' });
        if (input.repair) throw new LlmError('Gateway returned invalid JSON after repair', 'invalid_json');
        const repairPurpose = input.purpose === 'extract_text' || input.purpose === 'extract_vision'
          ? 'extract_repair'
          : 'classify_repair';
        return await callWithClient(openai, db, { ...input, purpose: repairPurpose, messages: makeRepairMessages(input.messages, raw, input.schema), repair: true });
      }
      const validated = input.schema.safeParse(parsed);
      const usage = {
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null,
      };
      const latencyMs = Date.now() - started;
      if (validated.success) {
        await recordAudit({ db, input, purpose: input.purpose, model: env.LLM_MODEL, ...usage, latencyMs, error: null });
        return { data: validated.data, usage, latencyMs };
      }
      await recordAudit({ db, input, purpose: input.purpose, model: env.LLM_MODEL, ...usage, latencyMs, error: 'invalid_json_shape' });
      if (input.repair) throw new LlmError('Gateway JSON tidak sesuai schema setelah repair', 'invalid_json');
      const repairPurpose = input.purpose === 'extract_text' || input.purpose === 'extract_vision'
          ? 'extract_repair'
          : 'classify_repair';
      return await callWithClient(openai, db, { ...input, purpose: repairPurpose, messages: makeRepairMessages(input.messages, raw, input.schema), repair: true });
    } catch (error) {
      lastError = error;
      const latencyMs = Date.now() - started;
      if (error instanceof LlmError && error.kind === 'invalid_json') throw error;
      const transient = isTransient(error);
      await recordAudit({ db, input, purpose: input.purpose, model: env.LLM_MODEL, promptTokens: null, completionTokens: null, latencyMs, error: safeErrorMessage(error) });
      if (!transient || attempt >= MAX_RETRIES) {
        throw new LlmError(safeErrorMessage(error), transient ? 'transient' : 'permanent', error);
      }
      attempt += 1;
    }
  }
  throw new LlmError(safeErrorMessage(lastError), 'transient', lastError);
}
