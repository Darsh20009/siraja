import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { RiskEngine } from '../../domain/engines/risk.engine';
import type { SheikhDashboardData, StudentSummary, GroupStats } from '../../domain/entities/sheikh-dashboard.entity';
import type { RiskAssessment } from '../../domain/entities/risk-assessment.entity';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';
import type { RecommendationInput } from '../../../native-ai/domain/engines/recommendation.engine';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

export interface StudentInput {
  studentId: string;
  displayName: string;
  weeklyVelocities: number[];
  sessions: Array<{ grade: number; easeFactor?: number; interval?: number; repetitions?: number }>;
  targetAyahs: number;
  currentProgress: number;
  burdenScore: number;
  tajweedScore: number;
  daysSinceLastSession: number;
  currentDifficultyLevel: number;
}

export interface SheikhDashboardInput {
  sheikhId: string;
  tenantId: string;
  students: StudentInput[];
}

/**
 * SheikhDashboardProvider — builds the sheikh's AI dashboard payload.
 *
 * Processes each student independently (up to MAX_STUDENTS_PER_DASHBOARD),
 * computes per-student risk + recommendations, aggregates group stats, and
 * surfaces the top at-risk students.
 *
 * Deterministic, in-process, zero external AI.
 */
@Injectable()
export class SheikhDashboardProvider {
  private readonly riskEngine = new RiskEngine();

  constructor(private readonly engines: NativeAiEngineService) {}

  build(input: SheikhDashboardInput): SheikhDashboardData {
    const students = input.students.slice(0, PipelineRules.MAX_STUDENTS_PER_DASHBOARD);
    const summaries: StudentSummary[] = [];
    const riskAssessments: RiskAssessment[] = [];
    const allRecommendations: AiRecommendation[] = [];

    for (const s of students) {
      const { summary, risk, recs } = this.processStudent(s, input.tenantId);
      summaries.push(summary);
      riskAssessments.push(risk);
      allRecommendations.push(...recs);
    }

    // At-risk: medium+, sorted by riskScore descending
    const atRiskStudents = riskAssessments
      .filter((r) => r.riskLevel !== 'low')
      .sort((a, b) => b.riskScore - a.riskScore);

    // Top cross-student recommendations: aggregate by type frequency
    const topRecommendations = this.aggregateRecommendations(allRecommendations);

    const groupStats = this.computeGroupStats(summaries);

    return {
      sheikhId: input.sheikhId,
      tenantId: input.tenantId,
      generatedAt: new Date(),
      studentSummaries: summaries,
      groupStats,
      atRiskStudents,
      topRecommendations,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private processStudent(
    s: StudentInput,
    tenantId: string,
  ): { summary: StudentSummary; risk: RiskAssessment; recs: AiRecommendation[] } {
    const velocity = this.engines.forecast.computeVelocity(s.weeklyVelocities);
    const pattern = this.engines.memorizationPattern.analyze(s.sessions);

    const features: Record<string, number> = {
      velocity,
      burdenScore: s.burdenScore,
      tajweedScore: s.tajweedScore,
      retentionRate: pattern.retentionProbability * 100,
      daysSinceLastSession: s.daysSinceLastSession,
      difficultyLevel: s.currentDifficultyLevel,
      forgettingRate: pattern.forgettingRate * 100,
    };

    const risk = this.riskEngine.assess(s.studentId, tenantId, features);
    const forecast = this.engines.forecast.compute({
      targetAyahs: s.targetAyahs,
      currentProgress: s.currentProgress,
      weeklyVelocities: s.weeklyVelocities,
      burdenScore: s.burdenScore,
      reviewOverdueCount: 0,
    });

    const recInput: RecommendationInput = {
      velocity,
      forgettingRate: pattern.forgettingRate,
      retentionProbability: pattern.retentionProbability,
      burdenScore: s.burdenScore,
      tajweedScore: s.tajweedScore,
      systematicMistakes: this.engines.mistakeClassifier.detectPatterns([]),
      isOnTrack: forecast.isOnTrack,
      daysSinceLastSession: s.daysSinceLastSession,
      weeklyCapacity: pattern.weeklyCapacity,
      currentDifficultyLevel: s.currentDifficultyLevel,
    };
    const recs = this.engines.recommendation.generate(recInput);

    const summary: StudentSummary = {
      studentId: s.studentId,
      displayName: s.displayName,
      ayahsMemorized: s.currentProgress,
      weeklyVelocity: velocity,
      tajweedScore: s.tajweedScore,
      burdenScore: s.burdenScore,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      isOnTrack: forecast.isOnTrack,
      daysSinceLastSession: s.daysSinceLastSession,
      topRecommendationType: recs[0]?.type ?? null,
    };

    return { summary, risk, recs };
  }

  private computeGroupStats(summaries: StudentSummary[]): GroupStats {
    if (summaries.length === 0) {
      return {
        totalStudents: 0,
        activeStudents: 0,
        atRiskCount: 0,
        averageVelocity: 0,
        averageTajweedScore: 0,
        averageRetentionRate: 0,
        completionRatePercent: 0,
      };
    }

    const active = summaries.filter((s) => s.daysSinceLastSession <= 7).length;
    const atRisk = summaries.filter((s) => s.riskLevel !== 'low').length;
    const avgVelocity = summaries.reduce((s, x) => s + x.weeklyVelocity, 0) / summaries.length;
    const avgTajweed = summaries.reduce((s, x) => s + x.tajweedScore, 0) / summaries.length;
    const onTrackPct =
      (summaries.filter((s) => s.isOnTrack).length / summaries.length) * 100;

    return {
      totalStudents: summaries.length,
      activeStudents: active,
      atRiskCount: atRisk,
      averageVelocity: Math.round(avgVelocity * 10) / 10,
      averageTajweedScore: Math.round(avgTajweed),
      averageRetentionRate: 0, // would need retentionRate per student
      completionRatePercent: Math.round(onTrackPct),
    };
  }

  private aggregateRecommendations(all: AiRecommendation[]): AiRecommendation[] {
    const freq = new Map<string, { count: number; rec: AiRecommendation }>();
    for (const rec of all) {
      const existing = freq.get(rec.type);
      if (!existing || rec.confidenceScore > existing.rec.confidenceScore) {
        freq.set(rec.type, { count: (existing?.count ?? 0) + 1, rec });
      } else {
        freq.get(rec.type)!.count++;
      }
    }
    return Array.from(freq.values())
      .sort((a, b) => b.count - a.count || b.rec.estimatedImpact - a.rec.estimatedImpact)
      .slice(0, 5)
      .map((x) => x.rec);
  }
}
