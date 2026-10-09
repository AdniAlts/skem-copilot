import { describe, expect, it } from 'vitest';
import { jaroWinkler, matchName, normalizeName } from '../../src/rules/name-match';

const WARN_MIN = 0.8;
const match = (certificateName: string, accountName: string) =>
  matchName({ certificateName, accountName }, { warnMin: WARN_MIN });

describe('normalizeName', () => {
  it('membuang gelar, tanda baca, dan kapital', () => {
    expect(normalizeName('Dr. Ir. Budi Santoso, S.T., M.Kom.')).toBe('budi santoso');
    expect(normalizeName('BUDI  SANTOSO S.T.')).toBe('budi santoso');
  });

  it('mempertahankan inisial satu huruf', () => {
    expect(normalizeName('M. Rizki')).toBe('m rizki');
  });
});

describe('jaroWinkler', () => {
  it('1 untuk string sama, 0 untuk string kosong', () => {
    expect(jaroWinkler('santoso', 'santoso')).toBe(1);
    expect(jaroWinkler('', 'santoso')).toBe(0);
  });

  it('nilai acuan MARTHA/MARHTA ≈ 0,961', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 3);
  });
});

describe('matchName — pass', () => {
  it.each([
    ['Budi Santoso', 'Budi Santoso'],
    ['budi santoso', 'Budi Santoso'],
    ['BUDI SANTOSO', 'Budi Santoso'],
    ['Budi Santoso, S.T.', 'Budi Santoso'],
    ['Dr. Budi Santoso', 'Budi Santoso'],
  ])('%s vs %s', (cert, account) => {
    expect(match(cert, account)).toEqual({ result: 'pass', score: 1 });
  });
});

describe('matchName — warn', () => {
  it.each([
    ['Budi Santosa', 'Budi Santoso'], // beda satu huruf
    ['Rizki Pratama', 'Rizky Pratama'], // test set c003
    ['Budi Santoso', 'Budi Agus Santoso'], // nama tengah hilang
    ['M. Rizki', 'Muhammad Rizki'], // singkatan
  ])('%s vs %s', (cert, account) => {
    const r = match(cert, account);
    expect(r.result).toBe('warn');
    expect(r.score).toBeGreaterThanOrEqual(WARN_MIN);
    expect(r.score).toBeLessThan(1);
  });
});

describe('matchName — fail', () => {
  it.each([
    ['Nisa Rahma', 'Budi Santoso'],
    ['Nisa Rahma', 'Ahmad Fauzi'], // test set c002
    ['Muhammad Ilham', 'Muhammad Rizki'], // nama depan sama, orang berbeda
  ])('%s vs %s', (cert, account) => {
    const r = match(cert, account);
    expect(r.result).toBe('fail');
    expect(r.score).toBeLessThan(WARN_MIN);
  });

  it('nama kosong setelah normalisasi → fail skor 0', () => {
    expect(match('', 'Budi Santoso')).toEqual({ result: 'fail', score: 0 });
  });
});
