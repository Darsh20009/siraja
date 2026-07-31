import { NormalizationEngine } from './normalization.engine';
import type { ConfusablePair, SimilarityResult } from '../entities/similarity-result.entity';

/**
 * SimilarityEngine — computes lexical, phonological, and structural
 * similarity between two Arabic text segments.
 *
 * Used to identify ayahs that students frequently confuse and to detect
 * phonological near-duplicates for adaptive review planning.
 *
 * No NestJS dependencies — instantiate with `new SimilarityEngine()`.
 */
export class SimilarityEngine {
  private readonly normalizer = new NormalizationEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Compute all similarity dimensions between two Arabic text segments.
   *
   * @param textA First text (may contain diacritics).
   * @param textB Second text (may contain diacritics).
   * @returns A fully-populated `SimilarityResult`.
   */
  compute(textA: string, textB: string): SimilarityResult {
    const normA = this.normalizer.toSearchForm(textA);
    const normB = this.normalizer.toSearchForm(textB);

    const wordsA = this.splitWords(normA);
    const wordsB = this.splitWords(normB);

    const setA = new Set(wordsA);
    const setB = new Set(wordsB);

    const lexicalSimilarity = this.clamp(this.jaccardSimilarity(setA, setB));

    // Phonological: flat form (hamza-stripped) full-text comparison
    const flatA = this.normalizer.toFlatForm(textA);
    const flatB = this.normalizer.toFlatForm(textB);
    const phonologicalSimilarity = this.clamp(1 - this.normalizedLevenshtein(flatA, flatB));

    const lenA = wordsA.length;
    const lenB = wordsB.length;
    const structuralSimilarity = this.clamp(
      1 - Math.abs(lenA - lenB) / Math.max(lenA, lenB, 1),
    );

    const compositeSimilarity = this.clamp(
      lexicalSimilarity * 0.45 +
        phonologicalSimilarity * 0.35 +
        structuralSimilarity * 0.20,
    );

    // Shared words (intersection of normalised sets)
    const sharedWords = [...setA].filter((w) => setB.has(w));

    // Confusable pairs
    const confusablePairs = this.findConfusablePairs(wordsA, wordsB);

    return {
      textA,
      textB,
      lexicalSimilarity,
      phonologicalSimilarity,
      structuralSimilarity,
      compositeSimilarity,
      sharedWords,
      confusablePairs,
    };
  }

  /**
   * Standard dynamic-programming Levenshtein distance.
   * Operates on Unicode code points (spread operator) for correct
   * multi-byte character handling.
   *
   * @param a First string.
   * @param b Second string.
   * @returns Non-negative integer edit distance.
   */
  levenshteinDistance(a: string, b: string): number {
    const ca = [...a];
    const cb = [...b];
    const m = ca.length;
    const n = cb.length;

    if (m === 0) return n;
    if (n === 0) return m;

    // Two-row rolling array
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array<number>(n + 1);

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = ca[i - 1] === cb[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,      // deletion
          curr[j - 1] + 1,  // insertion
          prev[j - 1] + cost, // substitution
        );
      }
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }

  /**
   * Normalized Levenshtein distance: distance / max(|a|, |b|).
   *
   * @param a First string.
   * @param b Second string.
   * @returns Value in [0, 1]; 0 for identical strings.
   */
  normalizedLevenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const maxLen = Math.max([...a].length, [...b].length, 1);
    return this.levenshteinDistance(a, b) / maxLen;
  }

  /**
   * Jaccard similarity between two word sets.
   *
   * @param setA Set of normalised words from text A.
   * @param setB Set of normalised words from text B.
   * @returns Value in [0, 1]; 1 = identical sets.
   */
  jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 1;

    let intersectionCount = 0;
    for (const w of setA) {
      if (setB.has(w)) intersectionCount++;
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    if (unionCount === 0) return 1;
    return intersectionCount / unionCount;
  }

  /**
   * Find word pairs that are phonologically close but not identical.
   *
   * A pair is included only when normalizedDistance < 0.4 (close enough
   * to cause confusion) and the words are not identical.
   *
   * @param wordsA Words from text A (normalised).
   * @param wordsB Words from text B (normalised).
   * @returns Deduplicated list of `ConfusablePair` objects.
   */
  findConfusablePairs(wordsA: string[], wordsB: string[]): ConfusablePair[] {
    const pairs: ConfusablePair[] = [];
    const seen = new Set<string>();

    for (const wa of wordsA) {
      let closestDist = Infinity;
      let closestWord = '';

      for (const wb of wordsB) {
        if (wa === wb) continue;
        const dist = this.normalizedLevenshtein(wa, wb);
        if (dist < closestDist) {
          closestDist = dist;
          closestWord = wb;
        }
      }

      if (closestDist < 0.4 && closestWord) {
        const key = [wa, closestWord].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ wordA: wa, wordB: closestWord, normalizedDistance: closestDist });
        }
      }
    }

    return pairs;
  }

  /**
   * Rank candidate texts by composite similarity to a query.
   *
   * @param candidates Array of Arabic text strings to rank.
   * @param query      The reference text to compare against.
   * @returns Candidates sorted by score descending.
   */
  rankBySimilarity(
    candidates: string[],
    query: string,
  ): Array<{ text: string; score: number }> {
    return candidates
      .map((text) => ({ text, score: this.compute(text, query).compositeSimilarity }))
      .sort((a, b) => b.score - a.score);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Split a normalised text into individual word tokens. */
  private splitWords(text: string): string[] {
    return text.trim().split(/\s+/).filter((w) => w.length > 0);
  }

  /** Clamp a value to [0, 1]. */
  private clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
