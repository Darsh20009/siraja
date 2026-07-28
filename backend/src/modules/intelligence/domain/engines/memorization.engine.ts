import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { MemorizationRules } from '../rules/memorization.rules';

export interface MemorizationSessionData {
  score?: number;
  grade?: EvaluationGrade;
  ayahsCount: number;
  evaluatedAt: Date;
}

export interface MemorizationAnalysis {
  /** 0–100 composite memorization score. */
  memorizationScore: number;
  averageScore: number;
  averageAyahsPerSession: number;
  totalSessions: number;
  totalAyahsLast30: number;
  activeDaysLast30: number;
  dailyPaceAyahs: number;
  weeklyPaceAyahs: number;
  gradeDistribution: Record<EvaluationGrade | 'ungraded', number>;
  trend: 'improving' | 'stable' | 'declining';
  bestDayOfWeek: string | null;
  bestHour: number | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * MemorizationEngine — pure, dependency-free computation.
 *
 * Takes a snapshot of memorization records and returns a rich analysis
 * object. No database calls, no NestJS decorators — fully unit-testable.
 */
export class MemorizationEngine {
  analyse(sessions: MemorizationSessionData[]): MemorizationAnalysis {
    if (sessions.length === 0) {
      return this.empty();
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86_400_000;
    const fourteenDaysAgo = now - 14 * 86_400_000;
    const twentyEightDaysAgo = now - 28 * 86_400_000;

    // ── Grade distribution ───────────────────────────────────────────────────
    const gradeDistribution: Record<string, number> = {
      [EvaluationGrade.EXCELLENT]: 0,
      [EvaluationGrade.VERY_GOOD]: 0,
      [EvaluationGrade.GOOD]: 0,
      [EvaluationGrade.ACCEPTABLE]: 0,
      [EvaluationGrade.WEAK]: 0,
      ungraded: 0,
    };

    let totalScore = 0;
    let scoredSessions = 0;

    for (const s of sessions) {
      const g = s.grade ?? 'ungraded';
      gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
      if (s.score != null) {
        totalScore += s.score;
        scoredSessions++;
      }
    }

    const averageScore = scoredSessions > 0 ? Math.round(totalScore / scoredSessions) : 0;

    // ── Pace (last 30 days) ──────────────────────────────────────────────────
    const dayMap = new Map<string, number>();
    const hourBuckets: number[] = Array.from({ length: 24 }, () => 0);
    const dayOfWeekBuckets: number[] = Array.from({ length: 7 }, () => 0);

    let recent14Ayahs = 0;
    let prev14Ayahs = 0;

    for (const s of sessions) {
      const t = s.evaluatedAt.getTime();
      if (t >= thirtyDaysAgo) {
        const dateKey = s.evaluatedAt.toISOString().split('T')[0];
        dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + s.ayahsCount);
        hourBuckets[s.evaluatedAt.getHours()]++;
        dayOfWeekBuckets[s.evaluatedAt.getDay()]++;
      }
      if (t >= fourteenDaysAgo) {
        recent14Ayahs += s.ayahsCount;
      } else if (t >= twentyEightDaysAgo) {
        prev14Ayahs += s.ayahsCount;
      }
    }

    const activeDaysLast30 = dayMap.size;
    const totalAyahsLast30 = [...dayMap.values()].reduce((a, b) => a + b, 0);
    const dailyPaceAyahs = activeDaysLast30 > 0
      ? parseFloat((totalAyahsLast30 / activeDaysLast30).toFixed(1))
      : 0;
    const weeklyPaceAyahs = parseFloat((dailyPaceAyahs * 7).toFixed(1));

    // ── Trend ────────────────────────────────────────────────────────────────
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (prev14Ayahs > 0) {
      const ratio = (recent14Ayahs - prev14Ayahs) / prev14Ayahs;
      if (ratio > MemorizationRules.TREND_IMPROVEMENT_THRESHOLD) trend = 'improving';
      else if (ratio < -MemorizationRules.TREND_DECLINE_THRESHOLD) trend = 'declining';
    } else if (recent14Ayahs > 0) {
      trend = 'improving';
    }

    // ── Best day / hour ──────────────────────────────────────────────────────
    const bestDayIdx = dayOfWeekBuckets.indexOf(Math.max(...dayOfWeekBuckets));
    const bestDayOfWeek = dayOfWeekBuckets[bestDayIdx] > 0 ? DAY_NAMES[bestDayIdx] : null;
    const bestHourIdx = hourBuckets.indexOf(Math.max(...hourBuckets));
    const bestHour = hourBuckets[bestHourIdx] > 0 ? bestHourIdx : null;

    // ── Composite score ──────────────────────────────────────────────────────
    const gradeQuality = this.gradeQualityScore(gradeDistribution, sessions.length);
    const paceScore = this.paceScore(dailyPaceAyahs);
    const consistencyContrib = Math.min(100, (activeDaysLast30 / 30) * 100);

    const memorizationScore = Math.round(
      gradeQuality * MemorizationRules.WEIGHT_GRADE_QUALITY +
      paceScore * MemorizationRules.WEIGHT_PACE +
      consistencyContrib * MemorizationRules.WEIGHT_CONSISTENCY,
    );

    return {
      memorizationScore: clamp(memorizationScore, 0, 100),
      averageScore,
      averageAyahsPerSession: sessions.length > 0
        ? parseFloat((sessions.reduce((a, s) => a + s.ayahsCount, 0) / sessions.length).toFixed(1))
        : 0,
      totalSessions: sessions.length,
      totalAyahsLast30,
      activeDaysLast30,
      dailyPaceAyahs,
      weeklyPaceAyahs,
      gradeDistribution: gradeDistribution as Record<EvaluationGrade | 'ungraded', number>,
      trend,
      bestDayOfWeek,
      bestHour,
    };
  }

  private gradeQualityScore(dist: Record<string, number>, total: number): number {
    if (total === 0) return 0;
    const weighted =
      (dist[EvaluationGrade.EXCELLENT] ?? 0) * 100 +
      (dist[EvaluationGrade.VERY_GOOD] ?? 0) * 85 +
      (dist[EvaluationGrade.GOOD] ?? 0) * 70 +
      (dist[EvaluationGrade.ACCEPTABLE] ?? 0) * 55 +
      (dist[EvaluationGrade.WEAK] ?? 0) * 30 +
      (dist['ungraded'] ?? 0) * 60;
    return weighted / total;
  }

  private paceScore(dailyPace: number): number {
    if (dailyPace <= 0) return 0;
    if (dailyPace >= MemorizationRules.EXCELLENT_AYAHS_PER_SESSION) return 100;
    return Math.round((dailyPace / MemorizationRules.EXCELLENT_AYAHS_PER_SESSION) * 100);
  }

  private empty(): MemorizationAnalysis {
    return {
      memorizationScore: 0,
      averageScore: 0,
      averageAyahsPerSession: 0,
      totalSessions: 0,
      totalAyahsLast30: 0,
      activeDaysLast30: 0,
      dailyPaceAyahs: 0,
      weeklyPaceAyahs: 0,
      gradeDistribution: {
        [EvaluationGrade.EXCELLENT]: 0,
        [EvaluationGrade.VERY_GOOD]: 0,
        [EvaluationGrade.GOOD]: 0,
        [EvaluationGrade.ACCEPTABLE]: 0,
        [EvaluationGrade.WEAK]: 0,
        ungraded: 0,
      },
      trend: 'stable',
      bestDayOfWeek: null,
      bestHour: null,
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
