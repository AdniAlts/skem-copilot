/**
 * Pemuat data aturan dari `data/*.json`, divalidasi zod sekali saat modul dimuat.
 * Satu-satunya berkas di rules/ yang membaca disk; fungsi aturan lain menerima data sebagai argumen.
 */
import { readFileSync } from 'node:fs';
import {
  CreditTableSchema,
  GuidelineSectionsSchema,
  RulesSchema,
  type CreditTable,
  type GuidelineSections,
  type Rules,
} from '@skem/shared';

const DATA_DIR = new URL('../../../../data/', import.meta.url);

function loadJson(fileName: string): unknown {
  return JSON.parse(readFileSync(new URL(fileName, DATA_DIR), 'utf8'));
}

export const rules: Rules = RulesSchema.parse(loadJson('rules.json'));
export const creditTable: CreditTable = CreditTableSchema.parse(loadJson('credit_table.json'));
export const guidelineSections: GuidelineSections = GuidelineSectionsSchema.parse(
  loadJson('guideline_sections.json'),
);
