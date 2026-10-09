/** Candidate builder tests: every code sent to the model must exist in credit_table. */

import { describe, expect, it } from 'vitest';
import { creditTable } from '../../src/rules/config.js';
import { buildCandidates } from '../../src/agent/candidates.js';

describe('buildCandidates', () => {
  it('returns candidates from the official table, relevant to the extracted activity', () => {
    const result = buildCandidates(creditTable, {
      activityName: 'Lomba Karya Ilmiah Nasional',
      roleText: 'Juara II',
      achievementText: 'Juara II',
      participantScopeText: '3 provinsi',
    });
    const codes = new Set(creditTable.entries.map((entry) => entry.categoryCode));
    expect(result.category.length).toBeGreaterThan(0);
    expect(result.category.length).toBeLessThanOrEqual(3);
    expect(result.category.every((candidate) => codes.has(candidate.code))).toBe(true);
    expect(result.category.some((candidate) => candidate.code === 'K3-B01')).toBe(true);
    expect(result.role.some((candidate) => candidate.code === 'Juara II')).toBe(true);
  });

  it('returns level and role options restricted to candidate categories', () => {
    const result = buildCandidates(creditTable, {
      activityName: 'Lomba Karya Ilmiah',
      roleText: 'Juara II',
      achievementText: 'Juara II',
      participantScopeText: '',
    });
    const categoryCodes = new Set(result.category.map((item) => item.code));
    const allowedRows = creditTable.entries.filter((entry) => categoryCodes.has(entry.categoryCode));
    expect(result.level.every((item) => allowedRows.some((entry) => entry.level === item.code))).toBe(true);
    expect(result.role.every((item) => allowedRows.some((entry) => entry.role === item.code))).toBe(true);
  });
});
