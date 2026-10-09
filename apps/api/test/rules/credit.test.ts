import { describe, expect, it } from 'vitest';
import { lookupCreditTable } from '../../src/rules/credit';
import { creditTable } from '../../src/rules/config';

const lookup = (input: Parameters<typeof lookupCreditTable>[1]) =>
  lookupCreditTable(creditTable, input);

describe('lookupCreditTable', () => {
  it('kombinasi ada → kredit, id entri, dan rujukan dari tabel', () => {
    expect(
      lookup({ komponen: 3, categoryCode: 'K3-B01', level: 'Nasional', role: 'Juara II' }),
    ).toEqual({
      found: true,
      entryId: 'K3-B01-NAS-JUARA2',
      credit: 1.1,
      ref: 'Pedoman SKEM, Lampiran Daftar Kegiatan SKEM PENS, hlm. 27',
    });
  });

  it('tingkat null dicocokkan persis (Komponen 1)', () => {
    const r = lookup({ komponen: 1, categoryCode: 'K1-03', level: null, role: 'Peserta' });
    expect(r).toMatchObject({ found: true, entryId: 'K1-03-PESERTA', credit: 0.3 });
  });

  it('tingkat dan peran null dicocokkan persis (bidang D)', () => {
    const r = lookup({ komponen: 3, categoryCode: 'K3-D01', level: null, role: null });
    expect(r).toMatchObject({ found: true, entryId: 'K3-D01', credit: 0.1 });
  });

  it('null bukan wildcard: K1-03 dengan tingkat terisi → tidak ditemukan', () => {
    expect(
      lookup({ komponen: 1, categoryCode: 'K1-03', level: 'Nasional', role: 'Peserta' }),
    ).toEqual({ found: false, reason: 'COMBINATION_NOT_FOUND' });
  });

  it('kombinasi tidak ada (test set c006: Pelatih tingkat Internasional) → found false tanpa angka', () => {
    const r = lookup({ komponen: 3, categoryCode: 'K3-C02', level: 'Internasional', role: null });
    expect(r).toEqual({ found: false, reason: 'COMBINATION_NOT_FOUND' });
    expect(r).not.toHaveProperty('credit');
  });

  it('komponen tidak cocok dengan kategori → tidak ditemukan', () => {
    expect(
      lookup({ komponen: 2, categoryCode: 'K3-B01', level: 'Nasional', role: 'Juara II' }).found,
    ).toBe(false);
  });
});
