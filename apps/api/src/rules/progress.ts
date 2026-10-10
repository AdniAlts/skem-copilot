import type { Progress } from '@skem/shared';

/** Target per komponen (Pedoman, C. Struktur SKEM; PRD FR-3). Semua komponen wajib. */
export const COMPONENT_TARGETS = [
  { komponen: 1, target: 1.25 },
  { komponen: 2, target: 0.5 },
  { komponen: 3, target: 1.25 },
] as const;
export const TOTAL_TARGET = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ringkasan progres kredit dari kredit final yang sudah disetujui per komponen.
 * Terpenuhi hanya jika total ≥ 3,0 DAN setiap komponen mencapai targetnya:
 * Komponen 1 dan 2 tidak dapat digantikan Komponen 3.
 */
export function summarizeProgress(earnedByComponent: ReadonlyMap<number, number>): Progress {
  const komponen = COMPONENT_TARGETS.map(({ komponen, target }) => ({
    komponen,
    target,
    earned: round2(earnedByComponent.get(komponen) ?? 0),
  }));
  const total = round2(komponen.reduce((sum, row) => sum + row.earned, 0));
  const fulfilled = total >= TOTAL_TARGET && komponen.every((row) => row.earned >= row.target);
  return { komponen, total, target: TOTAL_TARGET, fulfilled };
}
