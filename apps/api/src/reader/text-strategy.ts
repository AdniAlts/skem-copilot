/** Extract text from first two PDF pages and request structured fields. */

import { extractText } from 'unpdf';
import { ExtractedFieldsSchema, type ExtractedFields } from '@skem/shared';
import { callLlm, type CallLlmResult } from '../llm/client.js';
import type { ReaderContext } from './index.js';

export const EXTRACT_PROMPT_VERSION = 'extract-v1';

export function extractionPrompt(text: string): string {
  return `Ekstrak field dari sertifikat berikut. Kembalikan JSON sesuai schema. Field yang tidak ditemukan harus bernilai null dengan confidence 0. Normalisasi tanggal ke YYYY-MM-DD. Jangan mengarang data.\n\n${text}`;
}

export async function extractTextFields(pdf: Buffer, context: ReaderContext): Promise<ExtractedFields> {
  const result = await extractText(pdf, { mergePages: false });
  const pages = result.text.slice(0, 2).join('\n').trim();
  if (pages.length < 200) throw new Error('PDF text layer tidak cukup; gunakan vision.');
  const response: CallLlmResult<ExtractedFields> = await callLlm({
    purpose: 'extract_text',
    submissionId: context.submissionId,
    runId: context.runId,
    promptVersion: EXTRACT_PROMPT_VERSION,
    messages: [
      { role: 'system', content: 'Jawab JSON saja. Jangan menghasilkan kredit.' },
      { role: 'user', content: extractionPrompt(pages) },
    ],
    schema: ExtractedFieldsSchema,
  });
  return response.data;
}
