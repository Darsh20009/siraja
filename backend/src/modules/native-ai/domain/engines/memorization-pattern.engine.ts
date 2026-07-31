import {
  SM2_MIN_EASE,
  SM2_DEFAULT_EASE,
  SM2_EASE_STEP,
  EBBINGHAUS_STABILITY,
  HIGH_FORGETTING_RATE,
} from '../rules/arabic.rules';
import { MemorizationRules } from '../rules/memorization.rules';
import type { Sm2Result, MemorizationPattern } from '../entities/memorization-pattern.entity';

/**
 * SessionRecord — a single study session result used by
 * `MemorizationPatternEngine.analyze`.
 */
export interface SessionRecord {
  /** SM-2 grade 0–5 for this session. */
  grade: number;
  /** Date/time when the session occurred. */
  date: Date;
  /** Optional session duration in minutes. */
  durationMinutes?: number;
}

/**
 * MemorizationPatternEngine — SM-2 spaced-repetition scheduling and
 * Ebbinghaus-based retention modelling.
 *
 * Processes a chronological series of session records to produce a
 * `MemorizationPattern` that downstream engines can use for adaptive
 * planning and recommendations.
 *
 * No NestJS dependencies — instantiate with `new MemorizationPatternEngine()`.
 */
export class MemorizationPatternEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Apply a single SM-2 review cycle.
   *
   * @param easeFactor  Current ease factor (start: SM2_DEFAULT_EASE = 2.5).
   * @param interval    Current inter-repetition interval in days.
   * @param repetitions Number of consecutive successful reviews so far.
   * @param grade       Student's self-assessment grade 0–5.
   * @returns Updated `Sm2Result` with new ease factor, interval, and repetitions.
   */
  computeSm2(
    easeFactor: number,
    interval: number,
    repetitions: number,
    grade: number,
  ): Sm2Result {
    if (grade >= MemorizationRules.SM2_PASS_GRADE) {
      // Successful recall — advance the interval
      let newInterval: number;
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * easeFactor);
      }

      const newEase = Math.max(
        SM2_MIN_EASE,
        easeFactor + SM2_EASE_STEP * (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
      );

      return {
        easeFactor: newEase,
        interval: newInterval,
        repetitions: repetitions + 1,
      };
    } else {
      // Failed recall — reset to beginning
      return {
        easeFactor: Math.max(SM2_MIN_EASE, easeFactor - 0.20),
        interval: 1,
        repetitions: 0,
      };
    }
  }

  /**
   * Compute Ebbinghaus retention probability at a given point in time.
   *
   * Formula: R = e^(-t / (S × EBBINGHAUS_STABILITY))
   *
   * @param daysSinceReview Number of days elapsed since the last review.
   * @param stability       Memory stability (typically the SM-2 interval in days).
   * @returns Retention probability clamped to [0, 1].
   */
  computeRetention(daysSinceReview: number, stability: number): number {
    if (stability <= 0) return 0;
    const r = Math.exp(-daysSinceReview / (stability * EBBINGHAUS_STABILITY));
    return Math.min(1, Math.max(0, r));
  }

  /**
   * Compute a daily forgetting rate from the 24-hour retention probability.
   *
   * @param retention24h Retention probability after 1 day.
   * @returns Daily forgetting rate clamped to [0, 1].
   */
  computeForgettingRate(retention24h: number): number {
    return Math.max(0, Math.min(1, 1 - retention24h));
  }

  /**
   * Analyse a chronological series of sessions to produce a full
   * `MemorizationPattern`.
   *
   * @param sessions Chronologically ordered session records.
   * @returns A populated `MemorizationPattern`.
   */
  analyze(sessions: SessionRecord[]): MemorizationPattern {
    if (sessions.length === 0) {
      return this.defaultPattern();
    }

    // Process sessions in chronological order through SM-2
    const sorted = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());

    let easeFactor = SM2_DEFAULT_EASE;
    let interval = 1;
    let repetitions = 0;

    for (const session of sorted) {
      const result = this.computeSm2(easeFactor, interval, repetitions, session.grade);
      easeFactor = result.easeFactor;
      interval = result.interval;
      repetitions = result.repetitions;
    }

    // Retention based on days since last session
    const lastSession = sorted[sorted.length - 1];
    const now = Date.now();
    const daysSinceLast = (now - lastSession.date.getTime()) / (1000 * 60 * 60 * 24);
    const retentionProbability = this.computeRetention(daysSinceLast, interval);

    // Forgetting rate from the base 1-day retention at stability=1
    const baseRetention24h = this.computeRetention(1, 1);
    const forgettingRate = this.computeForgettingRate(baseRetention24h);

    // Optimal study time from sessions with grade >= 4
    const optimalStudyTime = this.inferOptimalStudyTime(sorted);

    // Recommended session length: decreases as repetitions grow
    const loadFactor = Math.min(repetitions / 20, 1); // 0..1
    const recommendedSessionLength = Math.round(
      MemorizationRules.MAX_SESSION_MINUTES -
        loadFactor * (MemorizationRules.MAX_SESSION_MINUTES - MemorizationRules.MIN_SESSION_MINUTES),
    );

    // New-to-review ratio
    const newToReviewRatio =
      forgettingRate > HIGH_FORGETTING_RATE
        ? MemorizationRules.MIN_NEW_REVIEW_RATIO
        : MemorizationRules.DEFAULT_NEW_REVIEW_RATIO;

    // Weekly capacity
    const sessionsPerWeek =
      (MemorizationRules.OPTIMAL_SESSION_MINUTES / recommendedSessionLength) * 7;
    const weeklyCapacity = Math.max(1, Math.min(Math.round(sessionsPerWeek * newToReviewRatio * 5), 50));

    return {
      easeFactor,
      interval,
      repetitions,
      retentionProbability,
      forgettingRate,
      optimalStudyTime,
      recommendedSessionLength,
      newToReviewRatio,
      weeklyCapacity,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Return a default pattern for a student with no history. */
  private defaultPattern(): MemorizationPattern {
    return {
      easeFactor: SM2_DEFAULT_EASE,
      interval: 1,
      repetitions: 0,
      retentionProbability: 1,
      forgettingRate: HIGH_FORGETTING_RATE,
      optimalStudyTime: 'any',
      recommendedSessionLength: MemorizationRules.OPTIMAL_SESSION_MINUTES,
      newToReviewRatio: MemorizationRules.DEFAULT_NEW_REVIEW_RATIO,
      weeklyCapacity: 5,
    };
  }

  /**
   * Infer the optimal study time from sessions where the student
   * performed well (grade >= 4).
   */
  private inferOptimalStudyTime(
    sessions: SessionRecord[],
  ): 'morning' | 'afternoon' | 'evening' | 'any' {
    const goodSessions = sessions.filter((s) => s.grade >= 4);
    if (goodSessions.length === 0) return 'any';

    const counts = { morning: 0, afternoon: 0, evening: 0 };
    for (const s of goodSessions) {
      const hour = s.date.getHours();
      if (hour >= 6 && hour < 12) counts.morning++;
      else if (hour >= 12 && hour < 17) counts.afternoon++;
      else counts.evening++;
    }

    const max = Math.max(counts.morning, counts.afternoon, counts.evening);
    if (max === 0) return 'any';
    if (counts.morning === max) return 'morning';
    if (counts.afternoon === max) return 'afternoon';
    return 'evening';
  }
}
