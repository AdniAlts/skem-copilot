import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../src/eval/cli';

describe('parseArgs', () => {
  it('bawaan: split tuning, cache aktif', () => {
    expect(parseArgs([])).toEqual({ split: 'tuning', noCache: false });
  });

  it('menerima bentuk --opsi=nilai dan --opsi nilai', () => {
    expect(
      parseArgs(['--split=heldout', '--limit', '3', '--ids=c001, c002', '--no-cache']),
    ).toEqual({
      split: 'heldout',
      limit: 3,
      ids: ['c001', 'c002'],
      noCache: true,
    });
  });

  it('menolak split atau limit yang tidak valid', () => {
    expect(() => parseArgs(['--split=semua'])).toThrow();
    expect(() => parseArgs(['--limit=0'])).toThrow();
  });

  it('menolak argumen yang tidak dikenal', () => {
    expect(() => parseArgs(['--profile=baseline'])).toThrow('Argumen tidak dikenal');
  });
});
