/** Extraction cache and precheck run persistence adapters. */

import { and, eq } from 'drizzle-orm';
import { ExtractedFieldsSchema, type ExtractedFields } from '@skem/shared';
import { createDb } from '../db/client.js';
import { extractionCache, precheckRuns } from '../db/schema.js';
import type { ReaderStrategy } from './index.js';

export async function readExtractionCache(sha256: string, readerVersion: string): Promise<ExtractedFields | null> {
  const { client, db } = createDb();
  try {
    const row = (await db.select({ result: extractionCache.result }).from(extractionCache).where(and(eq(extractionCache.sha256, sha256), eq(extractionCache.readerVersion, readerVersion))).limit(1))[0];
    if (!row) return null;
    const parsed = ExtractedFieldsSchema.safeParse(row.result);
    return parsed.success ? parsed.data : null;
  } finally {
    await client.end();
  }
}

export async function writeExtractionCache(sha256: string, readerVersion: string, model: string, result: ExtractedFields): Promise<void> {
  const { client, db } = createDb();
  try {
    await db.insert(extractionCache).values({ sha256, readerVersion, model, result }).onConflictDoUpdate({ target: [extractionCache.sha256, extractionCache.readerVersion], set: { model, result, createdAt: new Date() } });
  } finally {
    await client.end();
  }
}

export async function persistReaderRun(context: { runId: number }, strategy: ReaderStrategy, fields: ExtractedFields): Promise<void> {
  const { client, db } = createDb();
  try {
    await db.update(precheckRuns).set({ readerStrategy: strategy, extracted: fields }).where(eq(precheckRuns.id, context.runId));
  } finally {
    await client.end();
  }
}
