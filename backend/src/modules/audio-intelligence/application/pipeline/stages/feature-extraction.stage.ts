import { Inject, Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import {
  IAudioFeatureExtractor,
  AUDIO_FEATURE_EXTRACTOR,
} from '../../../infrastructure/providers/interfaces/audio-feature-extractor.provider.interface';

/**
 * FeatureExtractionStage — extracts acoustic features for each audio
 * segment in the pipeline context.
 *
 * Features (pitch, energy, MFCC) are computed per-segment so the
 * TajweedAnalysisEngine can evaluate madd durations and other time-bounded
 * rules without access to the raw audio buffer.
 *
 * Writes to context:
 *   ctx.segmentFeatures — Map<segmentIndex, SegmentFeatures>
 *   ctx.segments[i].energyDbfs and ctx.segments[i].pitchHz (updated in-place)
 */
@Injectable()
export class FeatureExtractionStage implements IPipelineStage {
  readonly stageName = 'FeatureExtraction';

  constructor(
    @Inject(AUDIO_FEATURE_EXTRACTOR)
    private readonly featureExtractor: IAudioFeatureExtractor,
  ) {}

  async execute(ctx: AudioPipelineContext): Promise<void> {
    for (const segment of ctx.segments) {
      const features = await this.featureExtractor.extractSegmentFeatures(
        ctx.preprocessedBuffer,
        segment.startSeconds,
        segment.endSeconds,
        segment.segmentIndex,
      );

      ctx.segmentFeatures.set(segment.segmentIndex, features);

      // Propagate mean energy and pitch to the segment entity so the
      // repository can persist them without needing feature access.
      segment.energyDbfs = features.meanEnergyDbfs;
      segment.pitchHz = features.meanPitchHz;
    }
  }
}
