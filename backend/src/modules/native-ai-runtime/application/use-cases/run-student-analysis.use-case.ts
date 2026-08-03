import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { RiskEngine } from '../../domain/engines/risk.engine';
import { FeatureStoreService } from '../services/feature-store.service';
import { LearningPlannerService } from '../planners/learning-planner.service';
import type { RunStudentAnalysisRequestDto, RunStudentAnalysisResponseDto } from '../dtos/student-analysis.dto';
import type { TajweedRuleType } from '../../../native-ai/domain/entities/tajweed-rule-application.entity';

/**
 * RunStudentAnalysisUseCase — full in-process AI analysis for a single student.
 *
 * Chains: FeatureStore upsert → RiskEngine → LearningPlanner → Response DTO
 * No database access; all data supplied by the caller.
 */
@Injectable()
export class RunStudentAnalysisUseCase {
  private readonly riskEngine = new RiskEngine();

  constructor(
    private readonly engines: NativeAiEngineService,
    private readonly featureStore: FeatureStoreService,
    private readonly planner: LearningPlannerService,
  ) {}

  execute(
    dto: RunStudentAnalysisRequestDto,
    tenantId: string,
  ): RunStudentAnalysisResponseDto {
    // ── 1. Build plan (also updates feature store) ───────────────────────────
    const plan = this.planner.buildPlan({
      studentId: dto.studentId,
      tenantId,
      weeklyVelocities: dto.weeklyVelocities,
      sessions: dto.sessions,
      burdenScore: dto.burdenScore,
      tajweedScore: dto.tajweedScore,
      currentDifficultyLevel: dto.currentDifficultyLevel,
      daysSinceLastSession: dto.daysSinceLastSession,
      targetAyahs: dto.targetAyahs,
      currentProgress: dto.currentProgress,
      tajweedWeaknesses: (dto.tajweedWeaknesses ?? []) as TajweedRuleType[],
    });

    // ── 2. Risk assessment from feature store ────────────────────────────────
    const featureVector = this.featureStore.getOrDefault(tenantId, dto.studentId);
    const risk = this.riskEngine.assess(
      dto.studentId,
      tenantId,
      featureVector.features as Record<string, number>,
    );

    // ── 3. Forecast ──────────────────────────────────────────────────────────
    const forecast = this.engines.forecast.compute({
      targetAyahs: dto.targetAyahs,
      currentProgress: dto.currentProgress,
      weeklyVelocities: dto.weeklyVelocities,
      burdenScore: dto.burdenScore,
      reviewOverdueCount: 0,
    });

    return {
      studentId: dto.studentId,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      riskFactors: risk.riskFactors,
      riskRecommendations: risk.recommendations,
      recommendations: plan.recommendations,
      adaptivePlan: plan.adaptivePlan,
      forecast,
      velocity: plan.velocity,
      isOnTrack: plan.isOnTrack,
      generatedAt: new Date().toISOString(),
    };
  }
}
