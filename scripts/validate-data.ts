// Validasi file data/*.json terhadap zod schema di @skem/shared.
// File baru (rules.json, answer_key.json) didaftarkan oleh issue masing-masing.
import { readFileSync } from 'node:fs';
import { CreditTableSchema, GuidelineSectionsSchema } from '@skem/shared';

// Tipe struktural agar skrip tidak mengimpor zod langsung (versi zod dikunci di @skem/shared).
type DataSchema = {
  safeParse(
    data: unknown,
  ):
    | { success: true }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
};

const DATA_FILES: { path: string; schema: DataSchema }[] = [
  { path: 'data/credit_table.json', schema: CreditTableSchema },
  { path: 'data/guideline_sections.json', schema: GuidelineSectionsSchema },
];

let failed = false;
for (const { path, schema } of DATA_FILES) {
  const result = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (result.success) {
    console.log(`OK    ${path}`);
    continue;
  }
  failed = true;
  console.error(`GAGAL ${path}`);
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
