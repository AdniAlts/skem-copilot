import { describe, expect, it } from 'vitest';
import { calculateEstimatedCredit } from './credit-calc';

describe('calculateEstimatedCredit', () => {
  it('menghitung kredit yang tepat untuk Juara II Lomba Nasional Komponen 3', () => {
    const result = calculateEstimatedCredit({
      komponen: 3,
      categoryCode: 'K3-B01',
      level: 'Nasional',
      role: 'Juara II',
    });

    expect(result.found).toBe(true);
    expect(result.credit).toBe(1.1);
    expect(result.entryId).toBe('K3-B01-NAS-JUARA2');
    expect(result.ref).toBeDefined();
  });

  it('menghitung kredit untuk kegiatan tanpa tingkat seperti LKMM Pra-TD (Komponen 1)', () => {
    const result = calculateEstimatedCredit({
      komponen: 1,
      categoryCode: 'K1-03',
      level: null,
      role: 'Peserta',
    });

    expect(result.found).toBe(true);
    expect(result.credit).toBe(0.3);
    expect(result.entryId).toBe('K1-03-PESERTA');
  });

  it('mengembalikan found: false jika kombinasi tidak ada pada tabel kredit', () => {
    const result = calculateEstimatedCredit({
      komponen: 3,
      categoryCode: 'K3-B01',
      level: 'Kecamatan', // level fiktif yang tidak ada di pedoman
      role: 'Peserta',
    });

    expect(result.found).toBe(false);
    expect(result.credit).toBeNull();
    expect(result.reason).toContain('tidak ditemukan pada tabel bobot SKEM');
  });

  it('mengembalikan found: false jika categoryCode kosong atau null', () => {
    const result = calculateEstimatedCredit({
      komponen: 3,
      categoryCode: null,
      level: 'Nasional',
      role: 'Juara I',
    });

    expect(result.found).toBe(false);
    expect(result.credit).toBeNull();
  });
});
