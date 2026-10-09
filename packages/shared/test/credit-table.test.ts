import { describe, expect, it } from 'vitest';
import { CreditTableSchema, type CreditTableEntry } from '../src/index.js';
import creditTableJson from '../../../data/credit_table.json';

function entry(overrides: Partial<CreditTableEntry> = {}): CreditTableEntry {
  return {
    id: 'K3-B01-NAS-JUARA2',
    komponen: 3,
    bidang: 'B',
    categoryCode: 'K3-B01',
    categoryLabel: 'Lomba',
    level: 'Nasional',
    role: 'Juara II',
    credit: 1.1,
    basis: 'Sert / SK',
    ref: 'hlm. 27',
    ...overrides,
  };
}

describe('CreditTableSchema', () => {
  it('menolak id ganda', () => {
    const result = CreditTableSchema.safeParse({
      version: 'v',
      entries: [entry(), entry({ role: 'Juara I' })],
    });
    expect(result.success).toBe(false);
  });

  it('menolak kombinasi categoryCode + level + role ganda', () => {
    const result = CreditTableSchema.safeParse({
      version: 'v',
      entries: [entry(), entry({ id: 'LAIN' })],
    });
    expect(result.success).toBe(false);
  });

  it('mewajibkan bidang untuk komponen 3 dan null untuk komponen lain', () => {
    const k3TanpaBidang = CreditTableSchema.safeParse({
      version: 'v',
      entries: [entry({ bidang: null })],
    });
    const k1DenganBidang = CreditTableSchema.safeParse({
      version: 'v',
      entries: [entry({ komponen: 1, bidang: 'A' })],
    });
    expect(k3TanpaBidang.success).toBe(false);
    expect(k1DenganBidang.success).toBe(false);
  });

  it('menerima level dan role null', () => {
    const result = CreditTableSchema.safeParse({
      version: 'v',
      entries: [
        entry({ id: 'K3-D01', categoryCode: 'K3-D01', bidang: 'D', level: null, role: null }),
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('data/credit_table.json', () => {
  const table = CreditTableSchema.parse(creditTableJson);
  const count = (predicate: (e: CreditTableEntry) => boolean) =>
    table.entries.filter(predicate).length;
  const byId = (id: string) => table.entries.find((e) => e.id === id);

  it('memuat seluruh 182 baris Lampiran', () => {
    expect(table.entries).toHaveLength(182);
  });

  it('jumlah baris per komponen dan bidang sesuai Lampiran', () => {
    expect(count((e) => e.komponen === 1)).toBe(4);
    expect(count((e) => e.komponen === 2)).toBe(1);
    expect(count((e) => e.bidang === 'A')).toBe(42);
    expect(count((e) => e.bidang === 'B')).toBe(103);
    expect(count((e) => e.bidang === 'C')).toBe(27);
    expect(count((e) => e.bidang === 'D')).toBe(5);
  });

  it('nilai acuan cocok dengan Lampiran', () => {
    expect(byId('K1-01-PESERTA')?.credit).toBe(0.35);
    expect(byId('K3-A02-PRODI-ANGGOTA')?.credit).toBe(0.05);
    expect(byId('K3-B01-NAS-JUARA2')?.credit).toBe(1.1);
    expect(byId('K3-B07-NASS5S6-KETUA')?.credit).toBe(0.4);
    expect(byId('K3-B10-USAHAMANDIRI-ANGGOTA')?.basis).toBe('Laporan Bisnis');
    expect(byId('K3-C02-SEK')?.credit).toBe(0.2);
    expect(byId('K3-D01')?.basis).toBe('Sert / SK / Daftar Hadir');
  });

  it('setiap entri merujuk halaman Lampiran 25–33', () => {
    for (const e of table.entries) {
      const page = Number(e.ref.match(/hlm\. (\d+)$/)?.[1]);
      expect(page).toBeGreaterThanOrEqual(25);
      expect(page).toBeLessThanOrEqual(33);
    }
  });
});
