import { IntelligenceRecommendation } from './intelligence-recommendation.entity';

/**
 * ParentInsight — a curated view of intelligence data for a parent,
 * spanning one or more of their linked children.
 *
 * Designed to be immediately readable by a non-specialist: plain
 * language summaries, ranked highlights, and top recommendations.
 */
export interface ChildSummary {
  studentId: string;
  memorizationScore: number;
  revisionScore: number;
  attendanceScore: number;
  consistencyScore: number;
  forgettingRisk: 'low' | 'medium' | 'high';
  totalAyahsMemorized: number;
  memorizationPercentage: number;
  overdueRevisionCount: number;
  openMistakes: number;
  recommendations: IntelligenceRecommendation[];
  /** ISO date string of the last memorization session. */
  lastMemorizationDate: string | null;
  /** ISO date string of the last revision session. */
  lastRevisionDate: string | null;
  activeDaysLast30: number;
}

export interface ParentInsight {
  parentId: string;
  tenantId: string;
  generatedAt: Date;
  children: ChildSummary[];
  /**
   * Aggregated across all children — useful for a household summary card.
   */
  aggregate: {
    totalChildren: number;
    averageMemorizationScore: number;
    averageAttendanceScore: number;
    totalOpenMistakes: number;
    childrenWithHighForgettingRisk: number;
    childrenWithLowAttendance: number;
  };
}
