import type { WordAnalysis } from './word-analysis.entity';

/**
 * VerseAnalysis — structural and tajweed analysis of a single ayah
 * produced by the VerseStructureAnalyzerEngine.
 */
export interface VerseAnalysis {
  surahNumber: number;
  ayahNumber: number;
  /** Full Arabic text with diacritics. */
  arabicText: string;
  wordCount: number;
  letterCount: number;
  uniqueWordCount: number;
  /** Per-word analyses. */
  words: WordAnalysis[];

  // ── Scoring ─────────────────────────────────────────────────────────
  /** Overall tajweed complexity 0–100 (mean of word complexities). */
  tajweedComplexity: number;
  /** Learner difficulty 0–100 (word count × word difficulty normalised). */
  difficulty: number;

  // ── Tajweed presence flags ───────────────────────────────────────────
  hasQalqala: boolean;
  hasMadd: boolean;
  hasGhunna: boolean;
  hasShadda: boolean;

  // ── Phonological structure ───────────────────────────────────────────
  /**
   * The rhyme-ending (aaqi) — last 1–2 letters of the final word after
   * diacritic-stripping.  Used to group ayahs by rhyme pattern.
   */
  rhymeEnding?: string;
  /** Normalised text of the word with the highest difficulty score. */
  mostDifficultWord?: string;
}
