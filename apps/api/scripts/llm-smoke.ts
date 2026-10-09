/**
 * Manual LLM smoke test against the real gateway (uses team token quota).
 * Uses the production wrapper; never prints the raw prompt or response.
 *
 *   npx tsx --env-file=.env apps/api/scripts/llm-smoke.ts [path/to/image.png]
 */

import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { callLlm, closeLlmGateway, type ChatMessage } from '../src/llm/client.js';

const SmokeSchema = z.object({ ok: z.boolean(), text: z.string() });
const imagePath = process.argv[2];

const content: ChatMessage['content'] = imagePath
  ? [
      {
        type: 'text',
        text: 'Baca dokumen ini. Jawab JSON {"ok":true,"text":"<ringkasan singkat>"}.',
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${(await readFile(imagePath)).toString('base64')}`,
        },
      },
    ]
  : 'Jawab JSON {"ok":true,"text":"gateway aktif"}.';

try {
  const result = await callLlm({
    purpose: imagePath ? 'extract_vision' : 'extract_text',
    submissionId: null,
    runId: null,
    promptVersion: 'smoke-v1',
    messages: [{ role: 'user', content }],
    schema: SmokeSchema,
  });
  console.log(
    JSON.stringify({ ok: result.data.ok, latencyMs: result.latencyMs, usage: result.usage }),
  );
} finally {
  await closeLlmGateway();
}
