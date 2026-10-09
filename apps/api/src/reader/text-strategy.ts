/** Extract text from first two PDF pages and request structured fields. */

import { extractText } from 'unpdf';
import { ExtractedFieldsSchema, type ExtractedFields } from '@skem/shared';
import { callLlm, type CallLlmResult } from '../llm/client.js';
import type { ReaderContext } from './index.js';
import { buildExtractTextPrompt, EXTRACT_PROMPT_VERSION, EXTRACT_SYSTEM_PROMPT } from '../agent/prompts/extract.js';

export { EXTRACT_PROMPT_VERSION };

export function extractionPrompt(text: string): string {
  return `${buildExtractTextPrompt(text)}\n\n${EXTRACT_SYSTEM_PROMPT}`;
}

export async function extractTextFields(pdf: Buffer, context: ReaderContext): Promise<ExtractedFields | null> {
  const result = await extractText(new Uint8Array(pdf), { mergePages: false });
  const pages = result.text.slice(0, 2).join('\n').trim();
  if (pages.length < 200) return null;
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
