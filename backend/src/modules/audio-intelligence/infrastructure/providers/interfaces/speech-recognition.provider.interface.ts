/**
 * TranscriptionWord — a single word-level output from an ASR provider.
 *
 * Timestamps are in seconds relative to the start of the audio buffer
 * passed to ISpeechRecognitionProvider.transcribe().
 */
export interface TranscriptionWord {
  /** Arabic text of the recognised word. */
  text: string;

  /** Start time of this word within the provided audio buffer (seconds). */
  startSeconds: number;

  /** End time of this word within the provided audio buffer (seconds). */
  endSeconds: number;

  /**
   * Posterior probability that this transcription is correct (0–1).
   * Used by AudioScoreEngine to produce asrConfidenceScore.
   */
  confidence: number;
}

/** Options forwarded to the underlying ASR engine. */
export interface TranscriptionOptions {
  /**
   * BCP-47 language code. 'ar' for Arabic; 'ar-SA' for Saudi dialect.
   * Providers that do not support language selection may ignore this.
   */
  language?: string;

  /**
   * Model identifier (provider-specific).
   * e.g. 'medium', 'large-v3' for Whisper variants.
   */
  model?: string;

  /**
   * Whether to attempt speaker diarisation.
   * Ignored by providers that do not support it.
   */
  diarize?: boolean;

  /**
   * Optional initial prompt to steer Whisper-family models toward Quran
   * vocabulary and Arabic diacritics.
   */
  initialPrompt?: string;
}

/**
 * TranscriptionResult — the full output of one ASR provider call.
 */
export interface TranscriptionResult {
  /** Word-level alignments from the provider. */
  words: TranscriptionWord[];

  /**
   * Detected or forced language code.
   * Null when the provider cannot determine language.
   */
  language: string | null;

  /**
   * Session-level duration as reported by the provider (may differ
   * slightly from measured audio duration due to padding/trimming).
   */
  durationSeconds: number;

  /**
   * Mean word confidence across all words (0–1).
   * Providers that do not compute per-word confidence should set this
   * to their session-level confidence or 0.
   */
  overallConfidence: number;

  /** Human-readable name of the provider that produced this result. */
  providerName: string;

  /**
   * True when the provider ran in its "null / no-op" mode.
   * The pipeline uses this flag to set AudioSessionStatus to 'no_asr'
   * instead of 'completed'.
   */
  isNullProvider: boolean;
}

/** DI injection token for ISpeechRecognitionProvider. */
export const SPEECH_RECOGNITION_PROVIDER = 'SPEECH_RECOGNITION_PROVIDER';

/**
 * ISpeechRecognitionProvider — provider interface for Automatic Speech
 * Recognition.
 *
 * Concrete implementations are injected at module configuration time.
 * The interface is deliberately narrow so that Faster-Whisper,
 * whisper.cpp, ONNX Runtime, or Vosk can all be plugged in without
 * changing the pipeline stages.
 *
 * Design rule: implementations MUST NOT call any remote HTTP endpoint —
 * all inference runs in-process or via a local socket.
 */
export interface ISpeechRecognitionProvider {
  /**
   * Unique, human-readable name for this provider implementation.
   * Used in TranscriptionResult.providerName and logs.
   */
  readonly providerName: string;

  /**
   * Whether this provider can currently process requests.
   * A provider that is not available (e.g. model file not loaded) MUST
   * return false here. The pipeline switches to the null provider when
   * the configured provider reports unavailability.
   */
  readonly isAvailable: boolean;

  /**
   * Transcribe a raw audio buffer and return word-level alignments.
   *
   * @param audioBuffer  Raw audio bytes. The provider is responsible for
   *                     decoding the format (WAV, MP3, etc.).
   * @param options      Provider-specific options.
   * @returns            Structured transcription with word timestamps.
   */
  transcribe(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult>;
}
