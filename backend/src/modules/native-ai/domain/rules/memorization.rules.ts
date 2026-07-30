/**
 * MemorizationRules — thresholds for the memorization pattern, forecast,
 * adaptive learning, and recommendation engines.
 */
export const MemorizationRules = Object.freeze({
  // ── Session velocity ──────────────────────────────────────────────────
  /** Minimum ayahs/week for "active" status. */
  MIN_ACTIVE_VELOCITY: 1,
  /** Comfortable target velocity for an average student. */
  TARGET_VELOCITY: 5,
  /** Excellent velocity — triggers positive recommendation. */
  EXCELLENT_VELOCITY: 10,

  // ── Review burden ─────────────────────────────────────────────────────
  /** Review burden score above which pace should be reduced. */
  HIGH_BURDEN_SCORE: 60,
  /** Critical burden — strong recommendation to pause new memorization. */
  CRITICAL_BURDEN_SCORE: 80,
  /** Ratio of overdue reviews that flags a problem. */
  HIGH_OVERDUE_RATIO: 0.20,

  // ── Retention ─────────────────────────────────────────────────────────
  /** Retention probability below which an ayah is considered "at risk". */
  LOW_RETENTION_THRESHOLD: 0.60,
  /** Target retention probability after a review session. */
  TARGET_RETENTION: 0.90,

  // ── Inactivity ────────────────────────────────────────────────────────
  /** Days without a session before "inactivity" warning fires. */
  INACTIVITY_DAYS: 7,
  /** Days without a session before "critical inactivity" fires. */
  CRITICAL_INACTIVITY_DAYS: 14,

  // ── Session length ────────────────────────────────────────────────────
  /** Minimum recommended session length (minutes). */
  MIN_SESSION_MINUTES: 15,
  /** Optimal session length for retention. */
  OPTIMAL_SESSION_MINUTES: 30,
  /** Maximum effective session length (diminishing returns after this). */
  MAX_SESSION_MINUTES: 60,

  // ── SM-2 grade thresholds ─────────────────────────────────────────────
  /** Grade ≥ this = successful recall (interval increases). */
  SM2_PASS_GRADE: 3,
  /** Grade ≤ this = failed recall (interval resets). */
  SM2_FAIL_GRADE: 2,

  // ── Adaptive plan ─────────────────────────────────────────────────────
  /** Default new:review ratio when burden is low. */
  DEFAULT_NEW_REVIEW_RATIO: 0.4,
  /** Minimum new:review ratio even under high burden. */
  MIN_NEW_REVIEW_RATIO: 0.1,

  // ── Observation window ────────────────────────────────────────────────
  /** Number of recent sessions used for velocity/pattern analysis. */
  VELOCITY_WINDOW_SESSIONS: 10,
  /** Days in the profile aggregation window. */
  PROFILE_WINDOW_DAYS: 90,

  // ── Forecast confidence interval ─────────────────────────────────────
  /** Multiplier for optimistic (low) completion date. */
  FORECAST_OPTIMISTIC_MULTIPLIER: 0.80,
  /** Multiplier for pessimistic (high) completion date. */
  FORECAST_PESSIMISTIC_MULTIPLIER: 1.40,
});
