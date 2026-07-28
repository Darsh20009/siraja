/**
 * MemorizationRules — static rule constants governing how memorization
 * performance is evaluated across the Intelligence Platform.
 *
 * All thresholds are expressed in domain units and documented so that
 * future educators can adjust them without touching engine logic.
 */
export const MemorizationRules = Object.freeze({
  /** Minimum ayahs per session to count as a productive session. */
  MIN_AYAHS_PER_SESSION: 1,

  /** Target ayahs per session for an average student. */
  TARGET_AYAHS_PER_SESSION: 5,

  /** Excellent pace: ayahs per session above this → high score bonus. */
  EXCELLENT_AYAHS_PER_SESSION: 10,

  /**
   * Days without a memorization session after which consistency degrades.
   * Used to trigger a "resume schedule" recommendation.
   */
  MAX_DAYS_WITHOUT_SESSION: 7,

  /**
   * Days without ANY activity (memorization or revision) after which the
   * student is considered inactive — triggers high-priority recommendation.
   */
  INACTIVITY_THRESHOLD_DAYS: 14,

  /** Score (0–100) required to mark a session as "strong". */
  STRONG_SESSION_SCORE: 80,

  /** Score (0–100) below which a session is flagged as "weak". */
  WEAK_SESSION_SCORE: 50,

  /**
   * Minimum active days in 30-day window for a "Good" consistency label.
   */
  MIN_ACTIVE_DAYS_GOOD_CONSISTENCY: 20,

  /** Active days in 30-day window for "Excellent" consistency. */
  EXCELLENT_ACTIVE_DAYS: 26,

  /**
   * Trend window in days. Compare the last N days to the preceding N days
   * to determine whether pace is improving, stable, or declining.
   */
  TREND_WINDOW_DAYS: 14,

  /** Percentage improvement in ayahs/day needed to be "improving". */
  TREND_IMPROVEMENT_THRESHOLD: 0.10,

  /** Percentage decline in ayahs/day needed to be "declining". */
  TREND_DECLINE_THRESHOLD: 0.10,

  /** Score weight for grade quality (0–1). */
  WEIGHT_GRADE_QUALITY: 0.40,

  /** Score weight for pace relative to target (0–1). */
  WEIGHT_PACE: 0.35,

  /** Score weight for consistency (0–1). */
  WEIGHT_CONSISTENCY: 0.25,
} as const);
