/**
 * AudioFeatures — frame-level acoustic features for an entire audio buffer.
 *
 * Frame rate and feature dimensionality are provider-specific. Consumers
 * should treat the arrays as ordered sequences without assuming any
 * particular frame length.
 */
export interface AudioFeatures {
  /**
   * Mel-frequency cepstral coefficients.
   * Outer dimension: frames. Inner dimension: MFCC coefficients (typically 13–40).
   */
  mfcc: number[][];

  /** Fundamental frequency estimate per frame in Hz. 0 for unvoiced frames. */
  pitchHz: number[];

  /** RMS energy per frame in dBFS (negative values). */
  energyDbfs: number[];

  /** Zero-crossing rate per frame (dimensionless, 0–1). */
  zeroCrossingRate: number[];

  /** Frame analysis rate in Hz (e.g. 100 → one frame every 10 ms). */
  frameRateHz: number;

  /** Duration of the analysed audio in seconds. */
  durationSeconds: number;

  /** Provider that produced this result. */
  providerName: string;

  /** True when the null provider produced this result. */
  isNullProvider: boolean;
}

/**
 * SegmentFeatures — aggregated features for a single audio segment.
 *
 * Computed by the feature extractor over the segment time window.
 * Used by the TajweedAnalysisEngine to estimate madd durations and
 * by the AudioScoreEngine to produce the fluency breakdown.
 */
export interface SegmentFeatures {
  /** Zero-based index of this segment within the session. */
  segmentIndex: number;

  startSeconds: number;
  endSeconds: number;

  /** Mean fundamental frequency (Hz) over voiced frames. 0 for silence. */
  meanPitchHz: number;

  /** Mean RMS energy (dBFS) over the segment. */
  meanEnergyDbfs: number;

  /**
   * Variance of pitch across voiced frames.
   * High variance → pitch instability / melodic deviation.
   */
  pitchVariance: number;

  /** Mean MFCC vector (averaged across frames). Length = MFCC coefficients. */
  mfccMeans: number[];

  /** Ratio of voiced frames to total frames (0–1). */
  voicedRatio: number;

  /** Provider that produced this result. */
  providerName: string;
}

/** DI injection token for IAudioFeatureExtractor. */
export const AUDIO_FEATURE_EXTRACTOR = 'AUDIO_FEATURE_EXTRACTOR';

/**
 * IAudioFeatureExtractor — provider interface for acoustic feature
 * extraction.
 *
 * Concrete implementations will use libraries such as librosa (Python
 * bridge), ONNX pitch trackers, or native WebRTC feature extractors.
 * The null implementation returns zeroed-out feature arrays so the
 * pipeline completes without native dependencies.
 *
 * Design rule: all processing MUST run in-process or via a local socket.
 * No remote HTTP calls permitted.
 */
export interface IAudioFeatureExtractor {
  /** Human-readable name for this implementation. */
  readonly providerName: string;

  /** Whether this provider is currently available. */
  readonly isAvailable: boolean;

  /**
   * Extract frame-level features from an entire audio buffer.
   * Used by the FeatureExtraction pipeline stage.
   */
  extractFeatures(audioBuffer: Buffer): Promise<AudioFeatures>;

  /**
   * Extract aggregated features for a specific time window within the buffer.
   * Used for per-segment analysis by the TajweedAnalysisEngine.
   *
   * @param audioBuffer   Full audio buffer (provider slices the window internally).
   * @param startSeconds  Window start (seconds from buffer start).
   * @param endSeconds    Window end (seconds from buffer start).
   * @param segmentIndex  Zero-based segment index (carried through to output).
   */
  extractSegmentFeatures(
    audioBuffer: Buffer,
    startSeconds: number,
    endSeconds: number,
    segmentIndex: number,
  ): Promise<SegmentFeatures>;
}
