import type { Rules } from '@skem/shared';
import { describe, expect, it } from 'vitest';
import { checkDeadline } from '../../src/rules/deadline';

const DATE_RULES: Rules['dateRules'] = {
  minAngkatan: 2024,
  angkatan2024MinDate: '2024-01-01',
  angkatan2025PlusWindowYears: 1,
  studyStartMonthDay: '08-01',
};

const check = (activityEndDate: string, angkatan: number, today: string) =>
  checkDeadline({ activityEndDate, angkatan, today }, DATE_RULES);

describe('checkDeadline — angkatan 2024', () => {
  const TODAY = '2026-10-09';

  it('31 Des 2023 → fail', () => {
    expect(check('2023-12-31', 2024, TODAY).result).toBe('fail');
  });

  it('1 Jan 2024 → bukan fail (batas inklusif), rentang sejak 1 Jan 2024', () => {
    const r = check('2024-01-01', 2024, TODAY);
    expect(r.result).not.toBe('fail');
    expect(r.validFrom).toBe('2024-01-01');
    expect(r.validTo).toBe(TODAY);
  });

  it('kegiatan lama tetap sah selama ≥ 1 Jan 2024 (tanpa jendela 1 tahun)', () => {
    expect(check('2024-09-15', 2024, TODAY).result).toBe('pass');
  });
});

describe('checkDeadline — angkatan 2025+', () => {
  const TODAY = '2026-07-07';

  it('7 Jul 2025 → pass (batas bawah inklusif)', () => {
    const r = check('2025-07-07', 2025, TODAY);
    expect(r.result).not.toBe('fail');
    expect(r.validFrom).toBe('2025-07-07');
    expect(r.validTo).toBe('2026-07-07');
  });

  it('6 Jul 2025 → fail', () => {
    expect(check('2025-07-06', 2025, TODAY).result).toBe('fail');
  });

  it('7 Jul 2026 → pass (hari ini, inklusif)', () => {
    expect(check('2026-07-07', 2025, TODAY).result).toBe('pass');
  });

  it('8 Jul 2026 → fail (masa depan)', () => {
    expect(check('2026-07-08', 2025, TODAY).result).toBe('fail');
  });

  it('pesan fail menyebut tanggal dan rentang dalam format Indonesia', () => {
    expect(check('2025-05-03', 2025, TODAY).message).toBe(
      'Tanggal kegiatan 3 Mei 2025 di luar rentang yang berlaku untuk angkatan 2025 (7 Juli 2025 – 7 Juli 2026).',
    );
  });

  it('angkatan 2026 memakai aturan yang sama', () => {
    expect(check('2026-09-01', 2026, '2027-05-20').result).toBe('pass');
    expect(check('2026-05-19', 2026, '2027-05-20').result).toBe('fail');
  });

  it('29 Feb dikurangi 1 tahun → 28 Feb', () => {
    expect(check('2027-02-28', 2026, '2028-02-29').validFrom).toBe('2027-02-28');
  });
});

describe('checkDeadline — masa depan', () => {
  it.each([2024, 2025, 2026])('angkatan %i: tanggal setelah hari ini selalu fail', (angkatan) => {
    const r = check('2026-10-10', angkatan, '2026-10-09');
    expect(r.result).toBe('fail');
    expect(r.message).toContain('belum terjadi');
  });
});

describe('checkDeadline — sebelum perkiraan masa studi (opsi C)', () => {
  it('angkatan 2026: kegiatan Nov 2025 dalam jendela 1 tahun → warn, bukan fail', () => {
    const r = check('2025-11-10', 2026, '2026-10-01');
    expect(r.result).toBe('warn');
    expect(r.message).toContain('1 Agustus 2026');
  });

  it('angkatan 2024: kegiatan Mar 2024 → warn', () => {
    expect(check('2024-03-01', 2024, '2026-10-09').result).toBe('warn');
  });

  it('tepat di tanggal awal masa studi → pass', () => {
    expect(check('2026-08-01', 2026, '2026-10-01').result).toBe('pass');
  });
});

describe('checkDeadline — angkatan sebelum 2024', () => {
  it('fail dengan pesan jelas, tanpa rentang', () => {
    const r = check('2025-01-01', 2023, '2026-10-09');
    expect(r).toEqual({
      result: 'fail',
      validFrom: null,
      validTo: null,
      message: 'SKEM berlaku untuk angkatan 2024 dan setelahnya.',
    });
  });
});

describe('checkDeadline — input', () => {
  it('menolak format tanggal yang bukan YYYY-MM-DD', () => {
    expect(() => check('03/05/2025', 2025, '2026-07-07')).toThrow();
    expect(() => check('2025-02-30', 2025, '2026-07-07')).toThrow();
  });
});
