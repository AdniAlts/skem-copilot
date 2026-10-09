import type { MatchNameResult, Rules } from '@skem/shared';

export type MatchNameInput = {
  certificateName: string;
  accountName: string;
};

/** Gelar di depan nama (dibuang). */
const PREFIX_TITLES = new Set(['dr', 'drs', 'dra', 'ir', 'prof', 'h', 'hj']);
/** Gelar akademik bertitik seperti S.T., S.Kom., M.T., A.Md. (minimal dua segmen bertitik). */
const DEGREE_TOKEN = /^([a-z]{1,4}\.){1,3}[a-z]{0,4}\.?$/i;
const JARO_WINKLER_PREFIX_SCALE = 0.1;
const JARO_WINKLER_MAX_PREFIX = 4;

/**
 * Normalisasi nama: buang gelar di belakang koma dan gelar bertitik, buang gelar di depan,
 * hapus aksen dan tanda baca, lowercase, rapikan spasi. Inisial satu huruf ("M.") dipertahankan.
 */
export function normalizeName(name: string): string {
  const beforeComma = name.split(',')[0] ?? '';
  const tokens = beforeComma
    .split(/\s+/)
    .filter(
      (token) => token && !(token.includes('.') && token.length > 2 && DEGREE_TOKEN.test(token)),
    )
    .map((token) =>
      token
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, ''),
    )
    .filter(Boolean);
  while (tokens.length > 1 && PREFIX_TITLES.has(tokens[0] ?? '')) {
    tokens.shift();
  }
  return tokens.join(' ');
}

/** Kemiripan Jaro-Winkler, 0..1. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 0 : 1;
  if (!a || !b) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(b.length - 1, i + window);
    for (let j = start; j <= end; j++) {
      if (!bMatched[j] && a[i] === b[j]) {
        aMatched[i] = true;
        bMatched[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  while (prefix < JARO_WINKLER_MAX_PREFIX && a[prefix] !== undefined && a[prefix] === b[prefix]) {
    prefix++;
  }
  return jaro + prefix * JARO_WINKLER_PREFIX_SCALE * (1 - jaro);
}

function tokenSimilarity(a: string, b: string): number {
  if (a.length === 1 || b.length === 1) {
    return a[0] === b[0] ? 1 : 0;
  }
  return jaroWinkler(a, b);
}

/**
 * Rata-rata kemiripan per kata: setiap kata di nama yang lebih pendek dipasangkan (tanpa dipakai
 * ulang) dengan kata paling mirip di nama lain. Tahan terhadap nama tengah hilang dan urutan kata,
 * tetapi tidak tertipu nama depan yang sama ("Muhammad Ilham" vs "Muhammad Rizki").
 */
function tokenAlignedScore(a: string[], b: string[]): number {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const used = new Set<number>();
  let total = 0;
  for (const token of shorter) {
    let best = 0;
    let bestIndex = -1;
    longer.forEach((candidate, index) => {
      if (used.has(index)) return;
      const score = tokenSimilarity(token, candidate);
      if (score > best) {
        best = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) used.add(bestIndex);
    total += best;
  }
  return total / shorter.length;
}

/**
 * Tool `match_name`: pass jika sama persis setelah normalisasi; warn jika skor ≥ warnMin
 * (ejaan/singkatan/nama tengah, tetap Ready + peringatan); fail jika di bawahnya (orang lain).
 */
export function matchName(
  input: MatchNameInput,
  rules: Pick<Rules['nameMatch'], 'warnMin'>,
): MatchNameResult {
  const certificate = normalizeName(input.certificateName);
  const account = normalizeName(input.accountName);
  if (!certificate || !account) return { result: 'fail', score: 0 };
  if (certificate === account) return { result: 'pass', score: 1 };

  const raw = tokenAlignedScore(certificate.split(' '), account.split(' '));
  // Nama tidak identik tidak boleh bernilai 1 agar tetap terbaca sebagai warn.
  const score = Math.min(Math.round(raw * 1000) / 1000, 0.999);
  return { result: score >= rules.warnMin ? 'warn' : 'fail', score };
}
