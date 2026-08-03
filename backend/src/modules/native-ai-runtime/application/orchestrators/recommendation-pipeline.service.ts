import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { ExplainabilityEngine } from '../../domain/engines/explainability.engine';
import { RuleEngine } from '../../domain/engines/rule.engine';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';
import type { AiExplanation } from '../../domain/entities/ai-explanation.entity';
import type { AiRule } from '../../domain/entities/ai-rule.entity';
import type { RecommendationInput } from '../../../native-ai/domain/engines/recommendation.engine';
import type { ForecastInput } from '../../../native-ai/domain/engines/forecast.engine';

export interface RecommendationPipelineInput {
  studentId: string;
  tenantId: string;
  /** SM-2 session history. */
  sessions: Array<{ grade: number; easeFactor?: number; interval?: number; repetitions?: number }>;
  weeklyVelocities: number[];
  targetAyahs: number;
  currentProgress: number;
  burdenScore: number;
  tajweedScore: number;
  daysSinceLastSession: number;
  currentDifficultyLevel: number;
  systematicMistakeCount?: number;
}

export interface RecommendationPipelineOutput {
  recommendations: AiRecommendation[];
  explanation: AiExplanation | null;
  velocity: number;
  isOnTrack: boolean;
  retentionProbability: number;
  forgettingRate: number;
  generatedAt: Date;
}

/**
 * RecommendationPipelineService — full recommendation pipeline that chains:
 *   MemorizationPatternEngine → ForecastEngine → RecommendationEngine → ExplainabilityEngine
 *
 * Deterministic, in-process, zero external AI.
 */
@Injectable()
export class RecommendationPipelineService {
  private readonly explainabilityEngine = new ExplainabilityEngine();
  private readonly ruleEngine = new RuleEngine();

  constructor(private readonly engines: NativeAiEngineService) {}

  run(input: RecommendationPipelineInput): RecommendationPipelineOutput {
    // ── Stage 1: Memorization pattern (SM-2 + Ebbinghaus) ────────────────────
    const pattern = this.engines.memorizationPattern.analyze(input.sessions);

    // ── Stage 2: Forecast (velocity-based completion timeline) ────────────────
    const forecastInput: ForecastInput = {
      targetAyahs: input.targetAyahs,
      currentProgress: input.currentProgress,
      weeklyVelocities: input.weeklyVelocities,
      burdenScore: input.burdenScore,
      reviewOverdueCount: 0,
    };
    const forecast = this.engines.forecast.compute(forecastInput);
    const velocity = this.engines.forecast.computeVelocity(input.weeklyVelocities);

    // ── Stage 3: Systematic mistake patterns ─────────────────────────────────
    const systematicMistakes = this.engines.mistakeClassifier.detectPatterns([]);

    // ── Stage 4: Recommendations ──────────────────────────────────────────────
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

    // ── Stage 5: Explainability ────────────────────────────────────────────────
    const featureMap: Record<string, number> = {
      velocity,
      burdenScore: input.burdenScore,
      tajweedScore: input.tajweedScore,
      retentionRate: pattern.retentionProbability * 100,
      daysSinceLastSession: input.daysSinceLastSession,
      difficultyLevel: input.currentDifficultyLevel,
    };

    const rules = this.buildExplainabilityRules(recInput);
    const firedRuleIds = recommendations.map((r) => r.triggeredBy).flat();
    const explanation =
      recommendations.length > 0
        ? this.explainabilityEngine.explain(
            {
              decisionId: `rec_${Date.now()}`,
              type: 'learning_plan_adjustment',
              outcome: recommendations[0]?.type ?? 'no_action',
              confidence: recommendations[0]?.confidenceScore ?? 0,
              evidence: recommendations.map((r) => r.type),
              rulesFired: firedRuleIds,
              timestamp: new Date(),
              metadata: {},
            },
            rules,
            featureMap,
          )
        : null;

    return {
      recommendations,
      explanation,
      velocity,
      isOnTrack: forecast.isOnTrack,
      retentionProbability: pattern.retentionProbability,
      forgettingRate: pattern.forgettingRate,
      generatedAt: new Date(),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildExplainabilityRules(input: RecommendationInput): AiRule[] {
    const fv = input as unknown as Record<string, number>;
    return [
      {
        id: 'risk.high_burden',
        name: 'High Burden',
        category: 'risk',
        condition: () => fv['burdenScore'] > 60,
        weight: 0.3,
        description: 'Burden score > 60',
        action: 'increase_review_frequency',
      },
      {
        id: 'risk.low_velocity',
        name: 'Low Velocity',
        category: 'risk',
        condition: () => fv['velocity'] < 1,
        weight: 0.25,
        description: 'Velocity < 1 ayah/week',
        action: 'adjust_difficulty_down',
      },
      {
        id: 'risk.low_retention',
        name: 'Low Retention',
        category: 'risk',
        condition: () => fv['retentionRate'] < 60,
        weight: 0.2,
        description: 'Retention < 60%',
        action: 'increase_review_frequency',
      },
      {
        id: 'tajweed.low_score',
        name: 'Low Tajweed Score',
        category: 'tajweed',
        condition: () => fv['tajweedScore'] < 60,
        weight: 0.15,
        description: 'Tajweed score < 60',
        action: 'focus_tajweed_rule',
      },
      {
        id: 'engagement.absence',
        name: 'Recent Absence',
        category: 'engagement',
        condition: () => fv['daysSinceLastSession'] > 7,
        weight: 0.1,
        description: 'No session in > 7 days',
        action: 'consistency_alert',
      },
    ];
  }
}
