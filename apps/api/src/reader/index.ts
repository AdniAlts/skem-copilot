/** DocumentReader: cache, text extraction, then vision fallback. */

import type { ExtractedFields } from '@skem/shared';
import { loadEnv } from '../env.js';
import { persistReaderRun, readExtractionCache, writeExtractionCache } from './cache.js';
import { extractTextFields } from './text-strategy.js';
import { extractVisionFields } from './vision-strategy.js';

export const READER_VERSION = 'reader-v1';
export type ReaderStrategy = 'text' | 'vision' | 'cache';

export type ReaderContext = { submissionId: number; runId: number };
export type ReaderResult = { strategy: ReaderStrategy; fields: ExtractedFields };

export type ReaderDependencies = {
  readCache: (sha256: string, readerVersion: string) => Promise<ExtractedFields | null>;
  writeCache: (sha256: string, readerVersion: string, fields: ExtractedFields) => Promise<void>;
  extractText: (pdf: Buffer, context: ReaderContext) => Promise<ExtractedFields | null>;
  extractVision: (pdf: Buffer, context: ReaderContext) => Promise<ExtractedFields>;
  persistRun?: (context: ReaderContext, strategy: ReaderStrategy, fields: ExtractedFields) => Promise<void>;
};

export class DocumentReader {
  constructor(private readonly dependencies: ReaderDependencies) {}

  async read(input: { sha256: string; pdf: Buffer }, context: ReaderContext): Promise<ReaderResult> {
    const cached = await this.dependencies.readCache(input.sha256, READER_VERSION);
    if (cached) {
      await this.dependencies.persistRun?.(context, 'cache', cached);
      return { strategy: 'cache', fields: cached };
    }

    const textFields = await this.dependencies.extractText(input.pdf, context);
    if (textFields && textFields.recipient_name.value && textFields.activity_name.value) {
      await this.dependencies.writeCache(input.sha256, READER_VERSION, textFields);
      await this.dependencies.persistRun?.(context, 'text', textFields);
      return { strategy: 'text', fields: textFields };
    }

    const visionFields = await this.dependencies.extractVision(input.pdf, context);
    await this.dependencies.writeCache(input.sha256, READER_VERSION, visionFields);
    await this.dependencies.persistRun?.(context, 'vision', visionFields);
    return { strategy: 'vision', fields: visionFields };
  }
}

export function createDocumentReader(): DocumentReader {
  const env = loadEnv();
  return new DocumentReader({
    readCache: readExtractionCache,
    writeCache: (sha256, version, fields) => writeExtractionCache(sha256, version, env.LLM_MODEL, fields),
    extractText: async (pdf, context) => {
      try {
        return await extractTextFields(pdf, context);
      } catch {
        return null;
      }
    },
    extractVision: extractVisionFields,
    persistRun: persistReaderRun,
  });
}
