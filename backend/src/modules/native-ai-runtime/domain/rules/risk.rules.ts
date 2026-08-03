/**
 * Risk Rules — immutable threshold constants for the PredictiveRiskEngine.
 * All values are tuned against the Siraja memorization model.
 */
export const RiskRules = {
  // ── Inactivity ───────────────────────────────────────────────────────────
  /** Days without a session before "absence_detected" fires. */
  ABSENCE_DAYS_THRESHOLD: 7,
  /** Days without a session before risk becomes "critical". */
  CRITICAL_ABSENCE_DAYS: 21,

  // ── Velocity ─────────────────────────────────────────────────────────────
  /** Ayahs/week below which declining-velocity risk fires. */
  MIN_SAFE_VELOCITY: 2,
  /** Ayahs/week below which velocity is considered critically low. */
  CRITICAL_VELOCITY: 0.5,

  // ── Burden ───────────────────────────────────────────────────────────────
  /** Review burden score above which high-burden risk fires. */
  HIGH_BURDEN_THRESHOLD: 60,
  /** Review burden score above which burden risk is critical. */
  CRITICAL_BURDEN_THRESHOLD: 80,

  // ── Retention ────────────────────────────────────────────────────────────
  /** Retention probability (0–1) below which low-retention risk fires. */
  LOW_RETENTION_THRESHOLD: 0.60,
  /** Retention probability (0–1) below which retention risk is critical. */
  CRITICAL_RETENTION_THRESHOLD: 0.40,

  // ── Tajweed ──────────────────────────────────────────────────────────────
  /** Tajweed score 0–100 below which low-tajweed risk fires. */
  LOW_TAJWEED_THRESHOLD: 50,
  /** Tajweed score 0–100 below which tajweed risk is critical. */
  CRITICAL_TAJWEED_THRESHOLD: 30,

  // ── Mistake rate ─────────────────────────────────────────────────────────
  /** Mistakes-per-ayah (× 100) above which systematic-mistake risk fires. */
  HIGH_MISTAKE_RATE_THRESHOLD: 15,

  // ── Risk score band boundaries (0–100) ───────────────────────────────────
  LOW_RISK_MAX: 25,
  MEDIUM_RISK_MAX: 50,
  HIGH_RISK_MAX: 75,
  // score > HIGH_RISK_MAX is "critical"

  // ── Factor weights (must sum to 1.0) ─────────────────────────────────────
  WEIGHT_INACTIVITY: 0.25,
  WEIGHT_VELOCITY: 0.20,
  WEIGHT_BURDEN: 0.15,
  WEIGHT_RETENTION: 0.20,
  WEIGHT_TAJWEED: 0.10,
  WEIGHT_MISTAKES: 0.10,
} as const;
