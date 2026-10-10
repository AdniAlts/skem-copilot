import { describe, expect, it } from 'vitest';
import { summarizeProgress } from '../../src/rules/progress';

const earned = (k1: number, k2: number, k3: number) =>
  new Map([
    [1, k1],
    [2, k2],
    [3, k3],
  ]);

describe('summarizeProgress', () => {
  it('memakai target Pedoman: K1 1,25, K2 0,5, K3 1,25, total 3,0', () => {
    const progress = summarizeProgress(new Map());
    expect(progress.komponen).toEqual([
      { komponen: 1, target: 1.25, earned: 0 },
      { komponen: 2, target: 0.5, earned: 0 },
      { komponen: 3, target: 1.25, earned: 0 },
    ]);
    expect(progress.total).toBe(0);
    expect(progress.target).toBe(3);
    expect(progress.fulfilled).toBe(false);
  });

  it('terpenuhi jika ketiga komponen mencapai target', () => {
    expect(summarizeProgress(earned(1.25, 0.5, 1.25)).fulfilled).toBe(true);
    expect(summarizeProgress(earned(1.25, 0.5, 2)).fulfilled).toBe(true);
  });

  it('total ≥ 3,0 tetapi Komponen 2 kurang → belum terpenuhi (K3 tidak menggantikan)', () => {
    const progress = summarizeProgress(earned(1.25, 0, 2));
    expect(progress.total).toBe(3.25);
    expect(progress.fulfilled).toBe(false);
  });

  it('total ≥ 3,0 tetapi Komponen 1 kurang → belum terpenuhi', () => {
    expect(summarizeProgress(earned(0.9, 0.5, 1.75)).fulfilled).toBe(false);
  });

  it('Komponen 3 di bawah 1,25 → belum terpenuhi walau K1 dan K2 lengkap', () => {
    expect(summarizeProgress(earned(1.25, 0.5, 1.0)).fulfilled).toBe(false);
  });

  it('membulatkan ke 2 desimal agar tidak muncul sisa floating point', () => {
    const progress = summarizeProgress(earned(0.1 + 0.2, 0, 0));
    expect(progress.komponen[0]?.earned).toBe(0.3);
    expect(progress.total).toBe(0.3);
  });

  it('target tepat terpenuhi walau penjumlahan menghasilkan sisa floating point', () => {
    // 0.35 + 0.2 + 0.3 + 0.4 = 1.2499999999999998 tanpa pembulatan
    expect(summarizeProgress(earned(0.35 + 0.2 + 0.3 + 0.4, 0.5, 1.25)).fulfilled).toBe(true);
  });
});
