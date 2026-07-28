/**
 * AttendanceRules — rule constants for attendance scoring and alerting.
 */
export const AttendanceRules = Object.freeze({
  /**
   * Attendance rate (%) considered "Good" — above this the student
   * receives a positive attendance score with no penalty.
   */
  MIN_RATE_GOOD: 80,

  /**
   * Attendance rate (%) considered "Acceptable".
   */
  MIN_RATE_ACCEPTABLE: 65,

  /**
   * Attendance rate (%) below which the student is flagged as "critical"
   * and a high-priority recommendation fires.
   */
  CRITICAL_RATE: 50,

  /**
   * Number of consecutive absences that triggers an alert regardless of
   * overall attendance rate (streak detection).
   */
  ABSENCE_STREAK_ALERT: 3,

  /**
   * Maximum excused absences per 30-day window before they are counted
   * toward the problem threshold.
   */
  MAX_EXCUSED_PER_MONTH: 4,

  /**
   * Score (0–100) awarded for attendance rate ≥ MIN_RATE_GOOD.
   */
  SCORE_EXCELLENT: 100,

  /**
   * Score (0–100) awarded for attendance rate between ACCEPTABLE and GOOD.
   */
  SCORE_ACCEPTABLE: 70,

  /**
   * Score (0–100) awarded for attendance rate between CRITICAL and ACCEPTABLE.
   */
  SCORE_LOW: 40,

  /**
   * Score (0–100) awarded for attendance rate below CRITICAL_RATE.
   */
  SCORE_CRITICAL: 15,
} as const);
