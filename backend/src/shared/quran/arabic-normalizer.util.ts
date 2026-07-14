/**
 * ArabicNormalizerUtil — Phase 12B.
 *
 * Full normalization pipeline for Arabic text comparison.
 * Applies a superset of the seeder normalization (which only strips
 * tashkeel + tatweel for the `arabicTextNormalized` DB field).
 *
 * Pipeline steps:
 *  1. Remove tashkeel (harakat, shadda, sukun, superscript alef)
 *  2. Remove tatweel (Arabic kashida ـ)
 *  3. Normalize alef variants → bare alef ا
 *  4. Normalize alef maqsura ى → ya ي
 *  5. Normalize ta marbuta ة → ha ه
 *  6. Normalize hamza on waw ؤ → و, hamza on ya ئ → ي
 *  7. Normalize standalone hamza ء → alef ا
 *  8. Remove non-Arabic characters and punctuation
 *  9. Collapse whitespace
 *
 * The seeder normalization (steps 1-2) is NOT changed; this util applies
 * the full pipeline to query strings for matching purposes only.
 */
export function normalizeArabic(text: string): string {
  return text
    // 1. Remove tashkeel: harakat (U+064B–U+065F), superscript alef (U+0670)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // 2. Remove tatweel (Arabic kashida)
    .replace(/\u0640/g, '')
    // 3. Normalize alef variants → bare alef ا (U+0627)
    //    أ (U+0623), إ (U+0625), آ (U+0622), ٱ (U+0671)
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // 4. Normalize alef maqsura ى (U+0649) → ya ي (U+064A)
    .replace(/\u0649/g, '\u064A')
    // 5. Normalize ta marbuta ة (U+0629) → ha ه (U+0647)
    .replace(/\u0629/g, '\u0647')
    // 6. Normalize hamza on waw ؤ (U+0624) → و (U+0648)
    //    Normalize hamza on ya  ئ (U+0626) → ي (U+064A)
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    // 7. Normalize standalone hamza ء (U+0621) → alef ا (U+0627)
    .replace(/\u0621/g, '\u0627')
    // 8. Remove non-Arabic characters (keep Arabic block U+0600–U+06FF and spaces)
    .replace(/[^\u0600-\u06FF\s]/g, '')
    // 9. Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize normalized Arabic text into an array of words.
 * Returns [] for empty / whitespace-only input.
 */
export function tokenizeArabic(text: string): string[] {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized.split(' ');
}

/**
 * Word-level Levenshtein edit distance between two word arrays.
 * Each operation (insert, delete, substitute one word) costs 1.
 * O(m × n) — suitable for word counts up to ~100.
 */
export function wordLevenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Build dp table row-by-row (O(n) space)
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Similarity ratio: 1 - (editDistance / max(len_a, len_b)).
 * Returns 1.0 for identical inputs; 0.0 when nothing matches.
 */
export function wordSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - wordLevenshtein(a, b) / maxLen;
}
