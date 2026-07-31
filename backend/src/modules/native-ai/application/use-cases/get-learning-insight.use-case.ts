import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../services/native-ai-engine.service';
import type { GetLearningInsightRequestDto, GetLearningInsightResponseDto } from '../dtos/learning-insight.dto';
import type { RecommendationInput } from '../../domain/engines/recommendation.engine';
import type { ForecastInput } from '../../domain/engines/forecast.engine';
import type { AdaptivePlanInput } from '../../domain/engines/adaptive-learning.engine';
import type { TajweedRuleType } from '../../domain/entities/tajweed-rule-application.entity';

/**
 * GetLearningInsightUseCase — orchestrates the four learning-intelligence
 * engines (MemorizationPattern, Forecast, Recommendation, AdaptiveLearning)
 * to produce a comprehensive personalised insight bundle.
 *
 * No database access; entirely deterministic in-process computation.
 * Designed to be called after the controller has fetched domain data.
 */
@Injectable()
export class GetLearningInsightUseCase {
  constructor(private readonly engines: NativeAiEngineService) {}

  execute(dto: GetLearningInsightRequestDto): GetLearningInsightResponseDto {
    const {
      sessions,
      targetAyahs,
      currentProgress,
      weeklyVelocities,
      burdenScore,
      reviewOverdueCount = 0,
      tajweedScore = 70,
      currentDifficultyLevel = 2,
      daysSinceLastSession = 0,
      tajweedWeaknesses = [],
    } = dto;

    // ── 1. Memorization pattern (SM-2 + Ebbinghaus) ──────────────────────────
    const pattern = this.engines.memorizationPattern.analyze(sessions);

    // ── 2. Forecast (velocity-based completion timeline) ──────────────────────
    const forecastInput: ForecastInput = {
      targetAyahs,
      currentProgress,
      weeklyVelocities,
      burdenScore,
      reviewOverdueCount,
    };
    const forecastRaw = this.engines.forecast.compute(forecastInput);

    // ── 3. Recommendations (rule-based advisory engine) ───────────────────────
    const velocity = this.engines.forecast.computeVelocity(weeklyVelocities);
    const systematicMistakes = this.engines.mistakeClassifier.detectPatterns([]);

    const recInput: RecommendationInput = {
      velocity,
      forgettingRate: pattern.forgettingRate,
      retentionProbability: pattern.retentionProbability,
      burdenScore,
      tajweedScore,
      systematicMistakes,
      isOnTrack: forecastRaw.isOnTrack,
      daysSinceLastSession,
      weeklyCapacity: pattern.weeklyCapacity,
      currentDifficultyLevel,
    };
    const recommendations = this.engines.recommendation.generate(recInput);

    // ── 4. Adaptive plan ──────────────────────────────────────────────────────
    const planInput: AdaptivePlanInput = {
      currentDifficultyLevel,
      velocity,
      burdenScore,
      forgettingRate: pattern.forgettingRate,
      systematicMistakes,
      tajweedWeaknesses: tajweedWeaknesses as TajweedRuleType[],
      estimatedWeeksToGoal: forecastRaw.remainingAyahs / Math.max(forecastRaw.projectedVelocity, 0.1),
    };
    const adaptivePlan = this.engines.adaptiveLearning.buildPlan(planInput);

    // ── 5. Shape response DTOs ────────────────────────────────────────────────
    const toIso = (d: Date) => d.toISOString();

    return {
      pattern: {
        easeFactor: pattern.easeFactor,
        interval: pattern.interval,
        repetitions: pattern.repetitions,
        retentionProbability: pattern.retentionProbability,
        forgettingRate: pattern.forgettingRate,
        optimalStudyTime: pattern.optimalStudyTime,
        recommendedSessionLength: pattern.recommendedSessionLength,
        newToReviewRatio: pattern.newToReviewRatio,
        weeklyCapacity: pattern.weeklyCapacity,
      },
      forecast: {
        targetAyahs: forecastRaw.targetAyahs,
        currentProgress: forecastRaw.currentProgress,
        remainingAyahs: forecastRaw.remainingAyahs,
        velocity: forecastRaw.velocity,
        projectedVelocity: forecastRaw.projectedVelocity,
        estimatedCompletionDate: toIso(forecastRaw.estimatedCompletionDate),
        confidenceLow: toIso(forecastRaw.confidenceLow),
        confidenceHigh: toIso(forecastRaw.confidenceHigh),
        weeklyPaceRequired: forecastRaw.weeklyPaceRequired,
        isOnTrack: forecastRaw.isOnTrack,
        completionProbability: forecastRaw.completionProbability,
        milestones: forecastRaw.milestones.map((m) => ({
          label: m.label,
          targetAyahs: m.targetAyahs,
          estimatedDate: toIso(m.estimatedDate),
          probability: m.probability,
        })),
        burdenScore: forecastRaw.burdenScore,
      },
      recommendations: recommendations.map((r) => ({
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
        actionItems: r.actionItems,
        estimatedImpact: r.estimatedImpact,
        confidenceScore: r.confidenceScore,
        triggeredBy: r.triggeredBy,
        targetArea: r.targetArea,
      })),
      adaptivePlan: {
        adjustedWeeklyPace: adaptivePlan.adjustedWeeklyPace,
        difficultyLevel: adaptivePlan.difficultyLevel,
        reviewEmphasis: adaptivePlan.reviewEmphasis,
        weeklySchedule: adaptivePlan.weeklySchedule,
        focusAreas: adaptivePlan.focusAreas,
        tajweedFocusRules: adaptivePlan.tajweedFocusRules,
        estimatedWeeksToGoal: adaptivePlan.estimatedWeeksToGoal,
        rationale: adaptivePlan.rationale,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
