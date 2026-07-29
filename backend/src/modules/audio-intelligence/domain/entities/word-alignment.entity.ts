/**
 * WordAlignment — the mapping between one recognised ASR word and its
 * expected Quran word position.
 *
 * Produced by AudioAlignmentEngine.align(). Each WordAlignment carries
 * confidence, edit-distance, and Quran coordinates so downstream engines
 * (AudioMistakeEngine, TajweedAnalysisEngine, AudioScoreEngine) can work
 * from a single structured token stream without re-querying the database.
 *
 * Embedded within AudioSegment — never stored as an independent document.
 */
export interface WordAlignment {
  /** Stable reference back to the containing segment. */
  segmentId: string;

  /** The Arabic text returned by the ASR provider. */
  recognisedText: string;

  /**
   * The expected Arabic word from the Quran corpus.
   * Absent when the recognised word could not be mapped to any position
   * in the expected range (insertion / extra word).
   */
  expectedText?: string;

  /** Quran coordinates of the expected word. Absent on insertions. */
  surahNumber?: number;
  ayahNumber?: number;

  /**
   * Zero-based word position within the ayah.
   * Absent on insertions (recognised word has no Quran counterpart).
   */
  wordIndex?: number;

  /** Timestamp from the ASR provider, in seconds from audio start. */
  startSeconds: number;
  endSeconds: number;

  /**
   * Provider-reported posterior confidence for this word (0–1).
   * Used by ConfidenceEngine and AudioScoreEngine.
   */
  confidence: number;

  /**
   * Whether the recognised text matches the expected text.
   * True even for partial matches when editDistance ≤ AudioRules.MATCH_EDIT_DISTANCE_THRESHOLD.
   */
  isMatch: boolean;

  /**
   * Character-level edit distance between recognisedText and expectedText.
   * 0 means exact match, MAX_INT when expectedText is absent.
   */
  editDistance: number;
}
