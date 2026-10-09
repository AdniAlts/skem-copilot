// Validasi file data/*.json terhadap zod schema di @skem/shared.
// Daftarkan file data baru di DATA_FILES.
import { existsSync, readFileSync } from 'node:fs';
import {
  AnswerKeySchema,
  CreditTableSchema,
  GuidelineSectionsSchema,
  RulesSchema,
} from '@skem/shared';

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
  { path: 'data/rules.json', schema: RulesSchema },
  { path: 'data/testset/answer_key.json', schema: AnswerKeySchema },
];

let failed = false;
for (const { path, schema } of DATA_FILES) {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    failed = true;
    console.error(`GAGAL ${path}`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    continue;
  }

  // Validasi tambahan khusus answer_key.json: pastikan file fisik kasus ada di data/testset/
  if (path === 'data/testset/answer_key.json') {
    const answerKey = parsed as { cases: { file: string }[] };
    let missingFiles = false;
    for (const testCase of answerKey.cases) {
      const casePath = `data/testset/${testCase.file}`;
      if (!existsSync(casePath)) {
        failed = true;
        missingFiles = true;
        console.error(`GAGAL ${path}: file kasus fisik tidak ditemukan: ${casePath}`);
      }
    }
    if (missingFiles) {
      continue;
    }
  }

  console.log(`OK    ${path}`);
}

process.exitCode = failed ? 1 : 0;
