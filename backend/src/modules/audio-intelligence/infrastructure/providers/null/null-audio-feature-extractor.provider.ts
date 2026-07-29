import { Injectable } from '@nestjs/common';
import {
  IAudioFeatureExtractor,
  AudioFeatures,
  SegmentFeatures,
} from '../interfaces/audio-feature-extractor.provider.interface';
import { AudioRules } from '../../../domain/rules/audio-rules';

/**
 * NullAudioFeatureExtractor — a no-op implementation of IAudioFeatureExtractor.
 *
 * Returns zero-filled feature arrays so the pipeline can complete without
 * native DSP dependencies. TajweedAnalysisEngine will produce
 * ObservationOutcome = 'undetectable' for all rule applications when
 * features are zero-filled.
 *
 * Activation: injected by default until a real feature extractor (librosa
 * bridge, ONNX pitch tracker, …) is configured.
 */
@Injectable()
export class NullAudioFeatureExtractor implements IAudioFeatureExtractor {
  readonly providerName = 'null-feature-extractor';
  readonly isAvailable = false;

  /** Number of MFCC coefficients in the zero-filled arrays. */
  private static readonly MFCC_DIM = 13;

  async extractFeatures(audioBuffer: Buffer): Promise<AudioFeatures> {
    const durationSeconds =
      audioBuffer.length / (AudioRules.TARGET_SAMPLE_RATE * 2);
    const frameRateHz = 100; // 10 ms frames
    const frameCount = Math.max(Math.ceil(durationSeconds * frameRateHz), 1);

    return {
      mfcc: Array.from({ length: frameCount }, () =>
        new Array(NullAudioFeatureExtractor.MFCC_DIM).fill(0),
      ),
      pitchHz: new Array(frameCount).fill(0),
      energyDbfs: new Array(frameCount).fill(-80),
      zeroCrossingRate: new Array(frameCount).fill(0),
      frameRateHz,
      durationSeconds: Math.max(durationSeconds, 0),
      providerName: this.providerName,
      isNullProvider: true,
    };
  }

  async extractSegmentFeatures(
    _audioBuffer: Buffer,
    startSeconds: number,
    endSeconds: number,
    segmentIndex: number,
  ): Promise<SegmentFeatures> {
    return {
      segmentIndex,
      startSeconds,
      endSeconds,
      meanPitchHz: 0,
      meanEnergyDbfs: -80,
      pitchVariance: 0,
      mfccMeans: new Array(NullAudioFeatureExtractor.MFCC_DIM).fill(0),
      voicedRatio: 0,
      providerName: this.providerName,
    };
  }
}
