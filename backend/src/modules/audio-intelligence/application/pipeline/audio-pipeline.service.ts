import { Injectable, Logger } from '@nestjs/common';
import { AudioPipelineContext } from './pipeline-context';
import { AudioValidationStage } from './stages/audio-validation.stage';
import { NoiseReductionStage } from './stages/noise-reduction.stage';
import { VoiceActivityDetectionStage } from './stages/voice-activity-detection.stage';
import { AudioSegmentationStage } from './stages/audio-segmentation.stage';
import { FeatureExtractionStage } from './stages/feature-extraction.stage';
import { QuranAlignmentStage } from './stages/quran-alignment.stage';
import { MistakeDetectionStage } from './stages/mistake-detection.stage';
import { ScoringStage } from './stages/scoring.stage';
import { RecommendationStage } from './stages/recommendation.stage';

/**
 * AudioPipelineService — orchestrates the nine-stage audio processing
 * pipeline for Quran recitation analysis.
 *
 * Stage order (strict):
 *   1. AudioValidation      — file size, format, duration
 *   2. NoiseReduction       — preprocessing and normalisation
 *   3. VoiceActivityDetection — speech/silence segmentation
 *   4. AudioSegmentation    — split into domain AudioSegments
 *   5. FeatureExtraction    — MFCC, pitch, energy per segment
 *   6. QuranAlignment       — ASR transcription + word alignment
 *   7. MistakeDetection     — structural and tajweed mistakes
 *   8. Scoring              — composite AudioScore
 *   9. Recommendation       — actionable AudioRecommendation list
 *
 * The pipeline is synchronous within a request cycle. For production at
 * scale, ProcessAudioSessionUseCase should enqueue this work via BullMQ
 * (already available in the project) so the HTTP response is not blocked.
 *
 * Throws on validation failure; all other stage errors bubble up as-is.
 */
@Injectable()
export class AudioPipelineService {
  private readonly logger = new Logger(AudioPipelineService.name);

  constructor(
    private readonly validationStage: AudioValidationStage,
    private readonly noiseReductionStage: NoiseReductionStage,
    private readonly vadStage: VoiceActivityDetectionStage,
    private readonly segmentationStage: AudioSegmentationStage,
    private readonly featureExtractionStage: FeatureExtractionStage,
    private readonly alignmentStage: QuranAlignmentStage,
    private readonly mistakeDetectionStage: MistakeDetectionStage,
    private readonly scoringStage: ScoringStage,
    private readonly recommendationStage: RecommendationStage,
  ) {}

  /**
   * Run the full pipeline against an AudioPipelineContext.
   *
   * @param ctx  Pre-initialised pipeline context (audioBuffer, expectedWords, etc.)
   * @throws     On audio validation failure or any unrecoverable stage error.
   */
  async run(ctx: AudioPipelineContext): Promise<void> {
    const stages = [
      this.validationStage,
      this.noiseReductionStage,
      this.vadStage,
      this.segmentationStage,
      this.featureExtractionStage,
      this.alignmentStage,
      this.mistakeDetectionStage,
      this.scoringStage,
      this.recommendationStage,
    ];

    for (const stage of stages) {
      this.logger.debug(
        `[${ctx.sessionId}] Running stage: ${stage.stageName}`,
      );
      const stageStart = Date.now();
      await stage.execute(ctx);
      this.logger.debug(
        `[${ctx.sessionId}] Stage ${stage.stageName} completed in ${Date.now() - stageStart}ms`,
      );
    }

    this.logger.log(
      `[${ctx.sessionId}] Pipeline complete — ` +
        `score=${ctx.score?.compositeScore ?? 0}, ` +
        `mistakes=${ctx.mistakes.length}, ` +
        `tajweed=${ctx.tajweedObservations.length}, ` +
        `nullASR=${ctx.usedNullAsrProvider}`,
    );
  }
}
