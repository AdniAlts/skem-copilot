import { describe, expect, it } from 'vitest';
import { CHECK_TYPE, GuidelineSectionsSchema, type GuidelineSectionEntry } from '../src/index.js';
import guidelineSectionsJson from '../../../data/guideline_sections.json';

function section(overrides: Partial<GuidelineSectionEntry> = {}): GuidelineSectionEntry {
  return {
    id: 'kesalahan-umum-2',
    title: 'Salah menentukan tingkat',
    ref: 'hlm. 20',
    text: 'Tingkat kegiatan ditentukan berdasarkan lingkup peserta.',
    tags: ['check:level'],
    ...overrides,
  };
}

const parse = (sections: GuidelineSectionEntry[]) =>
  GuidelineSectionsSchema.safeParse({ version: 'v', sections });

describe('GuidelineSectionsSchema', () => {
  it('menolak id ganda', () => {
    expect(parse([section(), section({ title: 'Lain' })]).success).toBe(false);
  });

  it('menolak tag check yang bukan CHECK_TYPE', () => {
    expect(parse([section({ tags: ['check:levle'] })]).success).toBe(false);
  });

  it('menolak tag tanpa awalan check: atau topic:', () => {
    expect(parse([section({ tags: ['category:K3-B01'] })]).success).toBe(false);
  });

  it('menolak id yang bukan kebab-case', () => {
    expect(parse([section({ id: 'Kesalahan_Umum' })]).success).toBe(false);
  });

  it('menerima tag topic dan categoryCodes', () => {
    const result = parse([section({ tags: ['topic:bidang-b'], categoryCodes: ['K3-B01'] })]);
    expect(result.success).toBe(true);
  });
});

describe('data/guideline_sections.json', () => {
  const data = GuidelineSectionsSchema.parse(guidelineSectionsJson);
  const tags = new Set(data.sections.flatMap((s) => s.tags));

  it('setiap check_type punya minimal satu bagian', () => {
    for (const checkType of CHECK_TYPE) {
      expect(tags.has(`check:${checkType}`), checkType).toBe(true);
    }
  });

  it('setiap bagian merujuk halaman Pedoman', () => {
    for (const s of data.sections) {
      expect(s.ref, s.id).toMatch(/hlm\. \d+(–\d+)?$/);
    }
  });

  it('memuat lima kesalahan umum Pedoman', () => {
    const ids = data.sections.map((s) => s.id);
    for (let n = 1; n <= 5; n++) {
      expect(ids).toContain(`kesalahan-umum-${n}`);
    }
  });
});
