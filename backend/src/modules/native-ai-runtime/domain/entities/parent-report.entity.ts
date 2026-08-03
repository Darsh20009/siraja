import type { RiskAssessment } from './risk-assessment.entity';
import type { StudentTimeline } from './student-timeline.entity';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';
import type { AiForecast } from '../../../native-ai/domain/entities/ai-forecast.entity';

/**
 * ProgressSnapshot — a point-in-time summary of a student's memorization
 * progress included in the ParentReport.
 */
export interface ProgressSnapshot {
  ayahsMemorized: number;
  targetAyahs: number;
  completionPercentage: number;
  weeklyVelocity: number;
  tajweedScore: number;
  burdenScore: number;
  streakDays: number;
}

/**
 * ParentReport — comprehensive AI-generated report delivered to a student's
 * parent or guardian.  Composed deterministically from risk + forecast +
 * recommendations + timeline.  No external AI or database write.
 */
export interface ParentReport {
  readonly studentId: string;
  readonly studentName: string;
  readonly tenantId: string;
  readonly generatedAt: Date;
  readonly period: { from: Date; to: Date };
  /** Two-to-three sentence executive summary. */
  readonly summary: string;
  readonly progressSnapshot: ProgressSnapshot;
  readonly riskAssessment: RiskAssessment;
  readonly topRecommendations: AiRecommendation[];
  readonly forecast: AiForecast;
  readonly timeline: StudentTimeline;
}
