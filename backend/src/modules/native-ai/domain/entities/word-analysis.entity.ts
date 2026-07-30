import type { MorphemeBreakdown } from './quran-token.entity';

/**
 * WordAnalysis — per-word linguistic and tajweed analysis produced by
 * the WordAnalyzerEngine.
 */
export interface WordAnalysis {
  /** Original text with diacritics. */
  word: string;
  /** Normalised (diacritic-stripped, alef-normalised) form. */
  normalized: string;
  /**
   * Extracted trilateral/quadrilateral root, e.g. 'كتب'.
   * Null when root extraction is inconclusive.
   */
  root?: string;
  letterCount: number;
  /** Estimated syllable count (CV clusters). */
  syllableEstimate: number;
  morphemes: MorphemeBreakdown;

  // ── Tajweed flags ───────────────────────────────────────────────────
  /** Word contains a qalqala letter (ق ط ب ج د). */
  hasQalqala: boolean;
  /** Word contains a long-vowel madd letter (ا و ي). */
  hasMadd: boolean;
  /** Word contains noon or meem with shadda. */
  hasGhunna: boolean;
  /** Word contains a shadda (doubling). */
  hasShadda: boolean;
  /** Word contains a hamza. */
  hasHamza: boolean;

  /**
   * Tajweed complexity score 0–100.
   * Derived from letter complexity scores weighted by letter count.
   */
  tajweedComplexity: number;

  /**
   * Learner difficulty 1–5.
   * Combines letter complexity, syllable count, and morpheme density.
   */
  difficulty: number;
}
