/**
 * LLM gateway tests use a local HTTP server and an in-memory usage recorder.
 * No real gateway, API key, or database is used, so they also run in CI.
 */

import { createServer, type Server } from 'node:http';
import OpenAI from 'openai';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  callWithClient,
  describeModels,
  modelForPurpose,
  resolveLlmModels,
  type CallLlmInput,
  type ChatMessage,
  type GatewayOptions,
  type LlmUsageRecord,
} from '../src/llm/client';

const ResultSchema = z.object({ ok: z.boolean(), text: z.string() });
const messages: ChatMessage[] = [{ role: 'user', content: 'test' }];
const MODEL = 'test-model';
const CLIENT_TIMEOUT_MS = 100;

type MockResponse = { status?: number; body: unknown; delayMs?: number };
const okBody = (text: string, usage = { prompt_tokens: 3, completion_tokens: 2 }) => ({
  choices: [{ message: { content: JSON.stringify({ ok: true, text }) } }],
  usage,
});

let server: Server;
let baseUrl: string;
let responses: MockResponse[];
let requests: Array<{ messages: ChatMessage[] }>;
let records: LlmUsageRecord[];

beforeEach(async () => {
  responses = [];
  requests = [];
  records = [];
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
    req.on('end', () => {
      requests.push(JSON.parse(raw) as { messages: ChatMessage[] });
      const next = responses.shift() ?? { body: okBody('ok') };
      setTimeout(() => {
        if (res.destroyed) return;
        res.writeHead(next.status ?? 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(next.body));
      }, next.delayMs ?? 0);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server address unavailable');
  baseUrl = `http://127.0.0.1:${address.port}/v1`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function client(): OpenAI {
  return new OpenAI({
    apiKey: 'test-key',
    baseURL: baseUrl,
    maxRetries: 0,
    timeout: CLIENT_TIMEOUT_MS,
  });
}

const options: GatewayOptions = {
  model: MODEL,
  retryDelayMs: 0,
  recordUsage: async (record) => {
    records.push(record);
  },
};

type TestInput = CallLlmInput<z.infer<typeof ResultSchema>>;

function input(overrides: Partial<TestInput> = {}): TestInput {
  return {
    purpose: 'extract_text',
    submissionId: null,
    runId: null,
    promptVersion: 'test-v1',
    messages,
    schema: ResultSchema,
    ...overrides,
  };
}

describe('callWithClient', () => {
  it('parses JSON and records usage metadata only', async () => {
    const result = await callWithClient(client(), input(), options);
    expect(result.data).toEqual({ ok: true, text: 'ok' });
    expect(result.usage).toEqual({ promptTokens: 3, completionTokens: 2 });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      purpose: 'extract_text',
      model: MODEL,
      promptVersion: 'test-v1',
      promptTokens: 3,
      completionTokens: 2,
      totalTokens: 5,
      error: null,
    });
    expect(JSON.stringify(records)).not.toContain('"ok":true');
  });

  it('retries transient 429 once and succeeds', async () => {
    responses.push(
      { status: 429, body: { error: { message: 'rate limit' } } },
      { body: okBody('retry', { prompt_tokens: 4, completion_tokens: 1 }) },
    );
    const result = await callWithClient(client(), input(), options);
    expect(result.data.text).toBe('retry');
    expect(records.map((r) => r.error)).toEqual(['Gateway 429', null]);
  });

  it('retries a gateway timeout (connection error without HTTP status) once', async () => {
    responses.push(
      { body: okBody('late'), delayMs: CLIENT_TIMEOUT_MS * 5 },
      { body: okBody('fast') },
    );
    const result = await callWithClient(client(), input(), options);
    expect(result.data.text).toBe('fast');
    expect(records.map((r) => r.error)).toEqual(['Gateway timeout', null]);
  });

  it('gives up after one retry with a transient error', async () => {
    responses.push(
      { status: 503, body: { error: { message: 'down' } } },
      { status: 503, body: { error: { message: 'down' } } },
    );
    await expect(callWithClient(client(), input(), options)).rejects.toMatchObject({
      kind: 'transient',
    });
    expect(requests).toHaveLength(2);
  });

  it('does not retry permanent 400 errors', async () => {
    responses.push({ status: 400, body: { error: { message: 'bad request' } } });
    await expect(callWithClient(client(), input(), options)).rejects.toMatchObject({
      kind: 'permanent',
    });
    expect(requests).toHaveLength(1);
    expect(records).toHaveLength(1);
  });

  it('repairs invalid JSON once and validates repaired result', async () => {
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { body: okBody('repaired') },
    );
    const result = await callWithClient(client(), input(), options);
    expect(result.data.text).toBe('repaired');
    expect(records.map((r) => [r.purpose, r.error])).toEqual([
      ['extract_text', 'invalid_json'],
      ['extract_repair', null],
    ]);
  });

  it('repair prompt does not resend user content or images', async () => {
    const image = 'data:image/png;base64,SECRETIMAGEDATA';
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { body: okBody('fixed') },
    );
    await callWithClient(
      client(),
      input({
        purpose: 'extract_vision',
        messages: [
          { role: 'system', content: 'Schema: {ok:boolean,text:string}' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'isi sertifikat rahasia' },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
      options,
    );
    const repairRequest = JSON.stringify(requests[1]);
    expect(repairRequest).not.toContain('SECRETIMAGEDATA');
    expect(repairRequest).not.toContain('isi sertifikat rahasia');
    expect(repairRequest).toContain('Schema: {ok:boolean,text:string}');
  });

  it('repair prompt carries validation errors of the actual JSON', async () => {
    responses.push(
      { body: { choices: [{ message: { content: '{"ok":"yes"}' } }] } },
      { body: okBody('fixed') },
    );
    await callWithClient(client(), input(), options);
    const repairUser = requests[1]?.messages.find((m) => m.role === 'user');
    const payload = JSON.parse(String(repairUser?.content)) as {
      validationErrors: Array<{ path: string }>;
    };
    expect(payload.validationErrors.map((e) => e.path).sort()).toEqual(['ok', 'text']);
    expect(records[0]?.error).toBe('invalid_json_shape');
  });

  it('a transient failure during repair is recorded once and does not re-send the original', async () => {
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { status: 500, body: { error: { message: 'boom' } } },
      { status: 500, body: { error: { message: 'boom' } } },
    );
    await expect(callWithClient(client(), input(), options)).rejects.toMatchObject({
      kind: 'transient',
    });
    expect(requests).toHaveLength(3);
    expect(records.map((r) => [r.purpose, r.error])).toEqual([
      ['extract_text', 'invalid_json'],
      ['extract_repair', 'Gateway 500'],
      ['extract_repair', 'Gateway 500'],
    ]);
  });

  it('fails as invalid_json after repair also returns invalid JSON', async () => {
    responses.push(
      { body: { choices: [{ message: { content: 'not-json' } }] } },
      { body: { choices: [{ message: { content: 'still-not-json' } }] } },
    );
    await expect(callWithClient(client(), input(), options)).rejects.toMatchObject({
      kind: 'invalid_json',
    });
  });

  it('records token usage for an empty response', async () => {
    responses.push({
      body: {
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 7, completion_tokens: 0 },
      },
    });
    await expect(callWithClient(client(), input(), options)).rejects.toMatchObject({
      kind: 'permanent',
    });
    expect(records[0]).toMatchObject({ promptTokens: 7, error: 'empty_response' });
  });

  it('supports image_url content', async () => {
    const result = await callWithClient(
      client(),
      input({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'read' },
              { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } },
            ],
          },
        ],
      }),
      options,
    );
    expect(result.data.ok).toBe(true);
    expect(requests[0]?.messages[0]?.content).toEqual([
      { type: 'text', text: 'read' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } },
    ]);
  });
});

describe('pemilihan model per tugas', () => {
  const models = resolveLlmModels({
    LLM_MODEL: 'deepseek-v4.1-flash',
    LLM_VISION_MODEL: 'gpt-5.6-luna',
  });

  it('hanya extract_vision memakai model vision', () => {
    expect(modelForPurpose('extract_vision', models)).toBe('gpt-5.6-luna');
    for (const purpose of [
      'extract_text',
      'extract_repair',
      'classify',
      'classify_repair',
    ] as const) {
      expect(modelForPurpose(purpose, models)).toBe('deepseek-v4.1-flash');
    }
  });

  it('LLM_VISION_MODEL kosong → vision memakai LLM_MODEL', () => {
    expect(resolveLlmModels({ LLM_MODEL: 'deepseek-v4.1-flash' })).toEqual({
      text: 'deepseek-v4.1-flash',
      vision: 'deepseek-v4.1-flash',
    });
  });

  it('label model untuk precheck_runs', () => {
    expect(describeModels(models)).toBe('deepseek-v4.1-flash + vision gpt-5.6-luna');
    expect(describeModels({ text: 'x', vision: 'x' })).toBe('x');
  });
});
