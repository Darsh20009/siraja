import { Injectable } from '@nestjs/common';
import {
  IAudioPreprocessor,
  PreprocessOptions,
  PreprocessedAudio,
  VoiceActivityResult,
} from '../interfaces/audio-preprocessor.provider.interface';
import { AudioRules } from '../../../domain/rules/audio-rules';

/**
 * NullAudioPreprocessor — a no-op implementation of IAudioPreprocessor.
 *
 * Preprocessing: returns the input buffer unchanged with estimated metadata.
 *
 * VAD: returns a single speech segment spanning the entire audio with a
 * confidence of 0.5 (above AudioRules.VAD_CONFIDENCE_THRESHOLD of 0.40),
 * allowing the pipeline to treat the full audio as one speech segment.
 *
 * Activation: injected by default until a real preprocessor (WebRTC VAD,
 * ONNX noise suppressor, SoX, …) is configured.
 */
@Injectable()
export class NullAudioPreprocessor implements IAudioPreprocessor {
  readonly providerName = 'null-preprocessor';
  readonly isAvailable = false;

  async preprocess(
    audioBuffer: Buffer,
    _options?: PreprocessOptions,
  ): Promise<PreprocessedAudio> {
    // Estimate duration from byte count assuming 16-bit mono PCM at target rate.
    const estimatedDurationSeconds =
      audioBuffer.length / (AudioRules.TARGET_SAMPLE_RATE * 2);

    return {
      buffer: audioBuffer,
      sampleRate: AudioRules.TARGET_SAMPLE_RATE,
      channels: 1,
      durationSeconds: Math.max(estimatedDurationSeconds, 0),
      noiseFloorDbfs: 0,
      providerName: this.providerName,
      isNullProvider: true,
    };
  }

  async detectVoiceActivity(audioBuffer: Buffer): Promise<VoiceActivityResult> {
    const estimatedDurationSeconds =
      audioBuffer.length / (AudioRules.TARGET_SAMPLE_RATE * 2);
    const duration = Math.max(estimatedDurationSeconds, 0);

    return {
      segments: [
        {
          startSeconds: 0,
          endSeconds: duration,
          // Confidence 0.5 clears the VAD_CONFIDENCE_THRESHOLD (0.40)
          // so the full buffer is treated as one speech segment.
          confidence: 0.5,
        },
      ],
      totalSpeechSeconds: duration,
      totalSilenceSeconds: 0,
      speechRatio: 1,
      providerName: this.providerName,
      isNullProvider: true,
    };
  }
}
