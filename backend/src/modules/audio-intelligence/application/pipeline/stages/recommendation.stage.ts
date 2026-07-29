import { Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import { AudioRecommendationEngine } from '../../../domain/engines/audio-recommendation.engine';

/**
 * RecommendationStage — generates actionable recommendations from the
 * scored audio analysis.
 *
 * Invokes AudioRecommendationEngine (pure class, no DI) with the final
 * AudioScore, MistakeDetection list, and TajweedObservation list.
 *
 * Must run AFTER ScoringStage.
 *
 * Writes to context:
 *   ctx.recommendations — AudioRecommendation[] (sorted high → low, capped)
 */
@Injectable()
export class RecommendationStage implements IPipelineStage {
  readonly stageName = 'Recommendation';

  private readonly recEngine = new AudioRecommendationEngine();

  async execute(ctx: AudioPipelineContext): Promise<void> {
    if (!ctx.score) {
      // Score absent means a previous stage failed — produce empty recommendations
      ctx.recommendations = [];
      return;
    }

    ctx.recommendations = this.recEngine.generate(
      ctx.score,
      ctx.mistakes,
      ctx.tajweedObservations,
    );
  }
}
