import { Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import { AudioMistakeEngine } from '../../../domain/engines/audio-mistake.engine';
import { TajweedAnalysisEngine } from '../../../domain/engines/tajweed-analysis.engine';

/**
 * MistakeDetectionStage — detects recitation mistakes and tajweed
 * observations from the word alignments produced by QuranAlignmentStage.
 *
 * Two engines are invoked:
 *   AudioMistakeEngine  → structural mistakes (wrong/skipped/repeated words,
 *                          skipped ayahs, ordering errors, pronunciation errors)
 *   TajweedAnalysisEngine → tajweed rule evaluations (madd, ghunna, qalqala, …)
 *
 * Both engines are pure classes with no NestJS dependencies, instantiated
 * with `new` to keep the pipeline free from DI complexity.
 *
 * Writes to context:
 *   ctx.mistakes — MistakeDetection[]
 *   ctx.tajweedObservations — TajweedObservation[]
 */
@Injectable()
export class MistakeDetectionStage implements IPipelineStage {
  readonly stageName = 'MistakeDetection';

  private readonly mistakeEngine = new AudioMistakeEngine();
  private readonly tajweedEngine = new TajweedAnalysisEngine();

  async execute(ctx: AudioPipelineContext): Promise<void> {
    // Structural mistake detection
    ctx.mistakes = this.mistakeEngine.detect(ctx.wordAlignments, ctx.sessionId);

    // Tajweed observation analysis
    ctx.tajweedObservations = this.tajweedEngine.analyse(
      ctx.wordAlignments,
      ctx.segmentFeatures,
      ctx.sessionId,
    );
  }
}
