/** Deterministic student question templates; never calls an LLM. */

import type { Candidate, QuestionOption } from '@skem/shared';

export type CandidateGroups = {
  category: Candidate[];
  level: Candidate[];
  role: Candidate[];
  achievement: Candidate[];
};

export type TemplateQuestion = {
  seq: number;
  field: string;
  question: string;
  options: QuestionOption[];
  answer: string | null;
};

const PARTICIPANT_SCOPE_OPTIONS: QuestionOption[] = [
  { value: 'campus', label: 'Hanya lingkungan PENS' },
  { value: 'regional', label: 'Satu provinsi (minimal 3 kota/kabupaten)' },
  { value: 'national', label: 'Minimal 3 provinsi di Indonesia' },
  { value: 'international', label: 'Minimal 3 negara' },
  { value: 'unknown', label: 'Saya tidak tahu' },
];

const PROMPTS: Record<string, { field: string; question: string; group?: keyof CandidateGroups }> = {
  category: { field: 'category', question: 'Pilih kategori kegiatan yang paling sesuai.', group: 'category' },
  participant_scope: { field: 'participant_scope', question: 'Peserta kegiatan ini berasal dari mana?' },
  level: { field: 'level', question: 'Pilih tingkat kegiatan yang sesuai.', group: 'level' },
  role: { field: 'role', question: 'Apa peran Anda dalam kegiatan ini?', group: 'role' },
  achievement: { field: 'achievement', question: 'Apa capaian atau prestasi Anda?', group: 'achievement' },
  activity_date: { field: 'activity_date', question: 'Kapan tanggal kegiatan berakhir?' },
  activity_end_date: { field: 'activity_date', question: 'Kapan tanggal kegiatan berakhir?' },
  activity_name: { field: 'activity_name', question: 'Tuliskan nama resmi kegiatan.' },
};

function candidateOptions(candidates: Candidate[] | undefined): QuestionOption[] {
  return (candidates ?? []).slice(0, 3).map((candidate) => ({
    value: candidate.code,
    label: candidate.label ?? candidate.code,
  }));
}

export function buildQuestions(missing: string[], candidates: CandidateGroups): TemplateQuestion[] {
  const result: TemplateQuestion[] = [];
  const seen = new Set<string>();
  for (const missingField of missing) {
    const template = PROMPTS[missingField];
    if (!template || seen.has(template.field)) continue;
    const options = template.field === 'participant_scope'
      ? PARTICIPANT_SCOPE_OPTIONS
      : template.group
        ? candidateOptions(candidates[template.group])
        : [];
    if (template.group && options.length === 0) continue;
    result.push({
      seq: result.length + 1,
      field: template.field,
      question: template.question,
      options,
      answer: null,
    });
    seen.add(template.field);
    if (result.length === 3) break;
  }
  return result;
}
