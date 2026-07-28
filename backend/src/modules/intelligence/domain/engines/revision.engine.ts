import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { RevisionRules } from '../rules/revision.rules';

export interface RevisionSessionData {
  retentionGrade?: EvaluationGrade;
  ayahsCount: number;
  reviewedAt: Date;
  nextReviewDueAt?: Date;
}

export interface AyahSm2Data {
  smNextReviewDue: Date | null;
  masteryScore: number;
}

export interface RevisionAnalysis {
  /** 0–100 composite revision score. */
  revisionScore: number;
  totalSessions: number;
  totalAyahsRevised: number;
  averageAyahsPerSession: number;
  averageRetentionGrade: EvaluationGrade | null;
  gradeBreakdown: Record<EvaluationGrade | 'ungraded', number>;
  sessionsPerWeek: number;
  overdueCount: number;
  revisionBurdenScore: number;
  forgettingRisk: 'low' | 'medium' | 'high';
  onTimeRevisionRate: number;
  trend: 'improving' | 'stable' | 'declining';
  bestHour: number | null;
}

const GRADE_SCORE: Record<EvaluationGrade, number> = {
  [EvaluationGrade.EXCELLENT]: 100,
  [EvaluationGrade.VERY_GOOD]: 85,
  [EvaluationGrade.GOOD]: 70,
  [EvaluationGrade.ACCEPTABLE]: 55,
  [EvaluationGrade.WEAK]: 30,
};

/**
 * RevisionEngine — pure, dependency-free.
 *
 * Analyses revision session data and SM-2 performance records to produce
 * a comprehensive revision analysis. No database calls, fully testable.
 */
