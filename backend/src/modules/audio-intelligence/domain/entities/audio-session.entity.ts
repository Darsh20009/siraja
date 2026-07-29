import type { AudioSegment } from './audio-segment.entity';
import type { MistakeDetection } from './mistake-detection.entity';
import type { TajweedObservation } from './tajweed-observation.entity';
import type { AudioScore } from './audio-score.entity';
import type { AudioRecommendation } from './audio-recommendation.entity';

/**
 * Supported audio formats for Quran recitation upload.
 * Formats are listed in order of pipeline preference (WAV → MP3 → …).
 * WAV is preferred because it is lossless and header-parseable without
 * an external library; compressed formats rely on duration estimates.
 */
export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm' | 'm4a' | 'flac';

/**
 * Lifecycle status of an AudioSession document.
 *
 *   pending        → uploaded, not yet processed
 *   processing     → pipeline is executing
 *   completed      → pipeline finished; score and results are populated
 *   failed         → pipeline aborted; errorMessage is set
 *   no_asr         → pipeline ran but no SpeechRecognitionProvider was
 *                    available; structural metadata is saved but word-level
 *                    analysis is absent
 */
export type AudioSessionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'no_asr';

/**
 * AudioSession — the top-level aggregate for one student recitation.
 *
 * Represents a single audio upload tied to a student, a Quran range, and
 * (optionally) an active memorization record. All downstream analysis
 * results — segments, mistakes, observations, score — are linked through
 * this entity's id.
 *
 * Domain entity: plain TypeScript interface. No Mongoose decorators.
 * Persistence is delegated to AudioSessionRepository.
 */
export interface AudioSession {
  id: string;
  tenantId: string;
  studentId: string;

  /** Optional link to the MemorizationRecord this audio belongs to. */
  memorizationRecordId?: string;

  /** Quran range recited in this session. */
  surahNumber: number;
  fromAyah: number;
  toAyah: number;

  /** Object-storage key for the raw audio file. */
  fileKey: string;

  format: AudioFormat;

  /** Measured or estimated duration in seconds. */
  durationSeconds: number;

  fileSizeBytes: number;

  /** Nominal sample rate in Hz (0 if unknown). */
  sampleRate: number;

  /** Number of audio channels (1 = mono, 2 = stereo). */
  channels: number;

  status: AudioSessionStatus;

  /** Populated only when status === 'failed'. */
  errorMessage?: string;

  /**
   * Composite score — present only when status === 'completed'.
   * Embedded in the session document (one-to-one).
   */
  score?: AudioScore;

  /**
   * Actionable recommendations generated from the analysis.
   * Populated when status === 'completed'.
   */
  recommendations: AudioRecommendation[];

  /**
   * Summary counts — populated after processing to allow efficient
   * querying without loading full sub-collections.
   */
  totalSegments: number;
  totalMistakes: number;
  criticalMistakes: number;
  tajweedObservationCount: number;

  /**
   * Populated lazily by the repository when full detail is requested.
   * Not always present on the summary-level entity.
   */
  segments?: AudioSegment[];
  mistakes?: MistakeDetection[];
  tajweedObservations?: TajweedObservation[];

  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
