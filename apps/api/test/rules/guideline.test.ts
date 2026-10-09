import { CHECK_TYPE, GuidelineSectionsSchema, type GuidelineSections } from '@skem/shared';
import { describe, expect, it } from 'vitest';
import guidelineSectionsJson from '../../../../data/guideline_sections.json';
import {
  MAX_RELEVANT_SECTIONS,
  MAX_RELEVANT_TEXT_CHARS,
  getRelevantSections,
} from '../../src/rules/guideline';

function fixture(
  sections: Array<Partial<GuidelineSections['sections'][number]> & { id: string }>,
): GuidelineSections {
  return {
    version: 'test',
    sections: sections.map((s) => ({
      title: s.id,
      ref: 'hlm. 1',
      text: 'teks',
      tags: ['topic:lain'],
      ...s,
    })),
  };
}

const ids = (result: ReturnType<typeof getRelevantSections>) => result.sections.map((s) => s.id);

describe('getRelevantSections (fixture)', () => {
  it('mengurutkan berdasarkan jumlah tag cocok, lalu urutan file', () => {
    const data = fixture([
      { id: 'a', tags: ['check:level'] },
      { id: 'b', tags: ['check:level', 'topic:tingkat'] },
      { id: 'c', tags: ['check:level'] },
    ]);
    expect(ids(getRelevantSections(data, { tags: ['check:level', 'topic:tingkat'] }))).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it(`maksimal ${MAX_RELEVANT_SECTIONS} bagian`, () => {
    const data = fixture(['a', 'b', 'c', 'd'].map((id) => ({ id, tags: ['check:role'] })));
    expect(getRelevantSections(data, { tags: ['check:role'] }).sections).toHaveLength(
      MAX_RELEVANT_SECTIONS,
    );
  });

  it(`melewati bagian yang membuat total teks > ${MAX_RELEVANT_TEXT_CHARS} karakter`, () => {
    const data = fixture([
      { id: 'panjang', tags: ['check:role'], text: 'x'.repeat(1400) },
      { id: 'terlalu-panjang', tags: ['check:role'], text: 'x'.repeat(200) },
      { id: 'pendek', tags: ['check:role'], text: 'x'.repeat(50) },
    ]);
    expect(ids(getRelevantSections(data, { tags: ['check:role'] }))).toEqual(['panjang', 'pendek']);
  });

  it('memprioritaskan kategori yang cocok dan melewati kategori lain', () => {
    const data = fixture([
      { id: 'umum', tags: ['check:category'] },
      { id: 'k1', tags: ['check:category'], categoryCodes: ['K1-01'] },
      { id: 'k3b', tags: ['check:category'], categoryCodes: ['K3-B01'] },
    ]);
    expect(
      ids(getRelevantSections(data, { tags: ['check:category'], categoryCode: 'K3-B01' })),
    ).toEqual(['k3b', 'umum']);
  });

  it('mengembalikan daftar kosong jika tidak ada yang cocok', () => {
    const data = fixture([{ id: 'a', tags: ['check:level'] }]);
    expect(getRelevantSections(data, { tags: ['check:credit'] }).sections).toEqual([]);
  });

  it('tidak menyertakan tags atau categoryCodes di hasil', () => {
    const data = fixture([{ id: 'a', tags: ['check:level'], categoryCodes: ['K3-B01'] }]);
    expect(
      Object.keys(getRelevantSections(data, { tags: ['check:level'] }).sections[0] ?? {}),
    ).toEqual(['id', 'title', 'ref', 'text']);
  });
});

describe('getRelevantSections (data/guideline_sections.json)', () => {
  const data = GuidelineSectionsSchema.parse(guidelineSectionsJson);
  const totalChars = (result: ReturnType<typeof getRelevantSections>) =>
    result.sections.reduce((sum, s) => sum + s.text.length, 0);

  it('check:level → definisi Tingkat Kegiatan dan kesalahan umum 2', () => {
    const result = getRelevantSections(data, { tags: ['check:level'] });
    expect(ids(result)).toEqual(['istilah-tingkat-kegiatan', 'kesalahan-umum-2']);
    expect(totalChars(result)).toBeLessThanOrEqual(MAX_RELEVANT_TEXT_CHARS);
  });

  it('check:activity_name → kesalahan umum 3 (nama kegiatan disingkat)', () => {
    expect(ids(getRelevantSections(data, { tags: ['check:activity_name'] }))).toEqual([
      'kesalahan-umum-3',
    ]);
  });

  it('kategori K3-B01 → bagian Komponen 3 dan daftar bidang B, tanpa Komponen 1–2', () => {
    const result = getRelevantSections(data, {
      tags: ['check:category'],
      categoryCode: 'K3-B01',
    });
    expect(ids(result).slice(0, 2)).toEqual(['komponen-3', 'lampiran-bidang-b']);
    expect(ids(result)).not.toContain('komponen-1');
    expect(ids(result)).not.toContain('komponen-2');
    expect(totalChars(result)).toBeLessThanOrEqual(MAX_RELEVANT_TEXT_CHARS);
  });

  it('setiap check_type menghasilkan minimal satu bagian dalam batas karakter', () => {
    for (const checkType of CHECK_TYPE) {
      const result = getRelevantSections(data, { tags: [`check:${checkType}`] });
      expect(result.sections.length, checkType).toBeGreaterThan(0);
      expect(totalChars(result), checkType).toBeLessThanOrEqual(MAX_RELEVANT_TEXT_CHARS);
    }
  });
});
