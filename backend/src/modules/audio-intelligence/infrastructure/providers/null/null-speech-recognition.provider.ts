import { Injectable } from '@nestjs/common';
import {
  ISpeechRecognitionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from '../interfaces/speech-recognition.provider.interface';

/**
 * NullSpeechRecognitionProvider — a no-op implementation of
 * ISpeechRecognitionProvider.
 *
 * Returns an empty word list so the pipeline can execute end-to-end
 * without a real ASR engine. The session is marked 'no_asr' instead
 * of 'completed' when this provider is active.
 *
 * Activation: injected by default (SPEECH_RECOGNITION_PROVIDER token)
 * until a real provider (Faster-Whisper, whisper.cpp, Vosk, …) is
 * configured and registered.
 */
@Injectable()
export class NullSpeechRecognitionProvider implements ISpeechRecognitionProvider {
  readonly providerName = 'null-asr';
  readonly isAvailable = false;

  async transcribe(
    _audioBuffer: Buffer,
    _options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    return {
      words: [],
      language: 'ar',
      durationSeconds: 0,
      overallConfidence: 0,
      providerName: this.providerName,
      isNullProvider: true,
    };
  }
}
