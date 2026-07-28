import { IntelligenceRecommendation } from './intelligence-recommendation.entity';

/**
 * SheikhInsight — a class-level intelligence view for a sheikh,
 * covering all assigned students with ranked performance tiers and
 * actionable teaching priorities.
 */
export interface StudentBrief {
  studentId: string;
  memorizationScore: number;
  revisionScore: number;
  attendanceScore: number;
  consistencyScore: number;
  forgettingRisk: 'low' | 'medium' | 'high';
  difficultyIndex: number;
  totalAyahsMemorized: number;
  overdueRevisionCount: number;
  openMistakes: number;
  topRecommendations: IntelligenceRecommendation[];
}

export interface SheikhInsight {
  sheikhId: string;
  tenantId: string;
  generatedAt: Date;
  totalStudents: number;
  students: StudentBrief[];

  /** Students ranked by combined performance (highest first). */
  topPerformers: string[]; // studentIds
  /** Students with any high-priority risk flag — needs immediate attention. */
  needsAttention: string[]; // studentIds

  classAggregate: {
    averageMemorizationScore: number;
    averageRevisionScore: number;
    averageAttendanceScore: number;
    averageDifficultyIndex: number;
    classRetentionRate: number;
    studentsWithHighForgettingRisk: number;
    studentsWithLowAttendance: number;
    totalOpenMistakes: number;
  };
}
