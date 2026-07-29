import { Inject, Injectable } from '@nestjs/common';
import { IPipelineStage } from '../pipeline-stage.interface';
import { AudioPipelineContext } from '../pipeline-context';
import {
  IAudioPreprocessor,
  AUDIO_PREPROCESSOR,
} from '../../../infrastructure/providers/interfaces/audio-preprocessor.provider.interface';

/**
 * VoiceActivityDetectionStage — identifies speech segments within the
 * preprocessed audio buffer.
 *
 * Delegates to IAudioPreprocessor.detectVoiceActivity(). The result is
 * stored on the context and consumed by AudioSegmentationStage.
 *
 * Writes to context:
 *   ctx.vadSegments, ctx.speechRatio, ctx.totalSpeechSeconds
 */
@Injectable()
export class VoiceActivityDetectionStage implements IPipelineStage {
  readonly stageName = 'VoiceActivityDetection';

  constructor(
    @Inject(AUDIO_PREPROCESSOR)
    private readonly preprocessor: IAudioPreprocessor,
  ) {}

  async execute(ctx: AudioPipelineContext): Promise<void> {
    const result = await this.preprocessor.detectVoiceActivity(ctx.preprocessedBuffer);

    ctx.vadSegments = result.segments;
    ctx.speechRatio = result.speechRatio;
    ctx.totalSpeechSeconds = result.totalSpeechSeconds;
  }
}
