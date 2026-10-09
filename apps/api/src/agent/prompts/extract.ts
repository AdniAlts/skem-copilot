/** Prompt contract for DocumentReader extraction. */

export const EXTRACT_PROMPT_VERSION = 'extract-v1';

export const EXTRACT_SYSTEM_PROMPT = [
  'Anda mengekstrak field dari sertifikat atau surat keputusan kegiatan.',
  'Jawab hanya JSON sesuai schema yang diberikan.',
  'Field yang tidak ditemukan harus bernilai null dengan confidence 0.',
  'Normalisasi tanggal ke format YYYY-MM-DD.',
  'Jangan mengarang data dan jangan menghasilkan kredit.',
].join(' ');

export function buildExtractTextPrompt(text: string): string {
  return `Ekstrak field dari dokumen berikut.\n\n${text}`;
}

export const BUILD_EXTRACT_VISION_PROMPT = 'Ekstrak field dari gambar dokumen. Field yang tidak terlihat harus null dengan confidence 0. Jangan mengarang data dan jangan menghasilkan kredit.';
