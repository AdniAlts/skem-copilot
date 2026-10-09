/** Vision extraction strategy using the central LLM client. */

import { ExtractedFieldsSchema, type ExtractedFields } from '@skem/shared';
import { callLlm, type CallLlmResult } from '../llm/client.js';
import type { ReaderContext } from './index.js';
import { renderPdfPages } from './render.js';
import { EXTRACT_PROMPT_VERSION } from './text-strategy.js';
import { BUILD_EXTRACT_VISION_PROMPT } from '../agent/prompts/extract.js';

export async function extractVisionFields(pdf: Buffer, context: ReaderContext): Promise<ExtractedFields> {
  const pages = await renderPdfPages(pdf);
  const content = [
    { type: 'text' as const, text: BUILD_EXTRACT_VISION_PROMPT },
    ...pages.map((page) => ({ type: 'image_url' as const, image_url: { url: `data:image/png;base64,${page.toString('base64')}` } })),
  ];
  const response: CallLlmResult<ExtractedFields> = await callLlm({
    purpose: 'extract_vision',
    submissionId: context.submissionId,
    runId: context.runId,
    promptVersion: EXTRACT_PROMPT_VERSION,
    messages: [{ role: 'user', content }],
    schema: ExtractedFieldsSchema,
  });
  return response.data;
}
