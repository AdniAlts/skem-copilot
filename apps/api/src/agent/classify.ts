/** LLM classification constrained to official candidate codes. */

import {
  ClassificationResultSchema,
  type Candidate,
  type ClassificationResult,
  type ExtractedFields,
  type GuidelineSection,
} from '@skem/shared';
import { callLlm, type CallLlmInput, type CallLlmResult } from '../llm/client.js';
import type { ReaderContext } from '../reader/index.js';
import type { CandidateGroups } from './candidates.js';
import { CLASSIFY_PROMPT_VERSION, CLASSIFY_SYSTEM_PROMPT } from './prompts/classify.js';

export type ClassificationCaller = (input: CallLlmInput<ClassificationResult>) => Promise<CallLlmResult<ClassificationResult>>;

function enforceCandidates(result: ClassificationResult, candidates: CandidateGroups): void {
  const groups: { field: keyof CandidateGroups; choices: ClassificationResult['category']; allowed: Candidate[] }[] = [
    { field: 'category', choices: result.category, allowed: candidates.category },
    { field: 'level', choices: result.level, allowed: candidates.level },
    { field: 'role', choices: result.role, allowed: candidates.role },
    { field: 'achievement', choices: result.achievement, allowed: candidates.achievement },
  ];
  for (const { field, choices, allowed } of groups) {
    const allowedCodes = new Set(allowed.map((candidate) => candidate.code));
    for (const choice of choices) {
      if (!allowedCodes.has(choice.code)) {
        throw new Error(`LLM returned ${field} code outside candidates.`);
      }
    }
  }
}

export async function classifyActivity(
  fields: ExtractedFields,
  candidates: CandidateGroups,
  sections: GuidelineSection[],
  context: ReaderContext,
  caller: ClassificationCaller = callLlm,
): Promise<ClassificationResult> {
  const response = await caller({
    purpose: 'classify',
    submissionId: context.submissionId,
    runId: context.runId,
    promptVersion: CLASSIFY_PROMPT_VERSION,
    messages: [
      { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          extractedFields: fields,
          candidates,
          relevantGuidelineSections: sections,
        }),
      },
    ],
    schema: ClassificationResultSchema,
  });
  enforceCandidates(response.data, candidates);
  return response.data;
}
