/**
 * StudentIntelligenceProfile — the canonical output of the Siraja
 * Intelligence Platform for a single student.
 *
 * Every field is computed deterministically from platform data using
 * local rule-based engines — no external AI service is involved.
 * Values are intentionally plain numbers/strings so they serialise
 * cleanly over the API without any additional transformation.
 */
export interface StudentIntelligenceProfile {
  studentId: string;
  tenantId: string;
  generatedAt: Date;

  // ── Core scores (0–100) ───────────────────────────────────────────────────
  /** Composite memorization performance score. */
  memorizationScore: number;
  /** Composite revision retention score. */
  revisionScore: number;
  /** Active-day frequency score over the last 30 days. */
  consistencyScore: number;
  /** Attendance rate score derived from session attendance records. */
  attendanceScore: number;

  // ── Diagnostic indices ────────────────────────────────────────────────────
  /**
   * Difficulty index (0–100). Higher values indicate the student is
   * struggling; lower values indicate comfortable progress.
   */
  difficultyIndex: number;
  /**
   * Risk that memorized ayahs will be forgotten without prompt revision.
   * Derived from SM-2 overdue count and time-since-activity.
   */
  forgettingRisk: 'low' | 'medium' | 'high';

  // ── Temporal patterns ─────────────────────────────────────────────────────
  /**
   * Time window in which this student performs best during memorization
   * sessions, inferred from the hour distribution of `evaluatedAt` on
   * completed memorization records.
   */
  bestMemorizationTime: 'morning' | 'afternoon' | 'evening' | 'unknown';
  /**
   * Time window in which this student performs best during revision
   * sessions, inferred from `reviewedAt` timestamps.
   */
  bestRevisionTime: 'morning' | 'afternoon' | 'evening' | 'unknown';

  // ── Velocity & retention ─────────────────────────────────────────────────
  /** Average ayahs memorized per completed memorization session. */
  learningSpeed: number;
  /**
   * Percentage of memorized ayahs with masteryScore ≥ 60 — a proxy for
   * how much of the memorized corpus the student is actively retaining.
   */
  retentionRate: number;

  // ── Pace snapshot ─────────────────────────────────────────────────────────
  dailyPaceAyahs: number;
  weeklyPaceAyahs: number;
  activeDaysLast30: number;
  totalAyahsMemorized: number;
  memorizationPercentage: number;

  // ── Revision snapshot ─────────────────────────────────────────────────────
  overdueRevisionCount: number;
  revisionBurdenScore: number;

  // ── Mistake snapshot ──────────────────────────────────────────────────────
  totalOpenMistakes: number;
  dominantMistakeType: string | null;
  mistakeResolutionRate: number;
}