export class RevisionEngine {
  analyse(
    sessions: RevisionSessionData[],
    ayahSm2Data: AyahSm2Data[],
    totalAyahsMemorized: number,
  ): RevisionAnalysis {
    if (sessions.length === 0 && ayahSm2Data.length === 0) {
      return this.empty(totalAyahsMemorized);
    }

    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 86_400_000;
    const twentyEightDaysAgo = now - 28 * 86_400_000;

    // ── Grade breakdown ──────────────────────────────────────────────────────
    const gradeBreakdown: Record<string, number> = {
      [EvaluationGrade.EXCELLENT]: 0,
      [EvaluationGrade.VERY_GOOD]: 0,
      [EvaluationGrade.GOOD]: 0,
      [EvaluationGrade.ACCEPTABLE]: 0,
      [EvaluationGrade.WEAK]: 0,
      ungraded: 0,
    };

    let gradeScoreSum = 0;
    let gradedCount = 0;
    let totalAyahsRevised = 0;
    let onTimeCount = 0;
    let latableCount = 0;
    const hourBuckets: number[] = Array.from({ length: 24 }, () => 0);

    let recent14Score = 0;
    let prev14Score = 0;
    let recent14Count = 0;
    let prev14Count = 0;

    for (const s of sessions) {
      const g = s.retentionGrade ?? 'ungraded';
      gradeBreakdown[g] = (gradeBreakdown[g] ?? 0) + 1;
      if (s.retentionGrade) {
        gradeScoreSum += GRADE_SCORE[s.retentionGrade];
        gradedCount++;
      }
      totalAyahsRevised += s.ayahsCount;
      hourBuckets[s.reviewedAt.getHours()]++;

      if (s.nextReviewDueAt) {
        latableCount++;
        if (s.reviewedAt.getTime() <= s.nextReviewDueAt.getTime()) onTimeCount++;
      }

      const t = s.reviewedAt.getTime();
      const gradeScore = s.retentionGrade ? GRADE_SCORE[s.retentionGrade] : 60;
      if (t >= fourteenDaysAgo) {
        recent14Score += gradeScore; recent14Count++;
      } else if (t >= twentyEightDaysAgo) {
        prev14Score += gradeScore; prev14Count++;
      }
    }

    // ── Trend ────────────────────────────────────────────────────────────────
    const recent14Avg = recent14Count > 0 ? recent14Score / recent14Count : 0;
    const prev14Avg = prev14Count > 0 ? prev14Score / prev14Count : 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (prev14Avg > 0) {
      const ratio = (recent14Avg - prev14Avg) / prev14Avg;
      if (ratio > 0.10) trend = 'improving';
      else if (ratio < -0.10) trend = 'declining';
    } else if (recent14Count > 0) {
      trend = 'improving';
    }

    // ── SM-2 overdue + burden ────────────────────────────────────────────────
    let overdueCount = 0;
    for (const a of ayahSm2Data) {
      if (a.smNextReviewDue && a.smNextReviewDue.getTime() <= now) {
        overdueCount++;
      }
    }

    const revisionBurdenScore = totalAyahsMemorized > 0
      ? Math.min(100, Math.round((overdueCount / totalAyahsMemorized) * 200))
      : 0;

    const overdueRatio = totalAyahsMemorized > 0 ? overdueCount / totalAyahsMemorized : 0;
    const forgettingRisk: 'low' | 'medium' | 'high' =
      overdueRatio < RevisionRules.OVERDUE_RATIO_MEDIUM ? 'low' :
      overdueRatio < RevisionRules.OVERDUE_RATIO_HIGH ? 'medium' : 'high';

    // ── Frequency ────────────────────────────────────────────────────────────
    const oneMonthAgo = new Date(now - 28 * 86_400_000);
    const recentSessions = sessions.filter(s => s.reviewedAt.getTime() >= oneMonthAgo.getTime());
    const sessionsPerWeek = parseFloat(((recentSessions.length / 4)).toFixed(1));

    // ── On-time rate ─────────────────────────────────────────────────────────
    const onTimeRevisionRate = latableCount > 0
      ? Math.round((onTimeCount / latableCount) * 100)
      : 100; // no due-date tracking → assume on-time

    // ── Average grade ─────────────────────────────────────────────────────────
    const avgGradeScore = gradedCount > 0 ? gradeScoreSum / gradedCount : 0;
    const averageRetentionGrade = gradedCount > 0
      ? this.scoreToGrade(avgGradeScore)
      : null;

    // ── Composite revision score ──────────────────────────────────────────────
    const retentionComponent = avgGradeScore; // 0–100
    const frequencyComponent = Math.min(100, (sessionsPerWeek / RevisionRules.IDEAL_SESSIONS_PER_WEEK) * 100);
    const overduePenalty = Math.min(100, revisionBurdenScore);

    const revisionScore = Math.round(
      retentionComponent * RevisionRules.WEIGHT_RETENTION_GRADE +
      frequencyComponent * RevisionRules.WEIGHT_FREQUENCY +
      (100 - overduePenalty) * RevisionRules.WEIGHT_OVERDUE_PENALTY,
    );

    // ── Best hour ────────────────────────────────────────────────────────────
    const bestHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets));
    const bestHour = hourBuckets[bestHourIdx] > 0 ? bestHourIdx : null;

    return {
      revisionScore: clamp(revisionScore, 0, 100),
      totalSessions: sessions.length,
      totalAyahsRevised,
      averageAyahsPerSession: sessions.length > 0
        ? parseFloat((totalAyahsRevised / sessions.length).toFixed(1))
        : 0,
      averageRetentionGrade,
      gradeBreakdown: gradeBreakdown as Record<EvaluationGrade | 'ungraded', number>,
      sessionsPerWeek,
      overdueCount,
      revisionBurdenScore,
      forgettingRisk,
      onTimeRevisionRate,
      trend,
      bestHour,
    };
  }

  private scoreToGrade(score: number): EvaluationGrade {
    if (score >= 92) return EvaluationGrade.EXCELLENT;
    if (score >= 77) return EvaluationGrade.VERY_GOOD;
    if (score >= 62) return EvaluationGrade.GOOD;
    if (score >= 42) return EvaluationGrade.ACCEPTABLE;
    return EvaluationGrade.WEAK;
  }

  private empty(totalAyahsMemorized: number): RevisionAnalysis {
    return {
      revisionScore: 0,
      totalSessions: 0,
      totalAyahsRevised: 0,
      averageAyahsPerSession: 0,
      averageRetentionGrade: null,
      gradeBreakdown: {
        [EvaluationGrade.EXCELLENT]: 0,
        [EvaluationGrade.VERY_GOOD]: 0,
        [EvaluationGrade.GOOD]: 0,
        [EvaluationGrade.ACCEPTABLE]: 0,
        [EvaluationGrade.WEAK]: 0,
        ungraded: 0,
      },
      sessionsPerWeek: 0,
      overdueCount: 0,
      revisionBurdenScore: 0,
      forgettingRisk: totalAyahsMemorized > 0 ? 'medium' : 'low',
      onTimeRevisionRate: 100,
      trend: 'stable',
      bestHour: null,
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
