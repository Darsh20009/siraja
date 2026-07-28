import { IntelligenceRecommendation } from '../entities/intelligence-recommendation.entity';
import { StudentIntelligenceProfile } from '../entities/student-intelligence-profile.entity';
import { MemorizationRules } from '../rules/memorization.rules';
import { RevisionRules } from '../rules/revision.rules';
import { AttendanceRules } from '../rules/attendance.rules';
import { TajweedRules } from '../rules/tajweed.rules';
import { MistakeAnalysis } from './mistake.engine';
import { RevisionAnalysis } from './revision.engine';
import { MemorizationAnalysis } from './memorization.engine';

/**
 * RecommendationEngine — pure, deterministic, no external AI.
 *
 * Evaluates a set of structured rules against a student's intelligence
 * profile and returns a ranked list of personalised recommendations
 * ordered by priority (high → medium → low).
 *
 * Each recommendation is triggered by exactly one named rule so that the
 * system is fully explainable and auditable.
 */
export class RecommendationEngine {
  generate(
    profile: StudentIntelligenceProfile,
    mistakeAnalysis: MistakeAnalysis,
    revisionAnalysis: RevisionAnalysis,
    memorizationAnalysis: MemorizationAnalysis,
  ): IntelligenceRecommendation[] {
    const recs: IntelligenceRecommendation[] = [];

    // ── 1. Critical open Tajweed mistakes ────────────────────────────────────
    if (mistakeAnalysis.hasCriticalOpenMistakes) {
      recs.push({
        type: 'tajweed',
        priority: 'high',
        title: 'Resolve critical recitation mistakes',
        description:
          `You have ${mistakeAnalysis.openMistakes} unresolved mistake(s) including critical structural errors ` +
          `(${mistakeAnalysis.dominantType ?? 'various types'}). These must be corrected before advancing.`,
        triggeredBy: 'tajweed.critical_open_mistakes',
        actionable: true,
        target: { unit: 'mistakes', value: mistakeAnalysis.openMistakes, period: 'session' },
      });
    }

    // ── 2. High forgetting risk ───────────────────────────────────────────────
    if (profile.forgettingRisk === 'high') {
      recs.push({
        type: 'revision',
        priority: 'high',
        title: 'Urgent: Review overdue memorization',
        description:
          `${profile.overdueRevisionCount} memorized sections are overdue for review. ` +
          `Without prompt revision, retention will decline significantly. Prioritise murājaʿah today.`,
        triggeredBy: 'revision.high_forgetting_risk',
        actionable: true,
        target: { unit: 'ayahs', value: Math.min(profile.overdueRevisionCount, 50), period: 'day' },
      });
    }

    // ── 3. Heavy revision burden — pause new memorization ────────────────────
    if (profile.revisionBurdenScore >= RevisionRules.HIGH_BURDEN_THRESHOLD) {
      recs.push({
        type: 'revision',
        priority: 'high',
        title: 'Pause new memorization — clear revision backlog first',
        description:
          `Your revision burden is ${profile.revisionBurdenScore}/100. ` +
          `Focus exclusively on reviewing existing material until the backlog drops below ${RevisionRules.HIGH_BURDEN_THRESHOLD}.`,
        triggeredBy: 'revision.high_burden',
        actionable: true,
      });
    }

    // ── 4. Critical attendance ────────────────────────────────────────────────
    if (profile.attendanceScore <= AttendanceRules.SCORE_CRITICAL) {
      recs.push({
        type: 'attendance',
        priority: 'high',
        title: 'Attendance is critically low',
        description:
          'Attendance is below the critical threshold. Regular class attendance is essential for structured ' +
          'memorization progress. Please discuss attendance barriers with your sheikh.',
        triggeredBy: 'attendance.critical_rate',
        actionable: false,
      });
    }

    // ── 5. Long inactivity ────────────────────────────────────────────────────
    if (
      profile.activeDaysLast30 === 0 &&
      profile.totalAyahsMemorized > 0
    ) {
      recs.push({
        type: 'motivation',
        priority: 'high',
        title: 'No memorization activity in the past 30 days',
        description:
          'You have memorized content that requires regular revision to be retained. ' +
          'Resume your daily practice today to prevent forgetting.',
        triggeredBy: 'memorization.inactivity',
        actionable: true,
      });
    }

    // ── 6. Medium forgetting risk ─────────────────────────────────────────────
    if (profile.forgettingRisk === 'medium') {
      recs.push({
        type: 'revision',
        priority: 'medium',
        title: 'Schedule additional revision sessions',
        description:
          `${profile.overdueRevisionCount} ayah(s) are approaching their revision deadline. ` +
          `Aim for ${RevisionRules.IDEAL_SESSIONS_PER_WEEK} revision sessions this week to stay on track.`,
        triggeredBy: 'revision.medium_forgetting_risk',
        actionable: true,
        target: { unit: 'sessions', value: RevisionRules.IDEAL_SESSIONS_PER_WEEK, period: 'week' },
      });
    }

    // ── 7. Low consistency ────────────────────────────────────────────────────
    if (
      profile.consistencyScore < (MemorizationRules.MIN_ACTIVE_DAYS_GOOD_CONSISTENCY / 30) * 100 &&
      profile.consistencyScore > 0
    ) {
      recs.push({
        type: 'schedule',
        priority: 'medium',
        title: 'Improve daily practice consistency',
        description:
          `You were active ${profile.activeDaysLast30} day(s) in the past 30. ` +
          `Aim for at least ${MemorizationRules.MIN_ACTIVE_DAYS_GOOD_CONSISTENCY} active days per month ` +
          `for steady memorization progress.`,
        triggeredBy: 'memorization.low_consistency',
        actionable: true,
        target: {
          unit: 'days',
          value: MemorizationRules.MIN_ACTIVE_DAYS_GOOD_CONSISTENCY,
          period: 'month',
        },
      });
    }

    // ── 8. Pace below target ──────────────────────────────────────────────────
    if (
      profile.dailyPaceAyahs > 0 &&
      profile.dailyPaceAyahs < MemorizationRules.TARGET_AYAHS_PER_SESSION
    ) {
      recs.push({
        type: 'memorization',
        priority: 'medium',
        title: 'Increase daily memorization target',
        description:
          `Your current pace is ${profile.dailyPaceAyahs} ayah(s)/active-day. ` +
          `The recommended target is ${MemorizationRules.TARGET_AYAHS_PER_SESSION}. ` +
          `Gradual increases of 1 ayah per day help build momentum.`,
        triggeredBy: 'memorization.below_target_pace',
        actionable: true,
        target: { unit: 'ayahs', value: MemorizationRules.TARGET_AYAHS_PER_SESSION, period: 'day' },
      });
    }

    // ── 9. Low revision frequency ─────────────────────────────────────────────
    if (
      revisionAnalysis.sessionsPerWeek < RevisionRules.IDEAL_SESSIONS_PER_WEEK &&
      profile.totalAyahsMemorized > 0 &&
      profile.forgettingRisk !== 'high' // already covered above
    ) {
      recs.push({
        type: 'revision',
        priority: 'medium',
        title: 'Increase revision frequency',
        description:
          `You are averaging ${revisionAnalysis.sessionsPerWeek} revision session(s)/week. ` +
          `${RevisionRules.IDEAL_SESSIONS_PER_WEEK} sessions/week is recommended to maintain strong retention.`,
        triggeredBy: 'revision.low_frequency',
        actionable: true,
        target: { unit: 'sessions', value: RevisionRules.IDEAL_SESSIONS_PER_WEEK, period: 'week' },
      });
    }

    // ── 10. Recurring Tajweed pattern ─────────────────────────────────────────
    if (mistakeAnalysis.recurringPatterns.length > 0 && !mistakeAnalysis.hasCriticalOpenMistakes) {
      const pattern = mistakeAnalysis.recurringPatterns[0];
      recs.push({
        type: 'tajweed',
        priority: 'medium',
        title: `Recurring mistake pattern: ${pattern.replace('_', ' ')}`,
        description:
          `The mistake type "${pattern.replace('_', ' ')}" has occurred ` +
          `${TajweedRules.RECURRENCE_THRESHOLD}+ times. Targeted practice on this specific ` +
          `error type will prevent it from becoming ingrained.`,
        triggeredBy: 'tajweed.recurring_pattern',
        actionable: true,
      });
    }

    // ── 11. Low attendance (non-critical) ─────────────────────────────────────
    if (
      profile.attendanceScore === AttendanceRules.SCORE_LOW &&
      profile.attendanceScore > AttendanceRules.SCORE_CRITICAL
    ) {
      recs.push({
        type: 'attendance',
        priority: 'medium',
        title: 'Attendance needs improvement',
        description:
          `Regular attendance is falling below the ${AttendanceRules.MIN_RATE_ACCEPTABLE}% threshold. ` +
          'Missing sessions disrupts the structured learning sequence and sheikh feedback cycle.',
        triggeredBy: 'attendance.low_rate',
        actionable: false,
      });
    }

    // ── 12. Excellent pace — positive reinforcement ───────────────────────────
    if (
      profile.dailyPaceAyahs >= MemorizationRules.EXCELLENT_AYAHS_PER_SESSION &&
      profile.forgettingRisk !== 'high' &&
      recs.filter(r => r.priority === 'high').length === 0
    ) {
      recs.push({
        type: 'motivation',
        priority: 'low',
        title: 'Excellent memorization pace — maintain it',
        description:
          `You are memorizing ${profile.dailyPaceAyahs} ayah(s)/active-day. ` +
          `This is an excellent rate. Ensure revision sessions keep pace with new memorization ` +
          `to avoid a growing backlog.`,
        triggeredBy: 'memorization.excellent_pace',
        actionable: false,
      });
    }

    // ── 13. Declining trend ───────────────────────────────────────────────────
    if (memorizationAnalysis.trend === 'declining') {
      recs.push({
        type: 'schedule',
        priority: 'low',
        title: 'Memorization pace is declining',
        description:
          'Your pace over the last two weeks is lower than the previous two weeks. ' +
          'Review your daily schedule and identify any barriers to consistent practice.',
        triggeredBy: 'memorization.declining_trend',
        actionable: false,
      });
    }

    // ── 14. Ready to advance (no high-risk flags, good pace) ─────────────────
    if (
      profile.memorizationScore >= 75 &&
      profile.revisionScore >= 65 &&
      profile.forgettingRisk === 'low' &&
      recs.filter(r => r.type === 'revision' && r.priority === 'high').length === 0
    ) {
      recs.push({
        type: 'memorization',
        priority: 'low',
        title: 'Strong foundation — ready for new memorization',
        description:
          'Your revision scores and forgetting risk are both healthy. ' +
          'This is an ideal time to increase the scope of new memorization.',
        triggeredBy: 'profile.ready_to_advance',
        actionable: true,
      });
    }

    // ── Sort by priority ──────────────────────────────────────────────────────
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => order[a.priority] - order[b.priority]);

    // Cap at 8 recommendations to avoid overwhelming the consumer
    return recs.slice(0, 8);
  }
}
