/**
 * AiForecast — projected memorization completion timeline produced by
 * the AI Forecast Engine.
 */

export interface Milestone {
  /** Human-readable label, e.g. "Complete Juz 2". */
  label: string;
  /** Ayah count at which this milestone is reached. */
  targetAyahs: number;
  estimatedDate: Date;
  /** Probability (0–1) of reaching this milestone on time. */
  probability: number;
}

export interface AiForecast {
  /** Total ayahs in the memorization goal. */
  targetAyahs: number;
  /** Ayahs memorized to date. */
  currentProgress: number;
  remainingAyahs: number;

  /** Actual pace in ayahs/week over the last 4 weeks. */
  velocity: number;
  /** Pace adjusted for review burden (may be lower than velocity). */
  projectedVelocity: number;

  estimatedCompletionDate: Date;
  /** 80 % confidence interval low bound. */
  confidenceLow: Date;
  /** 80 % confidence interval high bound. */
  confidenceHigh: Date;

  /** Minimum weekly pace required to hit the user's goal date (if set). */
  weeklyPaceRequired: number;
  isOnTrack: boolean;

  /**
   * Probability (0–1) of completing by the estimated date.
   * Computed from velocity variance over the observation window.
   */
  completionProbability: number;

  milestones: Milestone[];

  /**
   * Review burden score (0–100).
   * Higher values mean a large portion of capacity is consumed by
   * reviewing previously memorized material.
   */
  burdenScore: number;
}
