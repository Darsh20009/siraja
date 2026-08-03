import { Injectable } from '@nestjs/common';
import { NativeAiEngineService } from '../../../native-ai/application/services/native-ai-engine.service';
import { RiskEngine } from '../../domain/engines/risk.engine';
import { StudentTimelineProvider } from './student-timeline.provider';
import type { ParentReport, ProgressSnapshot } from '../../domain/entities/parent-report.entity';
import type { RawTimelineEvent } from './student-timeline.provider';
import type { AiRecommendation } from '../../../native-ai/domain/entities/ai-recommendation.entity';
import type { ForecastInput } from '../../../native-ai/domain/engines/forecast.engine';
import type { RecommendationInput } from '../../../native-ai/domain/engines/recommendation.engine';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

export interface ParentReportInput {
  studentId: string;
  studentName: string;
  tenantId: string;
  periodFrom: Date;
  periodTo: Date;
  weeklyVelocities: number[];
  sessions: Array<{ grade: number; easeFactor?: number; interval?: number; repetitions?: number }>;
  targetAyahs: number;
  currentProgress: number;
  burdenScore: number;
  tajweedScore: number;
  daysSinceLastSession: number;
  currentDifficultyLevel: number;
  streakDays?: number;
  timelineEvents?: RawTimelineEvent[];
  features?: Record<string, number>;
}

/**
 * ParentReportProvider — composes a comprehensive AI-generated report for
 * a student's parent or guardian.
 *
 * Chains: RiskEngine + ForecastEngine + RecommendationEngine + StudentTimelineProvider
 * → plain-language summary.
 *
 * Deterministic, in-process, zero external AI.
 */
@Injectable()
export class ParentReportProvider {
  private readonly riskEngine = new RiskEngine();

  constructor(
    private readonly engines: NativeAiEngineService,
    private readonly timelineProvider: StudentTimelineProvider,
  ) {}

  generate(input: ParentReportInput): ParentReport {
    const velocity = this.engines.forecast.computeVelocity(input.weeklyVelocities);
    const pattern = this.engines.memorizationPattern.analyze(input.sessions);

    // ── Feature map ──────────────────────────────────────────────────────────
    const features: Record<string, number> = {
      velocity,
      burdenScore: input.burdenScore,
      tajweedScore: input.tajweedScore,
      retentionRate: pattern.retentionProbability * 100,
      daysSinceLastSession: input.daysSinceLastSession,
      difficultyLevel: input.currentDifficultyLevel,
      forgettingRate: pattern.forgettingRate * 100,
      ...(input.features ?? {}),
    };

    // ── Risk assessment ───────────────────────────────────────────────────────
    const riskAssessment = this.riskEngine.assess(input.studentId, input.tenantId, features);

    // ── Forecast ──────────────────────────────────────────────────────────────
    const forecastInput: ForecastInput = {
      targetAyahs: input.targetAyahs,
      currentProgress: input.currentProgress,
      weeklyVelocities: input.weeklyVelocities,
      burdenScore: input.burdenScore,
      reviewOverdueCount: 0,
    };
    const forecast = this.engines.forecast.compute(forecastInput);

    // ── Recommendations ───────────────────────────────────────────────────────
    const systematicMistakes = this.engines.mistakeClassifier.detectPatterns([]);
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
    const topRecs: AiRecommendation[] = recommendations.slice(0, PipelineRules.MAX_RECOMMENDATIONS);

    // ── Progress snapshot ─────────────────────────────────────────────────────
    const completionPct =
      input.targetAyahs > 0 ? (input.currentProgress / input.targetAyahs) * 100 : 0;
    const progressSnapshot: ProgressSnapshot = {
      ayahsMemorized: input.currentProgress,
      targetAyahs: input.targetAyahs,
      completionPercentage: Math.round(completionPct),
      weeklyVelocity: velocity,
      tajweedScore: input.tajweedScore,
      burdenScore: input.burdenScore,
      streakDays: input.streakDays ?? 0,
    };

    // ── Timeline ──────────────────────────────────────────────────────────────
    const timeline = this.timelineProvider.build(
      input.studentId,
      input.tenantId,
      input.timelineEvents ?? [],
      features,
    );

    // ── Summary ───────────────────────────────────────────────────────────────
    const summary = this.generateSummary(input.studentName, progressSnapshot, riskAssessment.riskLevel, forecast.isOnTrack);

    return {
      studentId: input.studentId,
      studentName: input.studentName,
      tenantId: input.tenantId,
      generatedAt: new Date(),
      period: { from: input.periodFrom, to: input.periodTo },
      summary,
      progressSnapshot,
      riskAssessment,
      topRecommendations: topRecs,
      forecast,
      timeline,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private generateSummary(
    name: string,
    progress: ProgressSnapshot,
    riskLevel: string,
    isOnTrack: boolean,
  ): string {
    const paceDesc = isOnTrack ? 'on track' : 'behind target pace';
    const riskDesc = riskLevel === 'low' ? 'no significant concerns' : `a ${riskLevel} risk level`;

    return (
      `${name} has memorized ${progress.ayahsMemorized} of ${progress.targetAyahs} ayahs ` +
      `(${progress.completionPercentage}% complete) and is currently ${paceDesc}. ` +
      `The AI assessment identified ${riskDesc}. ` +
      `Weekly pace: ${progress.weeklyVelocity.toFixed(1)} ayahs/week; ` +
      `Tajweed score: ${progress.tajweedScore}/100.`
    );
  }
}
