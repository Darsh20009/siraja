import type { AudioFormat } from '../../domain/entities/audio-session.entity';
import type { AudioSegment } from '../../domain/entities/audio-segment.entity';
import type { WordAlignment } from '../../domain/entities/word-alignment.entity';
import type { MistakeDetection } from '../../domain/entities/mistake-detection.entity';
import type { TajweedObservation } from '../../domain/entities/tajweed-observation.entity';
import type { AudioScore } from '../../domain/entities/audio-score.entity';
import type { AudioRecommendation } from '../../domain/entities/audio-recommendation.entity';
import type { VoiceSegment } from '../../infrastructure/providers/interfaces/audio-preprocessor.provider.interface';
import type { SegmentFeatures } from '../../infrastructure/providers/interfaces/audio-feature-extractor.provider.interface';
import type { AyahWordData } from '../../domain/engines/audio-alignment.engine';

/**
 * AudioPipelineContext — the mutable state object passed through every
 * pipeline stage.
 *
 * Each stage reads the fields set by previous stages and writes its own
 * output fields. The ProcessAudioSessionUseCase initialises the context
 * and reads the final state after the pipeline completes.
 *
 * Immutable input fields (set by the use-case before the pipeline runs)
 * are marked with a comment. Mutable fields start as undefined and are
 * populated by the appropriate stage.
 */
export class AudioPipelineContext {
  // ── Immutable inputs (set before pipeline start) ───────────────────────────

  /** Session being processed. */
  readonly sessionId: string;

  readonly tenantId: string;
  readonly studentId: string;

  /** Raw audio bytes from storage. */
  readonly audioBuffer: Buffer;

  readonly surahNumber: number;
  readonly fromAyah: number;
  readonly toAyah: number;
  readonly format: AudioFormat;
  readonly fileSizeBytes: number;

  /**
   * Expected Quran words for the recited range, fetched from the Ayah
   * collection by the use-case before the pipeline starts. The alignment
   * stage uses this to map recognised words to Quran positions.
   */
  readonly expectedWords: AyahWordData[];

  // ── Stage: AudioValidation ─────────────────────────────────────────────────
  /** Measured or estimated duration from the audio header (seconds). */
  durationSeconds = 0;
  sampleRate = 0;
  channels = 0;

  // ── Stage: NoiseReduction ─────────────────────────────────────────────────
  /** Audio buffer after preprocessing (may equal audioBuffer if null provider). */
  preprocessedBuffer: Buffer;
  noiseFloorDbfs = 0;

  // ── Stage: VoiceActivityDetection ────────────────────────────────────────
  vadSegments: VoiceSegment[] = [];
  speechRatio = 1;
  totalSpeechSeconds = 0;

  // ── Stage: AudioSegmentation ──────────────────────────────────────────────
  /**
   * Logical segments after splitting at silence gaps.
   * These are domain AudioSegment entities (without persisted IDs yet —
   * id is set to a temp string until the repository assigns MongoDB IDs).
   */
  segments: AudioSegment[] = [];

  // ── Stage: FeatureExtraction ─────────────────────────────────────────────
  /** Map of segmentIndex → SegmentFeatures. */
  segmentFeatures: Map<number, SegmentFeatures> = new Map();

  // ── Stage: QuranAlignment ────────────────────────────────────────────────
  wordAlignments: WordAlignment[] = [];
  totalExpectedWords = 0;
  correctWords = 0;
  deletedWords = 0;
  insertedWords = 0;
  /** True when the null ASR provider was used for this session. */
  usedNullAsrProvider = false;

  // ── Stage: MistakeDetection ───────────────────────────────────────────────
  mistakes: MistakeDetection[] = [];
  tajweedObservations: TajweedObservation[] = [];

  // ── Stage: Scoring ────────────────────────────────────────────────────────
  score: AudioScore | undefined;

  // ── Stage: Recommendation ─────────────────────────────────────────────────
  recommendations: AudioRecommendation[] = [];

  constructor(init: {
    sessionId: string;
    tenantId: string;
    studentId: string;
    audioBuffer: Buffer;
    surahNumber: number;
    fromAyah: number;
    toAyah: number;
    format: AudioFormat;
    fileSizeBytes: number;
    expectedWords: AyahWordData[];
  }) {
    this.sessionId = init.sessionId;
    this.tenantId = init.tenantId;
    this.studentId = init.studentId;
    this.audioBuffer = init.audioBuffer;
    this.surahNumber = init.surahNumber;
    this.fromAyah = init.fromAyah;
    this.toAyah = init.toAyah;
    this.format = init.format;
    this.fileSizeBytes = init.fileSizeBytes;
    this.expectedWords = init.expectedWords;
    this.preprocessedBuffer = init.audioBuffer;
  }
}
