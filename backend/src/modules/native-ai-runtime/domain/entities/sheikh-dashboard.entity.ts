import type { RiskAssessment } from './risk-assessment.entity';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';

/**
 * StudentSummary — condensed per-student snapshot shown in the sheikh
 * dashboard grid.
 */
export interface StudentSummary {
  studentId: string;
  displayName: string;
  ayahsMemorized: number;
  weeklyVelocity: number;
  tajweedScore: number;
  burdenScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  isOnTrack: boolean;
  daysSinceLastSession: number;
  topRecommendationType: string | null;
}

/**
 * GroupStats — aggregate statistics across all students in the sheikh's circle.
 */
export interface GroupStats {
  totalStudents: number;
  activeStudents: number;
  atRiskCount: number;
  averageVelocity: number;
  averageTajweedScore: number;
  averageRetentionRate: number;
  completionRatePercent: number;
}

/**
 * SheikhDashboardData — full payload rendered on the sheikh's AI dashboard.
 * Composed by SheikhDashboardProvider; entirely deterministic.
 */
export interface SheikhDashboardData {
  readonly sheikhId: string;
  readonly tenantId: string;
  readonly generatedAt: Date;
  readonly studentSummaries: StudentSummary[];
  readonly groupStats: GroupStats;
  /** Students with riskLevel >= "medium", sorted by riskScore descending. */
  readonly atRiskStudents: RiskAssessment[];
  /** Top 5 cross-student recommendations aggregated by frequency. */
  readonly topRecommendations: AiRecommendation[];
}
