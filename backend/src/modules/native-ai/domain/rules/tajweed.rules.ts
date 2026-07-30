/**
 * TajweedRules — tunable constants for tajweed analysis thresholds.
 *
 * All values are frozen at import time; override in tests by replacing
 * the imported object rather than mutating it.
 */
export const TajweedRules = Object.freeze({
  // ── Madd beat counts ──────────────────────────────────────────────────
  /** Natural madd (madd tabii): 2 counts. */
  MADD_TABII_COUNTS: 2,
  /** Connected madd (madd muttasil): 4–5 counts. Minimum is 4. */
  MADD_MUTTASIL_MIN_COUNTS: 4,
  MADD_MUTTASIL_MAX_COUNTS: 5,
  /** Obligatory madd (madd lazim): exactly 6 counts. */
  MADD_LAZIM_COUNTS: 6,
  /** Ghunna (noon/meem with shadda): 2 counts. */
  GHUNNA_COUNTS: 2,
  /** Tolerance (±beats) for madd duration measurement. */
  MADD_TOLERANCE: 1,

  // ── Thresholds ────────────────────────────────────────────────────────
  /**
   * A mistake type is "systematic" when it appears in ≥ this many
   * words in the session.
   */
  RECURRENCE_THRESHOLD: 3,

  /**
   * Maximum acceptable mistake rate (mistakes / expected words) before
   * a "critical" flag is raised in the classification engine.
   */
  MAX_ACCEPTABLE_MISTAKE_RATE: 0.10,

  /**
   * Minimum tajweed score (0–100) considered "passing".
   */
  MIN_PASSING_SCORE: 60,

  /**
   * Critical tajweed score — below this the student needs immediate
   * remediation.
   */
  CRITICAL_SCORE_THRESHOLD: 40,

  // ── Waqf / pause ──────────────────────────────────────────────────────
  /** Gap (seconds) that constitutes a meaningful pause between words. */
  PAUSE_THRESHOLD_SECONDS: 1.0,

  /** Gap that constitutes a complete stop (waqf tam) mid-utterance. */
  FULL_STOP_THRESHOLD_SECONDS: 1.5,

  // ── Rule categories for sorting ───────────────────────────────────────
  CRITICAL_RULES: Object.freeze([
    'idgham_bighunn', 'iqlab', 'ikhfa', 'madd_muttasil', 'madd_lazim',
  ]),

  MAJOR_RULES: Object.freeze([
    'idhar', 'idgham_bilaghunna', 'madd_tabii', 'qalqala_kubra', 'ghunna',
  ]),

  MINOR_RULES: Object.freeze([
    'qalqala_sughra', 'lam_shamsiyya', 'lam_qamariyya', 'tafkhim', 'tarqiq',
  ]),
});
