import { Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import { AudioScoreEngine } from '../../../domain/engines/audio-score.engine';
import { ConfidenceEngine } from '../../../domain/engines/confidence.engine';

/**
 * ScoringStage — computes the composite AudioScore from all pipeline
 * analysis results.
 *
 * Invokes two pure engines:
 *   ConfidenceEngine  → aggregates ASR word confidence into session score
 *   AudioScoreEngine  → computes composite and all sub-scores
 *
 * Writes to context:
 *   ctx.score — AudioScore
 */
@Injectable()
export class ScoringStage implements IPipelineStage {
  readonly stageName = 'Scoring';

  private readonly scoreEngine = new AudioScoreEngine();
  private readonly confidenceEngine = new ConfidenceEngine();

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const confidenceResult = this.confidenceEngine.compute(
      ctx.wordAlignments,
      ctx.segments,
    );

    ctx.score = this.scoreEngine.score({
      sessionId: ctx.sessionId,
      wordAlignments: ctx.wordAlignments,
      segments: ctx.segments,
      mistakes: ctx.mistakes,
      tajweedObservations: ctx.tajweedObservations,
      totalExpectedWords: ctx.totalExpectedWords,
      correctWords: ctx.correctWords,
      deletedWords: ctx.deletedWords,
      insertedWords: ctx.insertedWords,
      speechDurationSeconds: ctx.totalSpeechSeconds,
      asrConfidenceScore: confidenceResult.sessionConfidence,
    });
  }
}
