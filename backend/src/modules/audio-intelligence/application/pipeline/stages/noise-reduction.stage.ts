import { Inject, Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import {
  IAudioPreprocessor,
  AUDIO_PREPROCESSOR,
} from '../../../infrastructure/providers/interfaces/audio-preprocessor.provider.interface';
import { AudioRules } from '../../../domain/rules/audio-rules';

/**
 * NoiseReductionStage — applies audio preprocessing (noise suppression,
 * normalisation, resampling) to the raw audio buffer.
 *
 * Delegates to the injected IAudioPreprocessor. When the null provider is
 * active the buffer is returned unchanged.
 *
 * Writes to context:
 *   ctx.preprocessedBuffer, ctx.noiseFloorDbfs
 */
@Injectable()
export class NoiseReductionStage implements IPipelineStage {
  readonly stageName = 'NoiseReduction';

  constructor(
    @Inject(AUDIO_PREPROCESSOR)
    private readonly preprocessor: IAudioPreprocessor,
  ) {}

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const result = await this.preprocessor.preprocess(ctx.audioBuffer, {
      targetSampleRate: AudioRules.TARGET_SAMPLE_RATE,
      normalizeVolume: true,
      reduceNoise: true,
      downmixToMono: true,
    });

    ctx.preprocessedBuffer = result.buffer;
    ctx.noiseFloorDbfs = result.noiseFloorDbfs;

    // Update metadata if the preprocessor reports more accurate values
    if (result.sampleRate > 0) ctx.sampleRate = result.sampleRate;
    if (result.channels > 0) ctx.channels = result.channels;
    if (result.durationSeconds > 0) ctx.durationSeconds = result.durationSeconds;
  }
}
