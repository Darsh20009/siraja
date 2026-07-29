/**
 * AudioScoreBreakdown — the four sub-scores that feed into compositeScore,
 * plus the raw ASR confidence score for traceability.
 *
 * Weights (applied by AudioScoreEngine):
 *   accuracy     × 0.35  — correct word count / expected word count
 *   tajweed      × 0.30  — tajweed rule adherence ratio
 *   fluency      × 0.20  — pace, pause-pattern, and restart regularity
 *   consistency  × 0.15  — score variance across segments
 */
export interface AudioScoreBreakdown {
  /** Word accuracy rate (0–100): correctWords / totalExpectedWords × 100 */
  accuracyScore: number;

  /**
   * Fluency score (0–100): composite of words-per-minute normalised to
   * ideal pace, penalty for excessive pauses, and penalty for repeated
   * words or restarts.
   */
  fluencyScore: number;

  /**
   * Tajweed adherence score (0–100):
   *   correctObservations / (correctObservations + incorrectObservations) × 100
   * Undetectable observations are excluded from numerator and denominator.
   */
  tajweedScore: number;

  /**
   * Consistency score (0–100): 100 − (stdDev of per-segment accuracy × 2).
   * Measures how evenly the student performed across all segments.
   */
  consistencyScore: number;

  /** Mean word-level ASR confidence across all aligned words (0–100). */
  asrConfidenceScore: number;
}

/**
 * AudioScoreTier — categorical performance tier derived from compositeScore.
 *
 *   excellent       ≥ 85
 *   good            ≥ 70
 *   satisfactory    ≥ 50
 *   needs_improvement < 50
 */
export type AudioScoreTier =
  | 'excellent'
  | 'good'
  | 'satisfactory'
  | 'needs_improvement';

/**
 * AudioScore — the fully computed scoring result for one AudioSession.
 *
 * Embedded inside the AudioSession document (one-to-one) so the score is
 * always available with the session without an extra round-trip.
 */
export interface AudioScore {
  sessionId: string;

  /**
   * Weighted composite score (0–100):
   *   accuracy×0.35 + tajweed×0.30 + fluency×0.20 + consistency×0.15
   */
  compositeScore: number;

  breakdown: AudioScoreBreakdown;

  /** Total Quran words expected in the recited range (from corpus lookup). */
  totalExpectedWords: number;

  /** Words with isMatch = true and editDistance ≤ threshold. */
  correctWords: number;

  /** Words present in ASR output but absent from expected range (insertions). */
  insertedWords: number;

  /** Expected words absent from ASR output (deletions/skips). */
  deletedWords: number;

  totalMistakes: number;
  criticalMistakes: number;
  majorMistakes: number;
  minorMistakes: number;

  /** Average recitation pace in words per minute. */
  wordsPerMinute: number;

  /** Total speech duration (excludes silence segments). */
  speechDurationSeconds: number;

  tier: AudioScoreTier;
}
