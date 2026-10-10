import { describe, expect, it } from 'vitest';
import {
  effectiveCredit,
  parseCreditInput,
  queueClassNames,
  validateCreditAdjust,
} from './validator';

describe('parseCreditInput', () => {
  it('menerima koma maupun titik desimal', () => {
    expect(parseCreditInput('0,5')).toBe(0.5);
    expect(parseCreditInput(' 1.25 ')).toBe(1.25);
    expect(parseCreditInput('2')).toBe(2);
  });

  it('menolak teks yang bukan angka', () => {
    expect(parseCreditInput('')).toBeNull();
    expect(parseCreditInput('satu')).toBeNull();
    expect(parseCreditInput('-1')).toBeNull();
  });
});

describe('validateCreditAdjust', () => {
  it('valid jika angka 0–3, maks. dua desimal, berbeda dari sekarang, dan beralasan', () => {
    expect(validateCreditAdjust('0,5', 'Bukti tingkat provinsi.', 0.25)).toEqual({
      error: null,
      value: 0.5,
    });
  });

  it('menolak alasan kosong', () => {
    expect(validateCreditAdjust('0,5', '   ', 0.25).error).toBe(
      'Alasan perubahan kredit wajib diisi.',
    );
  });

  it('menolak nilai yang sama dengan kredit saat ini', () => {
    expect(validateCreditAdjust('0,25', 'Alasan', 0.25).error).toBe(
      'Kredit final sama dengan nilai saat ini.',
    );
  });

  it('menolak lebih dari dua desimal atau di atas 3', () => {
    expect(validateCreditAdjust('0,125', 'Alasan', 0.25).error).toBe(
      'Kredit maksimal dua desimal.',
    );
    expect(validateCreditAdjust('3,5', 'Alasan', 0.25).error).not.toBeNull();
    expect(validateCreditAdjust('abc', 'Alasan', 0.25).error).toBe(
      'Isi kredit final berupa angka, mis. 0,5.',
    );
  });
});

describe('effectiveCredit dan queueClassNames', () => {
  it('kredit hasil ubah Validator didahulukan dari estimasi', () => {
    expect(effectiveCredit({ estimatedCredit: 0.25, finalCredit: 0.5 })).toBe(0.5);
    expect(effectiveCredit({ estimatedCredit: 0.25, finalCredit: null })).toBe(0.25);
  });

  it('nama kelas unik dan terurut, tanpa nilai kosong', () => {
    const item = (className: string | null) =>
      ({ className }) as Parameters<typeof queueClassNames>[0][number];
    expect(
      queueClassNames([item('2 D3 IT B'), item(null), item('1 D3 IT A'), item('2 D3 IT B')]),
    ).toEqual(['1 D3 IT A', '2 D3 IT B']);
  });
});
