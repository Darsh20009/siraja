import { HIGH_FORGETTING_RATE } from '../rules/arabic.rules';
import { MemorizationRules } from '../rules/memorization.rules';
import { TajweedRules } from '../rules/tajweed.rules';
import type { MistakePattern } from '../entities/mistake-classification.entity';
import type { AiRecommendation, AiRecommendationTarget } from '../entities/ai-recommendation.entity';

/**
 * RecommendationInput — all signals needed by the `RecommendationEngine`
 * to generate personalised study recommendations.
 */
export interface RecommendationInput {
  /** Actual memorization pace in ayahs per week. */
  velocity: number;
  /** Daily forgetting rate (0–1). */
  forgettingRate: number;
  /** Current retention probability (0–1). */
  retentionProbability: number;
  /** Review burden score (0–100). */
  burdenScore: number;
  /** Overall tajweed accuracy score (0–100). */
  tajweedScore: number;
  /** Systematic mistake patterns detected in the session. */
  systematicMistakes: MistakePattern[];
  /** Whether the student is on track to reach their goal. */
  isOnTrack: boolean;
  /** Number of days since the last study session. */
  daysSinceLastSession: number;
  /** Estimated sustainable weekly memorization capacity. */
  weeklyCapacity: number;
  /** Current difficulty level 1–5. */
  currentDifficultyLevel: number;
}

/**
 * RecommendationEngine — produces ranked, actionable study recommendations
 * from a set of learning signals.
 *
 * Evaluates 12 independent rules and returns up to 8 recommendations
 * sorted by estimated impact descending.
 *
 * No NestJS dependencies — instantiate with `new RecommendationEngine()`.
 */
