import { AttendanceRules } from '../rules/attendance.rules';
import { RevisionRules } from '../rules/revision.rules';
import { MemorizationRules } from '../rules/memorization.rules';
import { StudentIntelligenceProfile } from '../entities/student-intelligence-profile.entity';
import { MemorizationAnalysis } from './memorization.engine';
import { RevisionAnalysis } from './revision.engine';
import { MistakeAnalysis } from './mistake.engine';
import { DifficultyAnalysis } from './difficulty.engine';

export interface AttendanceStat {
  attendanceRate: number; // 0–100
}

export interface AyahPerformanceSummary {
  totalAyahs: number;
  retainedAyahs: number; // masteryScore >= 60
  averageSmEasinessFactor: number;
}

export interface StudentProfileInput {
  studentId: string;
  tenantId: string;
  totalAyahsMemorized: number;
  memorizationPercentage: number;
  memorizationAnalysis: MemorizationAnalysis;
  revisionAnalysis: RevisionAnalysis;
  mistakeAnalysis: MistakeAnalysis;
  difficultyAnalysis: DifficultyAnalysis;
  attendance: AttendanceStat;
  ayahPerformance: AyahPerformanceSummary;
}

/**
 * StudentProfileEngine — pure, dependency-free.
 *
 * Assembles the full StudentIntelligenceProfile by combining the outputs
 * of all other engines with the student's raw progress data. This is the
 * single aggregation point — every profile field is computed once here
 * from the individual engine outputs.
 */
export class StudentProfileEngine {
  build(input: StudentProfileInput): StudentIntelligenceProfile {
    const {
      studentId, tenantId,
      totalAyahsMemorized, memorizationPercentage,
      memorizationAnalysis: mem, revisionAnalysis: rev,
      mistakeAnalysis: mis, difficultyAnalysis: diff,
      attendance, ayahPerformance,
    } = input;

    // ── Attendance score ──────────────────────────────────────────────────────
    const attendanceScore = this.attendanceScore(attendance.attendanceRate);

    // ── Consistency score ─────────────────────────────────────────────────────
    const consistencyScore = Math.round(
      Math.min(100, (mem.activeDaysLast30 / 30) * 100),
    );

    // ── Retention rate ────────────────────────────────────────────────────────
    const retentionRate = ayahPerformance.totalAyahs > 0
      ? Math.round((ayahPerformance.retainedAyahs / ayahPerformance.totalAyahs) * 100)
      : 0;

    // ── Learning speed ────────────────────────────────────────────────────────
    const learningSpeed = mem.totalSessions > 0
      ? parseFloat((totalAyahsMemorized / mem.totalSessions).toFixed(1))
      : 0;

    // ── Best time patterns ────────────────────────────────────────────────────
    const bestMemorizationTime = this.hourToTimeWindow(mem.bestHour);
    const bestRevisionTime = this.hourToTimeWindow(rev.bestHour);

    // ── Forgetting risk ───────────────────────────────────────────────────────
    const forgettingRisk = rev.forgettingRisk;

    return {
      studentId,
      tenantId,
      generatedAt: new Date(),
      memorizationScore: mem.memorizationScore,
      revisionScore: rev.revisionScore,
      consistencyScore,
      attendanceScore,
      difficultyIndex: diff.difficultyIndex,
      forgettingRisk,
      bestMemorizationTime,
      bestRevisionTime,
      learningSpeed,
      retentionRate,
      dailyPaceAyahs: mem.dailyPaceAyahs,
      weeklyPaceAyahs: mem.weeklyPaceAyahs,
      activeDaysLast30: mem.activeDaysLast30,
      totalAyahsMemorized,
      memorizationPercentage,
      overdueRevisionCount: rev.overdueCount,
      revisionBurdenScore: rev.revisionBurdenScore,
      totalOpenMistakes: mis.openMistakes,
      dominantMistakeType: mis.dominantType,
      mistakeResolutionRate: mis.resolutionRate,
    };
  }

  private attendanceScore(rate: number): number {
    if (rate >= AttendanceRules.MIN_RATE_GOOD) return AttendanceRules.SCORE_EXCELLENT;
    if (rate >= AttendanceRules.MIN_RATE_ACCEPTABLE) return AttendanceRules.SCORE_ACCEPTABLE;
    if (rate >= AttendanceRules.CRITICAL_RATE) return AttendanceRules.SCORE_LOW;
    return AttendanceRules.SCORE_CRITICAL;
  }

  private hourToTimeWindow(hour: number | null): 'morning' | 'afternoon' | 'evening' | 'unknown' {
    if (hour === null) return 'unknown';
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 || hour < 5) return 'evening';
    return 'unknown';
  }
}
