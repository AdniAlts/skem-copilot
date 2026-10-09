/** Narrow deterministic category/level/role candidates from the official credit table. */

import type { Candidate, CreditTable } from '@skem/shared';

export type CandidateGroups = {
  category: Candidate[];
  level: Candidate[];
  role: Candidate[];
  achievement: Candidate[];
};

export const NO_LEVEL_CODE = '__no_level__';
export const NO_ROLE_CODE = '__no_role__';

export type CandidateText = {
  activityName: string;
  roleText: string;
  achievementText: string;
  participantScopeText: string;
};

const STOP_WORDS = new Set(['dan', 'atau', 'dari', 'dalam', 'yang', 'untuk', 'pada', 'oleh', 'the']);

function tokens(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function scoreLabel(query: Set<string>, label: string): number {
  const labelTokens = tokens(label);
  if (!query.size || !labelTokens.size) return 0;
  let matches = 0;
  for (const token of query) if (labelTokens.has(token)) matches += 1;
  return matches / Math.sqrt(query.size * labelTokens.size);
}

function topCandidates(values: Map<string, { label: string; score: number }>, maximum = 3): Candidate[] {
  return [...values.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, maximum)
    .map(([code, item]) => ({ code, label: item.label, confidence: Math.min(item.score, 0.99) }));
}

export function buildCandidates(table: CreditTable, input: CandidateText): {
  category: Candidate[];
  level: Candidate[];
  role: Candidate[];
  achievement: Candidate[];
} {
  const activityTokens = tokens(input.activityName);
  const categoryScores = new Map<string, { label: string; score: number }>();
  for (const entry of table.entries) {
    const existing = categoryScores.get(entry.categoryCode);
    const score = scoreLabel(activityTokens, entry.categoryLabel);
    if (!existing || score > existing.score) {
      categoryScores.set(entry.categoryCode, { label: entry.categoryLabel, score });
    }
  }

  const ranked = [...categoryScores.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]));
  const selected = ranked.filter(([, value]) => value.score > 0).slice(0, 3);
  const categoryRows = selected.length
    ? table.entries.filter((entry) => selected.some(([code]) => entry.categoryCode === code))
    : table.entries;

  const levelQuery = tokens(input.participantScopeText);
  const levelLabels = new Map<string, { label: string; score: number }>();
  for (const entry of categoryRows) {
    const levelCode = entry.level ?? NO_LEVEL_CODE;
    const label = entry.level ?? 'Kategori ini tidak memiliki tingkat';
    const score = entry.level ? scoreLabel(levelQuery, entry.level) : 1;
    const existing = levelLabels.get(levelCode);
    if (!existing || score > existing.score) levelLabels.set(levelCode, { label, score });
  }

  const roleQuery = tokens(`${input.roleText} ${input.achievementText}`);
  const roles = new Map<string, { label: string; score: number }>();
  for (const entry of categoryRows) {
    const roleCode = entry.role ?? NO_ROLE_CODE;
    const label = entry.role ?? 'Kategori ini tidak memiliki jabatan atau capaian';
    const score = entry.role ? scoreLabel(roleQuery, entry.role) : 1;
    const existing = roles.get(roleCode);
    if (!existing || score > existing.score) roles.set(roleCode, { label, score });
  }

  return {
    category: topCandidates(new Map(selected.length ? selected : ranked.slice(0, 3))),
    level: topCandidates(levelLabels),
    role: topCandidates(roles),
    achievement: topCandidates(roles),
  };
}