export class RecommendationEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate up to 8 prioritised recommendations from the given input signals.
   *
   * @param input All learning-state signals for a student.
   * @returns Array of `AiRecommendation` sorted by `estimatedImpact` descending.
   */
  generate(input: RecommendationInput): AiRecommendation[] {
    const recs: AiRecommendation[] = [];

    // ── Rule 1: critical burden ──────────────────────────────────────────────
    if (input.burdenScore > MemorizationRules.CRITICAL_BURDEN_SCORE) {
      recs.push({
        type: 'reduce_new_memorization',
        priority: 'critical',
        title: 'Pause New Memorization',
        description:
          'Your review burden is critically high. Adding new ayahs now will increase forgetting. ' +
          'Focus entirely on consolidating what you already know.',
        actionItems: [
          'Stop memorizing new ayahs for at least one week.',
          'Review all overdue ayahs before attempting new material.',
          'Use shorter, more frequent sessions to clear the review backlog.',
          'Track your retention score daily until it rises above 80%.',
        ],
        estimatedImpact: 90,
        confidenceScore: 92,
        triggeredBy: ['burdenScore'],
        targetArea: 'review' as AiRecommendationTarget,
      });
    }

    // ── Rule 2: high burden ──────────────────────────────────────────────────
    if (
      input.burdenScore > MemorizationRules.HIGH_BURDEN_SCORE &&
      input.burdenScore <= MemorizationRules.CRITICAL_BURDEN_SCORE
    ) {
      recs.push({
        type: 'increase_review_frequency',
        priority: 'high',
        title: 'Increase Review Frequency',
        description:
          'Your review burden is elevated. Review more often to prevent falling behind and ' +
          'to maintain strong retention of memorized material.',
        actionItems: [
          'Add a second daily review session of 10–15 minutes.',
          'Prioritize ayahs with the lowest retention probability.',
          'Reduce new memorization to 1–2 ayahs per day until burden drops.',
        ],
        estimatedImpact: 75,
        confidenceScore: 85,
        triggeredBy: ['burdenScore'],
        targetArea: 'review' as AiRecommendationTarget,
      });
    }

    // ── Rule 3: critical retention ───────────────────────────────────────────
    if (input.retentionProbability < MemorizationRules.LOW_RETENTION_THRESHOLD) {
      recs.push({
        type: 'forgetting_curve_alert',
        priority: 'critical',
        title: 'Forgetting Curve Alert',
        description:
          'Your retention is critically low. You are at high risk of forgetting memorized material. ' +
          'Immediate review is required.',
        actionItems: [
          'Review all previously memorized ayahs today.',
          'Use active recall: recite from memory before checking the text.',
          'Schedule daily review sessions until retention exceeds 80%.',
          'Consider revising from the beginning of the last completed surah.',
        ],
        estimatedImpact: 95,
        confidenceScore: 90,
        triggeredBy: ['retentionProbability'],
        targetArea: 'review' as AiRecommendationTarget,
      });
    }

    // ── Rule 4: critical inactivity ──────────────────────────────────────────
    if (input.daysSinceLastSession > MemorizationRules.CRITICAL_INACTIVITY_DAYS) {
      recs.push({
        type: 'consistency_alert',
        priority: 'critical',
        title: 'Long Absence Detected',
        description:
          `You have not studied in ${input.daysSinceLastSession} days. Extended breaks cause significant ` +
          'forgetting. A structured catch-up plan is recommended.',
        actionItems: [
          'Resume studying immediately with a lighter-than-usual session.',
          'Spend the first three days exclusively on revision.',
          'Set a daily reminder to prevent future long breaks.',
          'Consult your sheikh for a personalized catch-up schedule.',
        ],
        estimatedImpact: 88,
        confidenceScore: 95,
        triggeredBy: ['daysSinceLastSession'],
        targetArea: 'general' as AiRecommendationTarget,
      });
    } else if (input.daysSinceLastSession > MemorizationRules.INACTIVITY_DAYS) {
      // ── Rule 5: moderate inactivity ─────────────────────────────────────
      recs.push({
        type: 'consistency_alert',
        priority: 'high',
        title: 'Consistency Alert',
        description:
          `You have not studied for ${input.daysSinceLastSession} days. Regular practice is essential ` +
          'for retaining Quran memorization.',
        actionItems: [
          'Return to your study schedule today.',
          'Begin with a revision session before new memorization.',
          'Use a habit-tracking app to build a daily study streak.',
        ],
        estimatedImpact: 70,
        confidenceScore: 90,
        triggeredBy: ['daysSinceLastSession'],
        targetArea: 'general' as AiRecommendationTarget,
      });
    }

    // ── Rule 6: critical tajweed ─────────────────────────────────────────────
    if (input.tajweedScore < TajweedRules.CRITICAL_SCORE_THRESHOLD) {
      recs.push({
        type: 'focus_tajweed_rule',
        priority: 'critical',
        title: 'Critical Tajweed Issues',
        description:
          'Your tajweed score is critically low. Fundamental rules are being violated. ' +
          'Pause new memorization and address tajweed immediately.',
        actionItems: [
          'Work with a qualified sheikh on basic tajweed rules.',
          'Practice noon-sakinah rules (idhar, ikhfa, idgham, iqlab) daily.',
          'Use a tajweed-colour-coded Quran to visualise rule applications.',
          'Record yourself reciting and review for errors.',
        ],
        estimatedImpact: 85,
        confidenceScore: 88,
        triggeredBy: ['tajweedScore'],
        targetArea: 'tajweed' as AiRecommendationTarget,
      });
    } else if (input.tajweedScore < TajweedRules.MIN_PASSING_SCORE) {
      // ── Rule 7: passing threshold tajweed ───────────────────────────────
      recs.push({
        type: 'focus_tajweed_rule',
        priority: 'high',
        title: 'Improve Tajweed Score',
        description:
          'Your tajweed score is below the passing threshold. Consistent tajweed practice ' +
          'will significantly improve recitation quality.',
        actionItems: [
          'Dedicate 10 minutes of each session to tajweed-only practice.',
          'Focus on the rules your sheikh has highlighted.',
          'Listen to recitations by renowned qurra and imitate their style.',
        ],
        estimatedImpact: 65,
        confidenceScore: 82,
        triggeredBy: ['tajweedScore'],
        targetArea: 'tajweed' as AiRecommendationTarget,
      });
    }

    // ── Rule 8: systematic mistakes ──────────────────────────────────────────
    for (const mistake of input.systematicMistakes) {
      const priority = mistake.frequency >= TajweedRules.RECURRENCE_THRESHOLD + 2 ? 'high' : 'medium';
      recs.push({
        type: 'address_systematic_mistake',
        priority,
        title: `Address Recurring ${this.formatCategory(mistake.category)} Errors`,
        description:
          `You are making "${mistake.category}" errors repeatedly (${mistake.frequency} times). ` +
          'Systematic mistakes indicate a gap in understanding that must be corrected now.',
        actionItems: [
          `Review the rules related to "${mistake.category}" with your sheikh.`,
          'Isolate the specific words or positions where errors occur.',
          'Practice those words in isolation before reciting the full ayah.',
        ],
        estimatedImpact: 60 + Math.min(mistake.frequency * 3, 30),
        confidenceScore: 80,
        triggeredBy: ['systematicMistakes'],
        targetArea: mistake.category.startsWith('tajweed') ? 'tajweed' : 'memorization' as AiRecommendationTarget,
      });
    }

    // ── Rule 9: milestone celebration ───────────────────────────────────────
    if (input.velocity >= MemorizationRules.EXCELLENT_VELOCITY && input.isOnTrack) {
      recs.push({
        type: 'celebrate_milestone',
        priority: 'low',
        title: 'Excellent Progress — Keep It Up!',
        description:
          `You are memorizing at an excellent pace of ${input.velocity} ayahs/week and are on track ` +
          'to meet your goal. Maintain this momentum.',
        actionItems: [
          'Keep your current study schedule.',
          'Share your progress with your sheikh or study group.',
          'Set a stretch goal for the next milestone.',
        ],
        estimatedImpact: 20,
        confidenceScore: 85,
        triggeredBy: ['velocity', 'isOnTrack'],
        targetArea: 'general' as AiRecommendationTarget,
      });
    }

    // ── Rule 10: increase difficulty ─────────────────────────────────────────
    if (
      input.currentDifficultyLevel < 3 &&
      input.velocity > MemorizationRules.TARGET_VELOCITY
    ) {
      recs.push({
        type: 'adjust_difficulty_up',
        priority: 'medium',
        title: 'Consider Increasing Difficulty',
        description:
          'Your velocity exceeds the target and your current difficulty level is low. ' +
          'Gradually increasing the challenge will accelerate your progress.',
        actionItems: [
          'Ask your sheikh to assign more complex ayahs.',
          'Attempt surahs with higher tajweed density.',
          'Increase your daily ayah target by 1–2 ayahs.',
        ],
        estimatedImpact: 45,
        confidenceScore: 75,
        triggeredBy: ['velocity', 'currentDifficultyLevel'],
        targetArea: 'memorization' as AiRecommendationTarget,
      });
    }

    // ── Rule 11: decrease difficulty ─────────────────────────────────────────
    if (
      input.currentDifficultyLevel > 2 &&
      input.velocity < MemorizationRules.MIN_ACTIVE_VELOCITY
    ) {
      recs.push({
        type: 'adjust_difficulty_down',
        priority: 'high',
        title: 'Reduce Difficulty Level',
        description:
          'Your current pace is very low relative to your difficulty level. ' +
          'Reducing complexity will help rebuild confidence and consistency.',
        actionItems: [
          'Ask your sheikh to assign shorter or simpler ayahs temporarily.',
          'Focus on shorter surahs from Juz Amma to build momentum.',
          'Set smaller daily targets you can achieve consistently.',
        ],
        estimatedImpact: 60,
        confidenceScore: 78,
        triggeredBy: ['velocity', 'currentDifficultyLevel'],
        targetArea: 'memorization' as AiRecommendationTarget,
      });
    }

    // ── Rule 12: high forgetting rate ────────────────────────────────────────
    if (
      input.forgettingRate > HIGH_FORGETTING_RATE &&
      !recs.some((r) => r.type === 'increase_review_frequency')
    ) {
      recs.push({
        type: 'increase_review_frequency',
        priority: 'high',
        title: 'High Forgetting Rate Detected',
        description:
          'You are forgetting material faster than average. Increasing review frequency ' +
          'will reset the forgetting curve and improve long-term retention.',
        actionItems: [
          'Review each ayah within 24 hours of first memorizing it.',
          'Follow the SM-2 spaced-repetition schedule strictly.',
          'Add a morning revision of 5 minutes before new memorization.',
        ],
        estimatedImpact: 72,
        confidenceScore: 83,
        triggeredBy: ['forgettingRate'],
        targetArea: 'review' as AiRecommendationTarget,
      });
    }

    // Sort by estimated impact descending and cap at 8
    return recs
      .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
      .slice(0, 8);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Format a mistake category key into a readable title-case label. */
  private formatCategory(category: string): string {
    return category
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
