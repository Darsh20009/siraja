/**
 * RevisionRules — rule constants for the revision (murājaʿah) subsystem.
 */
export const RevisionRules = Object.freeze({
  /**
   * Days an SM-2 review can be overdue before it triggers a
   * "medium" forgetting-risk classification.
   */
  OVERDUE_MEDIUM_RISK_DAYS: 7,

  /**
   * Days overdue before "high" forgetting-risk classification.
   */
  OVERDUE_HIGH_RISK_DAYS: 21,

  /**
   * Minimum revision sessions per week for a healthy revision cadence.
   */
  IDEAL_SESSIONS_PER_WEEK: 3,

  /**
   * Revision burden score (0–100) above which the student is considered
   * over-loaded — new memorization should be paused.
   */
  HIGH_BURDEN_THRESHOLD: 60,

  /**
   * Revision burden above which we recommend daily targeted revision
   * before adding any new memorization.
   */
  CRITICAL_BURDEN_THRESHOLD: 80,

  /**
   * SM-2 easiness factor below which a student is struggling with an
   * ayah — used in the difficulty engine.
   */
  LOW_EASINESS_FACTOR: 1.5,

  /**
   * Percentage of memorized content that must be overdue to classify
   * forgetting risk as "medium".
   */
  OVERDUE_RATIO_MEDIUM: 0.05,

  /**
   * Percentage of memorized content overdue for "high" forgetting risk.
   */
  OVERDUE_RATIO_HIGH: 0.20,

  /** Weight of revision score in the composite student profile. */
  WEIGHT_RETENTION_GRADE: 0.45,
  WEIGHT_FREQUENCY: 0.30,
  WEIGHT_OVERDUE_PENALTY: 0.25,
} as const);
