/** DocumentReader strategy tests. Gateway and Storage are injected; no external calls. */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ExtractedFieldsSchema } from '@skem/shared';
import { DocumentReader } from '../src/reader/index.js';

const extracted = ExtractedFieldsSchema.parse({
  document_kind: 'certificate',
  recipient_name: { value: 'Budi Santoso', confidence: 0.99 },
  activity_name: { value: 'Lomba Desain', confidence: 0.9 },
  activity_start_date: { value: '2026-08-20', confidence: 0.8 },
  activity_end_date: { value: '2026-08-20', confidence: 0.8 },
  organizer: { value: 'Himpunan Contoh', confidence: 0.8 },
  location_platform: { value: 'Surabaya', confidence: 0.7 },
  role_text: { value: 'Peserta', confidence: 0.8 },
  achievement_text: { value: 'Juara II', confidence: 0.9 },
  participant_scope_text: { value: null, confidence: 0 },
});

const schema = z.object({ ok: z.literal(true) });

describe('DocumentReader', () => {
  it('uses text strategy for a PDF with meaningful text', async () => {
    const reader = new DocumentReader({
      extractText: async () => extracted,
      extractVision: async () => { throw new Error('vision must not run'); },
      readCache: async () => null,
      writeCache: async () => undefined,
    });
    const result = await reader.read({ sha256: 'text-hash', pdf: Buffer.from('%PDF text') }, { submissionId: 1, runId: 2 });
    expect(result.strategy).toBe('text');
    expect(result.llmCalls).toBe(1);
    expect(result.fields).toEqual(extracted);
  });

  it('counts text extraction plus vision fallback as two model calls', async () => {
    const incomplete = ExtractedFieldsSchema.parse({
      ...extracted,
      recipient_name: { value: null, confidence: 0 },
    });
    const reader = new DocumentReader({
      extractText: async () => incomplete,
      extractVision: async () => extracted,
      readCache: async () => null,
      writeCache: async () => undefined,
    });
    const result = await reader.read({ sha256: 'fallback-hash', pdf: Buffer.from('%PDF fallback') }, { submissionId: 1, runId: 2 });
    expect(result.strategy).toBe('vision');
    expect(result.llmCalls).toBe(2);
  });

  it('uses vision strategy when text is empty', async () => {
    const reader = new DocumentReader({
      extractText: async () => null,
      extractVision: async () => extracted,
      readCache: async () => null,
      writeCache: async () => undefined,
    });
    const result = await reader.read({ sha256: 'scan-hash', pdf: Buffer.from('%PDF scan') }, { submissionId: 1, runId: 2 });
    expect(result.strategy).toBe('vision');
    expect(result.llmCalls).toBe(1);
  });

  it('uses cache and skips both extraction strategies', async () => {
    const reader = new DocumentReader({
      extractText: async () => { throw new Error('text must not run'); },
      extractVision: async () => { throw new Error('vision must not run'); },
      readCache: async () => extracted,
      writeCache: async () => undefined,
    });
    const result = await reader.read({ sha256: 'cached-hash', pdf: Buffer.from('%PDF cached') }, { submissionId: 1, runId: 2 });
    expect(result.strategy).toBe('cache');
    expect(result.llmCalls).toBe(0);
    expect(result.fields).toEqual(extracted);
  });
});

void schema;
