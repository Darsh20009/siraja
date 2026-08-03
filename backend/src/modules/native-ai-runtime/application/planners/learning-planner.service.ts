import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { FeatureStoreService } from '../services/feature-store.service';
import type { AdaptivePlan } from '../../../native-ai/domain/entities/adaptive-plan.entity';
import type { AdaptivePlanInput } from '../../../native-ai/domain/engines/adaptive-learning.engine';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';
import type { TajweedRuleType } from '../../../native-ai/domain/entities/tajweed-rule-application.entity';
import type { RecommendationInput } from '../../../native-ai/domain/engines/recommendation.engine';

export interface LearningPlanInput {
  studentId: string;
  tenantId: string;
  weeklyVelocities: number[];
  sessions: Array<{ grade: number; easeFactor?: number; interval?: number; repetitions?: number }>;
  burdenScore: number;
  tajweedScore: number;
  currentDifficultyLevel: number;
  daysSinceLastSession: number;
  targetAyahs: number;
  currentProgress: number;
  tajweedWeaknesses?: TajweedRuleType[];
}

export interface PersonalizedLearningPlan {
  studentId: string;
  tenantId: string;
  adaptivePlan: AdaptivePlan;
  recommendations: AiRecommendation[];
  velocity: number;
  isOnTrack: boolean;
  generatedAt: Date;
}

/**
 * LearningPlannerService — generates a personalized weekly learning plan by
 * chaining FeatureStore → AdaptiveLearning engine → Recommendation engine.
 *
 * Deterministic, in-process, zero external AI.
 */
@Injectable()
export class LearningPlannerService {
  constructor(
    private readonly engines: NativeAiEngineService,
    private readonly featureStore: FeatureStoreService,
  ) {}

  buildPlan(input: LearningPlanInput): PersonalizedLearningPlan {
    // ── 1. Update feature store with latest signals ───────────────────────────
    const velocity = this.engines.forecast.computeVelocity(input.weeklyVelocities);
    const pattern = this.engines.memorizationPattern.analyze(input.sessions);

    this.featureStore.upsert(input.tenantId, input.studentId, {
      velocity,
      burdenScore: input.burdenScore,
      tajweedScore: input.tajweedScore,
      retentionRate: pattern.retentionProbability * 100,
      daysSinceLastSession: input.daysSinceLastSession,
      difficultyLevel: input.currentDifficultyLevel,
      forgettingRate: pattern.forgettingRate * 100,
      completionPercent:
        input.targetAyahs > 0
          ? (input.currentProgress / input.targetAyahs) * 100
          : 0,
    });

    // ── 2. Forecast for estimated weeks to goal ──────────────────────────────
    const forecast = this.engines.forecast.compute({
      targetAyahs: input.targetAyahs,
      currentProgress: input.currentProgress,
      weeklyVelocities: input.weeklyVelocities,
      burdenScore: input.burdenScore,
      reviewOverdueCount: 0,
    });

    // ── 3. Build adaptive plan ────────────────────────────────────────────────
    const systematicMistakes = this.engines.mistakeClassifier.detectPatterns([]);
    const planInput: AdaptivePlanInput = {
      currentDifficultyLevel: input.currentDifficultyLevel,
      velocity,
      burdenScore: input.burdenScore,
      forgettingRate: pattern.forgettingRate,
      systematicMistakes,
      tajweedWeaknesses: input.tajweedWeaknesses ?? [],
      estimatedWeeksToGoal:
        forecast.remainingAyahs / Math.max(forecast.projectedVelocity, 0.1),
    };
    const adaptivePlan = this.engines.adaptiveLearning.buildPlan(planInput);

    // ── 4. Generate recommendations ───────────────────────────────────────────
    const recInput: RecommendationInput = {
      velocity,
      forgettingRate: pattern.forgettingRate,
      retentionProbability: pattern.retentionProbability,
      burdenScore: input.burdenScore,
      tajweedScore: input.tajweedScore,
      systematicMistakes,
      isOnTrack: forecast.isOnTrack,
      daysSinceLastSession: input.daysSinceLastSession,
      weeklyCapacity: pattern.weeklyCapacity,
      currentDifficultyLevel: input.currentDifficultyLevel,
    };
    const recommendations = this.engines.recommendation.generate(recInput);

    return {
      studentId: input.studentId,
      tenantId: input.tenantId,
      adaptivePlan,
      recommendations,
      velocity,
      isOnTrack: forecast.isOnTrack,
      generatedAt: new Date(),
    };
  }
}
