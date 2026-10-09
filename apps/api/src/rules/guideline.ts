import type { GetRelevantSectionsResult, GuidelineSections } from '@skem/shared';

/** Batas bagian dan total teks per panggilan agar konteks LLM tetap kecil (ARCHITECTURE §8, §11). */
export const MAX_RELEVANT_SECTIONS = 3;
export const MAX_RELEVANT_TEXT_CHARS = 1500;

export type RelevantSectionsQuery = {
  tags: string[];
  categoryCode?: string;
};

/**
 * Tool `get_relevant_sections`: section-lookup deterministik (bukan RAG).
 * Skor = jumlah tag cocok + 1 jika `categoryCode` ada di `categoryCodes` bagian.
 * Bagian yang terikat kategori lain dilewati. Urutan seri mengikuti urutan di file.
 */
export function getRelevantSections(
  guideline: GuidelineSections,
  query: RelevantSectionsQuery,
): GetRelevantSectionsResult {
  const wantedTags = new Set(query.tags);
  const { categoryCode } = query;

  const ranked = guideline.sections
    .filter(
      (section) =>
        !categoryCode || !section.categoryCodes || section.categoryCodes.includes(categoryCode),
    )
    .map((section, order) => {
      const tagScore = section.tags.filter((tag) => wantedTags.has(tag)).length;
      const categoryScore = categoryCode && section.categoryCodes?.includes(categoryCode) ? 1 : 0;
      return { section, order, score: tagScore + categoryScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const sections: GetRelevantSectionsResult['sections'] = [];
  let totalChars = 0;
  for (const { section } of ranked) {
    if (sections.length === MAX_RELEVANT_SECTIONS) break;
    if (totalChars + section.text.length > MAX_RELEVANT_TEXT_CHARS) continue;
    const { id, title, ref, text } = section;
    sections.push({ id, title, ref, text });
    totalChars += text.length;
  }
  return { sections };
}
