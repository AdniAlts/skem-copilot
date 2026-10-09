/** Deterministic recheck tests: answers must not invoke an LLM. */

import { describe, expect, it } from 'vitest';
import { recheck } from '../../src/rules/recheck.js';
import { creditTable, guidelineSections, rules } from '../../src/rules/config.js';

describe('recheck', () => {
  it('maps national participant scope to the exact category level and deterministic credit', () => {
    const result = recheck({
      documentKind: 'certificate',
      recipientName: 'Budi Santoso',
      accountName: 'Budi Santoso',
      angkatan: 2025,
      activityName: 'Juara II Lomba Desain',
      activityEndDate: '2026-09-01',
      komponen: 3,
      categoryCode: 'K3-B01',
      level: null,
      role: 'Juara II',
      achievement: 'Juara II',
      answers: { participant_scope: 'national' },
      today: '2026-10-09',
    }, { rules, creditTable, guidelineSections });

    expect(result.reviewStatus).toBe('ready');
    expect(result.level).toBe('Nasional');
    expect(result.creditEntryId).toBeTruthy();
    expect(result.estimatedCredit).toBeGreaterThan(0);
    expect(result.findings.find((finding) => finding.checkType === 'credit')?.result).toBe('pass');
  });

  it('turns an unsupported official category-level combination into credit needs_fix', () => {
    const result = recheck({
      documentKind: 'certificate',
      recipientName: 'Farhan Ramadhan',
      accountName: 'Farhan Ramadhan',
      angkatan: 2024,
      activityName: 'Mentor Keagamaan',
      activityEndDate: '2025-09-01',
      komponen: 3,
      categoryCode: 'K3-C02',
      level: 'Internasional',
      role: null,
      achievement: null,
      answers: {},
      today: '2026-10-09',
    }, { rules, creditTable, guidelineSections });

    expect(result.reviewStatus).toBe('needs_fix');
    expect(result.estimatedCredit).toBeNull();
    expect(result.findings.find((finding) => finding.checkType === 'credit')?.result).toBe('fail');
    expect(result.findings.every((finding) => finding.guidelineRef?.id)).toBe(true);
  });

  it('does not guess a level for unknown participant scope', () => {
    const result = recheck({
      documentKind: 'certificate',
      recipientName: 'Budi Santoso',
      accountName: 'Budi Santoso',
      angkatan: 2025,
      activityName: 'Juara II Lomba Desain',
      activityEndDate: '2026-09-01',
      komponen: 3,
      categoryCode: 'K3-B01',
      level: null,
      role: 'Juara II',
      achievement: 'Juara II',
      answers: { participant_scope: 'unknown' },
      today: '2026-10-09',
    }, { rules, creditTable, guidelineSections });

    expect(result.reviewStatus).toBe('needs_fix');
    expect(result.level).toBeNull();
    expect(result.estimatedCredit).toBeNull();
  });
});
