/** Deterministic recheck tests; must not invoke LLM. */

import { describe, expect, it } from 'vitest';
import { recheck } from '../../src/rules/recheck.js';
import { creditTable, guidelineSections, rules } from '../../src/rules/config.js';

const deps = { rules, creditTable, guidelineSections };

describe('recheck', () => {
  it('maps national participant scope to the official level and credit entry', () => {
    const result = recheck({
      documentKind: 'certificate', recipientName: 'Budi Santoso', accountName: 'Budi Santoso', angkatan: 2025,
      activityName: 'Juara II Lomba Karya Ilmiah', activityEndDate: '2026-09-01', komponen: 3,
      categoryCode: 'K3-B01', level: null, role: 'Juara II', achievement: 'Juara II',
      answers: { participant_scope: 'national' }, today: '2026-10-09',
    }, deps);

    expect(result.reviewStatus).toBe('ready');
    expect(result.level).toBe('Nasional');
    expect(result.creditEntryId).toBe('K3-B01-NAS-JUARA2');
    expect(result.findings.find((finding) => finding.checkType === 'credit')?.result).toBe('pass');
  });

  it('retains deterministic deadline bounds in the latest finding', () => {
    const result = recheck({
      documentKind: 'certificate', recipientName: 'Budi Santoso', accountName: 'Budi Santoso', angkatan: 2025,
      activityName: 'Seminar Teknologi', activityEndDate: '2026-09-01', komponen: 1,
      categoryCode: 'K1-03', level: null, role: 'Peserta', achievement: null,
      answers: {}, today: '2026-10-09',
    }, deps);
    const deadline = result.findings.find((finding) => finding.checkType === 'deadline');
    expect(deadline?.data).toMatchObject({ validTo: '2026-10-09' });
    expect(deadline?.data?.validFrom).toBe('2025-10-09');
  });

  it('does not infer a level when student selects unknown scope', () => {
    const result = recheck({
      documentKind: 'certificate', recipientName: 'Budi Santoso', accountName: 'Budi Santoso', angkatan: 2025,
      activityName: 'Juara II Lomba Karya Ilmiah', activityEndDate: '2026-09-01', komponen: 3,
      categoryCode: 'K3-B01', level: 'Nasional', role: 'Juara II', achievement: 'Juara II',
      answers: { participant_scope: 'unknown' }, today: '2026-10-09',
    }, deps);

    expect(result.reviewStatus).toBe('needs_fix');
    expect(result.level).toBeNull();
    expect(result.estimatedCredit).toBeNull();
  });

  it('marks unsupported category and level combination as credit needs_fix', () => {
    const result = recheck({
      documentKind: 'certificate', recipientName: 'Farhan Ramadhan', accountName: 'Farhan Ramadhan', angkatan: 2024,
      activityName: 'Mentor Keagamaan', activityEndDate: '2025-09-01', komponen: 3,
      categoryCode: 'K3-C02', level: 'Internasional', role: null, achievement: null,
      answers: {}, today: '2026-10-09',
    }, deps);

    expect(result.reviewStatus).toBe('needs_fix');
    expect(result.estimatedCredit).toBeNull();
    expect(result.findings.find((finding) => finding.checkType === 'credit')?.result).toBe('fail');
    expect(result.findings.every((finding) => finding.guidelineRef?.id)).toBe(true);
  });

  it('does not invent level for Komponen 1 and uses exact null lookup', () => {
    const result = recheck({
      documentKind: 'certificate', recipientName: 'Rizky Pratama', accountName: 'Rizky Pratama', angkatan: 2024,
      activityName: 'LKMM Pra-TD', activityEndDate: '2025-09-01', komponen: 1,
      categoryCode: 'K1-03', level: 'Nasional', role: 'Peserta', achievement: 'Peserta',
      answers: { participant_scope: 'national' }, today: '2026-10-09',
    }, deps);

    expect(result.reviewStatus).toBe('ready');
    expect(result.level).toBeNull();
    expect(result.creditEntryId).toBe('K1-03-PESERTA');
  });
});
