/**
 * VoiceSegment — a contiguous span of speech detected by the Voice
 * Activity Detector. Multiple VoiceSegments make up a VoiceActivityResult.
 */
export interface VoiceSegment {
  /** Start offset from the start of the audio buffer (seconds). */
  startSeconds: number;

  /** End offset from the start of the audio buffer (seconds). */
  endSeconds: number;

  /** Probability (0–1) that this span contains speech. */
  confidence: number;
}

/**
 * VoiceActivityResult — the full output of a VAD call.
 */
export interface VoiceActivityResult {
  /** Ordered list of detected speech spans (may overlap for some providers). */
  segments: VoiceSegment[];

  /** Total duration of speech spans (seconds). */
  totalSpeechSeconds: number;

  /** Total duration of silent spans (seconds). */
  totalSilenceSeconds: number;

  /**
   * Ratio of speech to total audio duration (0–1).
   * Used by AudioScoreEngine when computing fluency score.
   */
  speechRatio: number;

  /** Name of the provider that produced this result. */
  providerName: string;

  /** True when the null provider produced this result. */
  isNullProvider: boolean;
}

/** Options for preprocessing a raw audio buffer. */
export interface PreprocessOptions {
  /** Desired output sample rate in Hz. */
  targetSampleRate?: number;

  /** Whether to apply loudness normalisation. */
  normalizeVolume?: boolean;

  /** Whether to apply noise suppression. */
  reduceNoise?: boolean;

  /** Whether to convert stereo to mono before returning. */
  downmixToMono?: boolean;
}

/**
 * PreprocessedAudio — the output of IAudioPreprocessor.preprocess().
 */
export interface PreprocessedAudio {
  /** Preprocessed audio bytes (same format as input, unless resampled). */
  buffer: Buffer;

  /** Sample rate of the returned buffer (Hz). */
  sampleRate: number;

  /** Channel count of the returned buffer. */
  channels: number;

  /** Duration in seconds. */
  durationSeconds: number;

  /**
   * Estimated noise floor in dBFS (negative value; e.g. −40 dBFS).
   * 0 when the null provider is active.
   */
  noiseFloorDbfs: number;

  /** Provider that produced this result. */
  providerName: string;

  /** True when the null provider produced this result. */
  isNullProvider: boolean;
}

/** DI injection token for IAudioPreprocessor. */
export const AUDIO_PREPROCESSOR = 'AUDIO_PREPROCESSOR';

/**
 * IAudioPreprocessor — provider interface for audio preprocessing and
 * Voice Activity Detection.
 *
 * Concrete implementations will wrap libraries such as WebRTC VAD (via
 * Python bridge), ONNX Runtime noise suppression, or SoX resampling.
 * The null implementation returns the input buffer unchanged so the
 * pipeline can run end-to-end in development without any native deps.
 *
 * Design rule: all processing MUST run in-process or via a local socket.
 * No remote HTTP calls permitted.
 */
export interface IAudioPreprocessor {
  /** Human-readable name for this implementation. */
  readonly providerName: string;

  /** Whether this provider is currently available. */
  readonly isAvailable: boolean;

  /**
   * Apply noise reduction, resampling, and normalisation to a raw audio
   * buffer. Returns a preprocessed buffer ready for ASR and feature
   * extraction.
   */
  preprocess(audioBuffer: Buffer, options?: PreprocessOptions): Promise<PreprocessedAudio>;

  /**
   * Detect voice activity within the audio buffer and return a list of
   * speech segments. The null implementation returns a single segment
   * spanning the entire buffer with confidence 0.5.
   */
  detectVoiceActivity(audioBuffer: Buffer): Promise<VoiceActivityResult>;
}
