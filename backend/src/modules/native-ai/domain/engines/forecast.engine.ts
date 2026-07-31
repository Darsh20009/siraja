import { MemorizationRules } from '../rules/memorization.rules';
import type { AiForecast, Milestone } from '../entities/ai-forecast.entity';

/**
 * ForecastInput — all data points required by the `ForecastEngine`
 * to produce a memorization completion forecast.
 */
export interface ForecastInput {
  /** Total ayahs in the memorization goal. */
  targetAyahs: number;
  /** Ayahs memorized to date. */
  currentProgress: number;
  /** Weekly velocity history, oldest first (ayahs/week per week). */
  weeklyVelocities: number[];
  /** Current review burden score (0–100). */
  burdenScore: number;
  /** Number of overdue review items. */
  reviewOverdueCount: number;
}

/**
 * ForecastEngine — projects a memorization completion timeline using
 * velocity analysis, burden adjustment, and statistical confidence
 * interval estimation.
 *
 * No NestJS dependencies — instantiate with `new ForecastEngine()`.
 */
export class ForecastEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Compute a full `AiForecast` from the provided input.
   *
   * @param input Current progress, velocity history, and burden metrics.
   * @returns A fully-populated `AiForecast`.
   */
  compute(input: ForecastInput): AiForecast {
    const windowVelocities = input.weeklyVelocities.slice(
      -MemorizationRules.VELOCITY_WINDOW_SESSIONS,
    );

    const velocity = this.computeVelocity(windowVelocities);
    const stddev = this.stdDev(windowVelocities, velocity);

    // Burden reduces effective projected velocity by up to 30%
    const projectedVelocity = Math.max(
      0.1,
      velocity * (1 - (input.burdenScore / 100) * 0.30),
    );

    const remainingAyahs = Math.max(0, input.targetAyahs - input.currentProgress);
    const weeksToComplete = remainingAyahs / Math.max(projectedVelocity, 0.1);
    const weeklyPaceRequired = remainingAyahs / Math.max(weeksToComplete, 1);

    const now = new Date();
    const estimatedCompletionDate = this.addWeeks(now, weeksToComplete);
    const confidenceLow = this.addWeeks(
      now,
      weeksToComplete * MemorizationRules.FORECAST_OPTIMISTIC_MULTIPLIER,
    );
    const confidenceHigh = this.addWeeks(
      now,
      weeksToComplete * MemorizationRules.FORECAST_PESSIMISTIC_MULTIPLIER,
    );

    const isOnTrack = velocity >= MemorizationRules.MIN_ACTIVE_VELOCITY;

    // Completion probability from coefficient of variation
    const completionProbability = this.computeCompletionProbability(velocity, stddev);

    const milestones = this.computeMilestones(
      input.currentProgress,
      input.targetAyahs,
      projectedVelocity,
      completionProbability,
      now,
    );

    return {
      targetAyahs: input.targetAyahs,
      currentProgress: input.currentProgress,
      remainingAyahs,
      velocity,
      projectedVelocity,
      estimatedCompletionDate,
      confidenceLow,
      confidenceHigh,
      weeklyPaceRequired,
      isOnTrack,
      completionProbability,
      milestones,
      burdenScore: input.burdenScore,
    };
  }

  /**
   * Compute the mean weekly velocity from a velocity history array.
   * Returns 1 for empty or zero-sum arrays to prevent division by zero.
   *
   * @param weeklyVelocities Array of per-week ayah counts.
   * @returns Mean velocity (ayahs/week).
   */
  computeVelocity(weeklyVelocities: number[]): number {
    if (weeklyVelocities.length === 0) return 1;
    const sum = weeklyVelocities.reduce((acc, v) => acc + v, 0);
    const mean = sum / weeklyVelocities.length;
    return mean <= 0 ? 1 : mean;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Compute the population standard deviation of a numeric series.
   *
   * @param values Array of numbers.
   * @param mean   Pre-computed mean (avoids recomputing).
   * @returns Standard deviation ≥ 0.
   */
  private stdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Compute completion probability from velocity and standard deviation.
   *
   * If stddev is 0 the pace is perfectly consistent → high confidence (0.95).
   * Otherwise uses coefficient of variation: P = max(0.1, 1 - cv × 0.5).
   *
   * @param mean   Mean velocity.
   * @param stddev Standard deviation of velocity.
   * @returns Probability clamped to [0.10, 0.95].
   */
  private computeCompletionProbability(mean: number, stddev: number): number {
    if (stddev === 0) return 0.95;
    const cv = stddev / mean;
    return Math.min(0.95, Math.max(0.10, 1 - cv * 0.5));
  }

  /**
   * Compute 25 %, 50 %, 75 %, and 100 % completion milestones.
   *
   * @param currentProgress  Ayahs memorized so far.
   * @param targetAyahs      Total goal ayahs.
   * @param projectedVelocity Burden-adjusted weekly pace.
   * @param baseProbability  Base completion probability.
   * @param now              Reference date for offset calculation.
   * @returns Array of `Milestone` objects.
   */
  private computeMilestones(
    currentProgress: number,
    targetAyahs: number,
    projectedVelocity: number,
    baseProbability: number,
    now: Date,
  ): Milestone[] {
    const fractions = [0.25, 0.50, 0.75, 1.00];
    const labels = ['25% Complete', '50% Complete', '75% Complete', '100% Complete'];

    return fractions.map((fraction, idx) => {
      const milestoneAyahs = Math.round(targetAyahs * fraction);
      const remaining = Math.max(0, milestoneAyahs - currentProgress);
      const weeksToMilestone = remaining / Math.max(projectedVelocity, 0.1);
      const estimatedDate = this.addWeeks(now, weeksToMilestone);
      // Probability decreases slightly for further milestones
      const probability = Math.max(0.05, baseProbability - idx * 0.05);

      return {
        label: labels[idx],
        targetAyahs: milestoneAyahs,
        estimatedDate,
        probability,
      };
    });
  }

  /** Add a fractional number of weeks to a date and return a new Date. */
  private addWeeks(base: Date, weeks: number): Date {
    const ms = weeks * 7 * 24 * 60 * 60 * 1000;
    return new Date(base.getTime() + ms);
  }
}
