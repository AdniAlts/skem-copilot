/** Manual DocumentReader smoke script. Prints strategy and field names only. */

import { readFile } from 'node:fs/promises';
import { createDocumentReader } from '../apps/api/src/reader/index.js';
import { closeLlmGateway } from '../apps/api/src/llm/client.js';

const path = process.argv[2];
if (!path) throw new Error('Usage: npx tsx scripts/read-one.ts path/to/file.pdf');

const pdf = await readFile(path);
const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pdf)))
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');
const result = await createDocumentReader().read({ sha256, pdf }, { submissionId: 0, runId: 0 });
console.log(JSON.stringify({ strategy: result.strategy, fields: Object.keys(result.fields) }));
await closeLlmGateway();
