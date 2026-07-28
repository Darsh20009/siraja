import { StudentIntelligenceProfile } from '../entities/student-intelligence-profile.entity';

export interface ClassAnalytics {
  totalStudents: number;
  averageMemorizationScore: number;
  averageRevisionScore: number;
  averageAttendanceScore: number;
  averageConsistencyScore: number;
  averageDifficultyIndex: number;
  classRetentionRate: number;
  studentsWithHighForgettingRisk: number;
  studentsWithLowAttendance: number;
  totalOpenMistakes: number;
  totalAyahsMemorized: number;
  averageMemorizationPercentage: number;
  /** Student IDs ranked by combined score (top 3). */
  topPerformers: string[];
  /** Student IDs with at least one high-risk flag. */
  needsAttention: string[];
  performanceTiers: {
    excellent: number; // memorizationScore >= 85
    good: number;      // 65–84
    average: number;   // 45–64
    struggling: number; // < 45
  };
}

/**
 * AnalyticsEngine — pure, dependency-free.
 *
 * Aggregates individual student intelligence profiles into class-level
 * statistics for sheikh and supervisor dashboards.
 */
export class AnalyticsEngine {
  aggregateClass(profiles: StudentIntelligenceProfile[]): ClassAnalytics {
    if (profiles.length === 0) {
      return this.empty();
    }

    const n = profiles.length;

    const avg = (extract: (p: StudentIntelligenceProfile) => number): number =>
      parseFloat((profiles.reduce((sum, p) => sum + extract(p), 0) / n).toFixed(1));

    const topPerformers = [...profiles]
      .sort((a, b) => this.combinedScore(b) - this.combinedScore(a))
      .slice(0, 3)
      .map(p => p.studentId);

    const needsAttention = profiles
      .filter(p =>
        p.forgettingRisk === 'high' ||
        p.attendanceScore < 50 ||
        p.memorizationScore < 40 ||
        p.revisionScore < 30,
      )
      .map(p => p.studentId);

    const performanceTiers = {
      excellent: profiles.filter(p => p.memorizationScore >= 85).length,
      good: profiles.filter(p => p.memorizationScore >= 65 && p.memorizationScore < 85).length,
      average: profiles.filter(p => p.memorizationScore >= 45 && p.memorizationScore < 65).length,
      struggling: profiles.filter(p => p.memorizationScore < 45).length,
    };

    return {
      totalStudents: n,
      averageMemorizationScore: avg(p => p.memorizationScore),
      averageRevisionScore: avg(p => p.revisionScore),
      averageAttendanceScore: avg(p => p.attendanceScore),
      averageConsistencyScore: avg(p => p.consistencyScore),
      averageDifficultyIndex: avg(p => p.difficultyIndex),
      classRetentionRate: avg(p => p.retentionRate),
      studentsWithHighForgettingRisk: profiles.filter(p => p.forgettingRisk === 'high').length,
      studentsWithLowAttendance: profiles.filter(p => p.attendanceScore < 50).length,
      totalOpenMistakes: profiles.reduce((sum, p) => sum + p.totalOpenMistakes, 0),
      totalAyahsMemorized: profiles.reduce((sum, p) => sum + p.totalAyahsMemorized, 0),
      averageMemorizationPercentage: avg(p => p.memorizationPercentage),
      topPerformers,
      needsAttention,
      performanceTiers,
    };
  }

  private combinedScore(p: StudentIntelligenceProfile): number {
    return (
      p.memorizationScore * 0.35 +
      p.revisionScore * 0.25 +
      p.attendanceScore * 0.20 +
      p.consistencyScore * 0.20
    );
  }

  private empty(): ClassAnalytics {
    return {
      totalStudents: 0,
      averageMemorizationScore: 0, averageRevisionScore: 0,
      averageAttendanceScore: 0, averageConsistencyScore: 0,
      averageDifficultyIndex: 0, classRetentionRate: 0,
      studentsWithHighForgettingRisk: 0, studentsWithLowAttendance: 0,
      totalOpenMistakes: 0, totalAyahsMemorized: 0,
      averageMemorizationPercentage: 0,
      topPerformers: [], needsAttention: [],
      performanceTiers: { excellent: 0, good: 0, average: 0, struggling: 0 },
    };
  }
}
