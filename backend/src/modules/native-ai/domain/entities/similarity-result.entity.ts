/**
 * SimilarityResult — computed similarity between two Arabic text segments.
 *
 * Used by the SimilarityEngine to identify ayahs that students frequently
 * confuse and to detect phonological near-duplicates.
 */
export interface ConfusablePair {
  wordA: string;
  wordB: string;
  /** Normalised edit distance (0 = identical, 1 = completely different). */
  normalizedDistance: number;
}

export interface SimilarityResult {
  textA: string;
  textB: string;

  /**
   * Proportion of shared vocabulary after normalization (Jaccard).
   * 0 = no common words, 1 = identical word sets.
   */
  lexicalSimilarity: number;

  /**
   * Phonological resemblance based on letter-sequence similarity.
   * 1 − normalized_edit_distance on diacritic-stripped texts.
   */
  phonologicalSimilarity: number;

  /**
   * Structural similarity: how close the texts are in length and
   * word-count (1 − |lenA − lenB| / max(lenA, lenB)).
   */
  structuralSimilarity: number;

  /**
   * Weighted composite: lexical×0.45 + phonological×0.35 + structural×0.20.
   */
  compositeSimilarity: number;

  /** Words that appear in both texts (normalised). */
  sharedWords: string[];

  /**
   * Word pairs that are visually/phonologically close and might be
   * confused during recitation.
   */
  confusablePairs: ConfusablePair[];
}
