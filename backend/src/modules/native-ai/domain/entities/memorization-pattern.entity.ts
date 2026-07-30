/**
 * MemorizationPattern — SM-2 state and Ebbinghaus-derived retention
 * metrics for a student's memorization of a unit (ayah / page / juz).
 */

export interface Sm2Result {
  /** Updated ease factor (minimum 1.3, start 2.5). */
  easeFactor: number;
  /** Next review interval in days. */
  interval: number;
  /** Total successful repetitions so far. */
  repetitions: number;
}

export interface MemorizationPattern {
  /** SM-2 ease factor: 1.3 (hard) → 2.5 (easy). */
  easeFactor: number;
  /** Current inter-repetition interval in days. */
  interval: number;
  /** Number of consecutive successful reviews. */
  repetitions: number;

  /**
   * Estimated retention probability right now (0–1).
   * Computed via Ebbinghaus: R = e^(-t / S) where S is memory strength.
   */
  retentionProbability: number;

  /**
   * Daily forgetting rate (0–1).
   * Higher values indicate faster forgetting.
   */
  forgettingRate: number;

  /**
   * Subjectively best study time inferred from historical session grades.
   */
  optimalStudyTime: 'morning' | 'afternoon' | 'evening' | 'any';

  /** Recommended session length in minutes based on load and pace. */
  recommendedSessionLength: number;

  /**
   * Proportion of study time to spend on new material (0 = all review).
   * Derived from forgetting rate and pace.
   */
  newToReviewRatio: number;

  /**
   * Estimated sustainable weekly memorization capacity (ayahs/week)
   * given current forgetting rate and session length.
   */
  weeklyCapacity: number;
}
