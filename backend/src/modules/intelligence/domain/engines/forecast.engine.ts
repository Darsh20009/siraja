import { RevisionRules } from '../rules/revision.rules';
import { MemorizationRules } from '../rules/memorization.rules';

const TOTAL_QURAN_AYAHS = 6236;

export interface ForecastInput {
  totalAyahsMemorized: number;
  dailyPaceAyahs: number;
  activeDaysLast30: number;
  overdueRevisionCount: number;
  revisionBurdenScore: number;
  consistencyScore: number;
}

export interface IntelligenceForecast {
  totalAyahsMemorized: number;
  remainingAyahs: number;
  memorizationPercentage: number;

  // ── Raw forecast ──────────────────────────────────────────────────────────
  estimatedDaysRemaining: number | null;
  estimatedCompletionDate: string | null;

  // ── Burden-adjusted forecast ──────────────────────────────────────────────
  adjustedDaysRemaining: number | null;
  adjustedCompletionDate: string | null;

  revisionBurdenScore: number;
  overdueRevisionCount: number;

  /**
   * Weekly ayahs to revise to clear the overdue backlog within 30 days,
   * in addition to new memorization.
   */
  weeklyRevisionNeededToClearBacklog: number;

  completionRisk: 'on-track' | 'at-risk' | 'behind';
  paceLabel: 'excellent' | 'good' | 'moderate' | 'slow' | 'inactive';

  consistencyScore: number;
  activeDaysLast30: number;
}

/**
 * ForecastEngine — pure, deterministic.
 *
 * Computes enhanced completion forecasts including revision burden
 * adjustments. Designed to complement (not replace) the existing
 * GetCompletionForecastUseCase — this engine is scoped to the
 * Intelligence Platform's profile aggregation.
 */
export class ForecastEngine {
  compute(input: ForecastInput): IntelligenceForecast {
    const {
      totalAyahsMemorized, dailyPaceAyahs, activeDaysLast30,
      overdueRevisionCount, revisionBurdenScore, consistencyScore,
    } = input;

    const now = new Date();
    const remainingAyahs = Math.max(0, TOTAL_QURAN_AYAHS - totalAyahsMemorized);
    const memorizationPercentage = parseFloat(((totalAyahsMemorized / TOTAL_QURAN_AYAHS) * 100).toFixed(2));

    // ── Raw forecast ──────────────────────────────────────────────────────────
    let estimatedDaysRemaining: number | null = null;
    let estimatedCompletionDate: string | null = null;

    if (remainingAyahs === 0) {
      estimatedDaysRemaining = 0;
      estimatedCompletionDate = now.toISOString().split('T')[0];
    } else if (dailyPaceAyahs > 0) {
      estimatedDaysRemaining = Math.ceil(remainingAyahs / dailyPaceAyahs);
      const d = new Date(now);
      d.setDate(d.getDate() + estimatedDaysRemaining);
      estimatedCompletionDate = d.toISOString().split('T')[0];
    }

    // ── Burden-adjusted forecast ──────────────────────────────────────────────
    let adjustedDaysRemaining: number | null = null;
    let adjustedCompletionDate: string | null = null;

    if (remainingAyahs === 0) {
      adjustedDaysRemaining = 0;
      adjustedCompletionDate = now.toISOString().split('T')[0];
    } else if (dailyPaceAyahs > 0) {
      // Heavy backlog reduces effective new-memorization capacity
      const adjustedCapacity = dailyPaceAyahs * Math.max(0.3, 1 - revisionBurdenScore / 200);
      adjustedDaysRemaining = Math.ceil(remainingAyahs / adjustedCapacity);
      const d = new Date(now);
      d.setDate(d.getDate() + adjustedDaysRemaining);
      adjustedCompletionDate = d.toISOString().split('T')[0];
    }

    // ── Revision backlog clearance ────────────────────────────────────────────
    // To clear all overdue ayahs in 30 days (4 weeks), need overdueCount/4 per week
    const weeklyRevisionNeededToClearBacklog = overdueRevisionCount > 0
      ? Math.ceil(overdueRevisionCount / 4)
      : 0;

    // ── Completion risk ───────────────────────────────────────────────────────
    let completionRisk: IntelligenceForecast['completionRisk'];
    if (estimatedDaysRemaining === null) {
      completionRisk = 'behind';
    } else if (revisionBurdenScore >= RevisionRules.HIGH_BURDEN_THRESHOLD) {
      completionRisk = 'at-risk';
    } else if (consistencyScore >= 70 && dailyPaceAyahs >= MemorizationRules.TARGET_AYAHS_PER_SESSION) {
      completionRisk = 'on-track';
    } else if (consistencyScore >= 40) {
      completionRisk = 'at-risk';
    } else {
      completionRisk = 'behind';
    }

    // ── Pace label ────────────────────────────────────────────────────────────
    let paceLabel: IntelligenceForecast['paceLabel'];
    if (dailyPaceAyahs <= 0) paceLabel = 'inactive';
    else if (dailyPaceAyahs >= MemorizationRules.EXCELLENT_AYAHS_PER_SESSION) paceLabel = 'excellent';
    else if (dailyPaceAyahs >= MemorizationRules.TARGET_AYAHS_PER_SESSION) paceLabel = 'good';
    else if (dailyPaceAyahs >= 2) paceLabel = 'moderate';
    else paceLabel = 'slow';

    return {
      totalAyahsMemorized,
      remainingAyahs,
      memorizationPercentage,
      estimatedDaysRemaining,
      estimatedCompletionDate,
      adjustedDaysRemaining,
      adjustedCompletionDate,
      revisionBurdenScore,
      overdueRevisionCount,
      weeklyRevisionNeededToClearBacklog,
      completionRisk,
      paceLabel,
      consistencyScore,
      activeDaysLast30,
    };
  }
}
