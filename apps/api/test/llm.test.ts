/**
 * LLM gateway tests use a local HTTP server. No real gateway or API key is used.
 */

import { createServer, type Server } from 'node:http';
import OpenAI from 'openai';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { callWithClient, LlmError, type ChatMessage } from '../src/llm/client';
import { createDb } from '../src/db/client';
import { llmCalls } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const ResultSchema = z.object({ ok: z.boolean(), text: z.string() });
const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
let server: Server;
let baseUrl: string;
let responses: Array<{ status?: number; body: unknown }>;

beforeEach(async () => {
  responses = [];
  server = createServer(async (_req, res) => {
    const next = responses.shift() ?? { body: { choices: [{ message: { content: JSON.stringify({ ok: true, text: 'ok' }) } }], usage: { prompt_tokens: 3, completion_tokens: 2 } } };
    const body = JSON.stringify(next.body);
    res.writeHead(next.status ?? 200, { 'content-type': 'application/json' });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server address unavailable');
  baseUrl = `http://127.0.0.1:${address.port}/v1`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function client(): OpenAI {
  return new OpenAI({ apiKey: 'test-key', baseURL: baseUrl, maxRetries: 0 });
}

function input(promptVersion: string) {
  return {
    purpose: 'extract_text' as const,
    submissionId: null,
    runId: null,
    promptVersion,
    messages,
    schema: ResultSchema,
  };
}

async function dbForTest() {
  return createDb();
}

describe('callWithClient', () => {
  it('parses JSON and records usage metadata', async () => {
    const { client: connection, db } = await dbForTest();
    const requestInput = input(`test-success-${Date.now()}`);
    const result = await callWithClient(client(), db, requestInput);
    expect(result.data).toEqual({ ok: true, text: 'ok' });
    expect(result.usage).toEqual({ promptTokens: 3, completionTokens: 2 });
    const rows = await db.select().from(llmCalls).where(eq(llmCalls.promptVersion, requestInput.promptVersion));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalTokens).toBe(5);
    await connection.end();
  });

  it('retries transient 429 once and succeeds', async () => {
    responses.push(
      { status: 429, body: { error: { message: 'rate limit' } } },
      { body: { choices: [{ message: { content: '{"ok":true,"text":"retry"}' } }], usage: { prompt_tokens: 4, completion_tokens: 1 } } },
    );
    const { client: connection, db } = await dbForTest();
    const requestInput = input(`test-retry-${Date.now()}`);
    const result = await callWithClient(client(), db, requestInput);
    expect(result.data.text).toBe('retry');
    const rows = await db.select().from(llmCalls).where(eq(llmCalls.promptVersion, requestInput.promptVersion));
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.error === null)).toBe(true);
    await connection.end();
  });

  it('repairs invalid JSON once and validates repaired result', async () => {
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { body: { choices: [{ message: { content: '{"ok":true,"text":"repaired"}' } }] } },
    );
    const { client: connection, db } = await dbForTest();
    const requestInput = input(`test-repair-${Date.now()}`);
    const result = await callWithClient(client(), db, requestInput);
    expect(result.data.text).toBe('repaired');
    const rows = await db.select().from(llmCalls).where(eq(llmCalls.promptVersion, requestInput.promptVersion));
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.purpose)).toEqual(['extract_text', 'extract_repair']);
    await connection.end();
  });

  it('supports image_url content', async () => {
    const { client: connection, db } = await dbForTest();
    const imageInput = { ...input(`test-image-${Date.now()}`), messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'read' }, { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,AA==' } }] }] };
    const result = await callWithClient(client(), db, imageInput);
    expect(result.data.ok).toBe(true);
    await connection.end();
  });

  it('fails as invalid_json after repair also returns invalid JSON', async () => {
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { body: { choices: [{ message: { content: 'still-not-json' } }] } },
    );
    const { client: connection, db } = await dbForTest();
    const requestInput = input(`test-invalid-${Date.now()}`);
    await expect(callWithClient(client(), db, requestInput)).rejects.toMatchObject({ kind: 'invalid_json' } satisfies Partial<LlmError>);
    await connection.end();
  });

  it('does not retry permanent 400 errors', async () => {
    responses.push({ status: 400, body: { error: { message: 'bad request' } } });
    const { client: connection, db } = await dbForTest();
    const requestInput = input(`test-permanent-${Date.now()}`);
    await expect(callWithClient(client(), db, requestInput)).rejects.toMatchObject({ kind: 'permanent' } satisfies Partial<LlmError>);
    const rows = await db.select().from(llmCalls).where(eq(llmCalls.promptVersion, requestInput.promptVersion));
    expect(rows).toHaveLength(1);
    await connection.end();
  });
});
