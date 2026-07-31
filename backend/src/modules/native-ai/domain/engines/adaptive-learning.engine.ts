import { MemorizationRules } from '../rules/memorization.rules';
import type { MistakePattern } from '../entities/mistake-classification.entity';
import type { AdaptivePlan, DaySchedule, FocusArea } from '../entities/adaptive-plan.entity';
import type { TajweedRuleType } from '../entities/tajweed-rule-application.entity';

/**
 * AdaptivePlanInput — all signals required by the `AdaptiveLearningEngine`
 * to generate a personalised weekly study plan.
 */
export interface AdaptivePlanInput {
  /** Current difficulty level 1 (beginner) – 5 (advanced). */
  currentDifficultyLevel: number;
  /** Actual memorization pace in ayahs per week. */
  velocity: number;
  /** Review burden score (0–100). */
  burdenScore: number;
  /** Daily forgetting rate (0–1). */
  forgettingRate: number;
  /** Systematic mistake patterns to target. */
  systematicMistakes: MistakePattern[];
  /** Tajweed rules identified as weak areas. */
  tajweedWeaknesses: TajweedRuleType[];
  /** Remaining weeks until the student's memorization goal date. */
  estimatedWeeksToGoal: number;
}

/**
 * AdaptiveLearningEngine — generates a personalised `AdaptivePlan`
 * that accounts for burden, forgetting rate, systematic mistakes, and
 * tajweed weaknesses.
 *
 * No NestJS dependencies — instantiate with `new AdaptiveLearningEngine()`.
 */
export class AdaptiveLearningEngine {
  // ── Day-of-week constants (0=Sun … 6=Sat) ────────────────────────────────

  /** Default active study days (skip Friday=5 and Saturday=6). */
  private readonly ACTIVE_DAYS: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4];

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a personalised `AdaptivePlan` from the provided signals.
   *
   * @param input All adaptive-planning signals for a student.
   * @returns A fully-populated `AdaptivePlan`.
   */
  buildPlan(input: AdaptivePlanInput): AdaptivePlan {
    const rationale: string[] = [];

    // ── Adjusted weekly pace ───────────────────────────────────────────────
    let adjustedWeeklyPace = input.velocity;
    if (input.burdenScore > MemorizationRules.CRITICAL_BURDEN_SCORE) {
      adjustedWeeklyPace = Math.max(0, input.velocity * 0.5);
      rationale.push(
        `Weekly pace reduced by 50% (critical burden score: ${input.burdenScore}).`,
      );
    } else if (input.burdenScore > MemorizationRules.HIGH_BURDEN_SCORE) {
      adjustedWeeklyPace = Math.max(0, input.velocity * 0.75);
      rationale.push(
        `Weekly pace reduced by 25% (high burden score: ${input.burdenScore}).`,
      );
    } else {
      rationale.push(`Weekly pace unchanged at ${input.velocity.toFixed(1)} ayahs/week.`);
    }

    // ── Review emphasis ────────────────────────────────────────────────────
    const reviewEmphasis = Math.min(0.70, Math.max(0.10, input.burdenScore / 100 * 0.70));
    rationale.push(
      `Review emphasis set to ${Math.round(reviewEmphasis * 100)}% of session time.`,
    );

    // ── Session length ─────────────────────────────────────────────────────
    const burdenFactor = Math.min(input.burdenScore / 100, 1);
    const sessionMinutes = Math.round(
      MemorizationRules.OPTIMAL_SESSION_MINUTES -
        burdenFactor * (MemorizationRules.OPTIMAL_SESSION_MINUTES - MemorizationRules.MIN_SESSION_MINUTES),
    );

    // ── Weekly schedule (5 active days) ───────────────────────────────────
    const dailyNewTarget = adjustedWeeklyPace / this.ACTIVE_DAYS.length;
    const reviewRatio = reviewEmphasis / Math.max(1 - reviewEmphasis, 0.01);
    const dailyReviewTarget = Math.round(dailyNewTarget * reviewRatio);
    const hasTajweedPractice = input.tajweedWeaknesses.length > 0;

    const weeklySchedule: DaySchedule[] = [];

    // Active days
    for (const day of this.ACTIVE_DAYS) {
      weeklySchedule.push({
        dayOfWeek: day,
        sessionMinutes,
        newAyahsTarget: Math.max(0, Math.round(dailyNewTarget * 10) / 10),
        reviewAyahsTarget: dailyReviewTarget,
        tajweedPractice: hasTajweedPractice,
        preferredTimeOfDay: 'morning',
      });
    }

    // Rest days (Friday=5, Saturday=6) — light review only
    const restDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [5, 6];
    for (const day of restDays) {
      weeklySchedule.push({
        dayOfWeek: day,
        sessionMinutes: 0,
        newAyahsTarget: 0,
        reviewAyahsTarget: 0,
        tajweedPractice: false,
      });
    }

    // Sort schedule by day of week
    weeklySchedule.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    // ── Focus areas ────────────────────────────────────────────────────────
    const focusAreas: FocusArea[] = [];

    // From systematic mistakes
    for (const mistake of input.systematicMistakes) {
      const isTajweed = mistake.category === 'tajweed_violation' ||
        mistake.category === 'elongation_error' ||
        mistake.category === 'nasalization_error';

      focusAreas.push({
        area: isTajweed ? 'tajweed' : 'memorization',
        specifics: [
          `${mistake.category} (${mistake.frequency} occurrences)`,
          `Positions: ${mistake.affectedPositions.slice(0, 5).join(', ')}`,
        ],
        priority: focusAreas.length + 1,
        estimatedImprovementWeeks: Math.min(4 + Math.ceil(mistake.frequency / 2), 12),
      });
    }

    // From tajweed weaknesses
    if (input.tajweedWeaknesses.length > 0) {
      focusAreas.push({
        area: 'tajweed',
        specifics: input.tajweedWeaknesses.map(String),
        priority: focusAreas.length + 1,
        estimatedImprovementWeeks: Math.min(2 + input.tajweedWeaknesses.length, 8),
      });
      rationale.push(
        `Tajweed focus on ${input.tajweedWeaknesses.length} weak rule(s): ${input.tajweedWeaknesses.join(', ')}.`,
      );
    }

    if (input.systematicMistakes.length > 0) {
      rationale.push(
        `${input.systematicMistakes.length} systematic mistake pattern(s) added as focus areas.`,
      );
    }

    return {
      adjustedWeeklyPace,
      difficultyLevel: input.currentDifficultyLevel,
      reviewEmphasis,
      weeklySchedule,
      focusAreas,
      tajweedFocusRules: input.tajweedWeaknesses,
      estimatedWeeksToGoal: input.estimatedWeeksToGoal,
      rationale,
    };
  }
}
