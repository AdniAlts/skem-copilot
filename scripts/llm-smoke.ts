/** Manual LLM smoke test. Uses the production wrapper; never prints raw prompt/response. */

import { readFile } from 'node:fs/promises';
import { z } from '../apps/api/node_modules/zod/index.js';

import { callLlm } from '../apps/api/src/llm/client.js';

type SmokeResult = { ok: boolean; text: string };
const SmokeSchema = z.object({ ok: z.boolean(), text: z.string() }) as unknown as Parameters<
  typeof callLlm<SmokeResult>
>[0]['schema'];
const imagePath = process.argv[2];
const content = imagePath
  ? [
      { type: 'text' as const, text: 'Baca dokumen ini. Jawab JSON singkat.' },
      { type: 'image_url' as const, image_url: { url: `data:image/png;base64,${(await readFile(imagePath)).toString('base64')}` } },
    ]
  : 'Jawab JSON {"ok":true,"text":"gateway aktif"}.';

const result = await callLlm<SmokeResult>({
  purpose: imagePath ? 'extract_vision' : 'extract_text',
  submissionId: null,
  runId: null,
  promptVersion: 'smoke-v1',
  messages: [{ role: 'user', content }],
  schema: SmokeSchema,
});

console.log(JSON.stringify({ ok: result.data.ok, latencyMs: result.latencyMs, usage: result.usage }));
