import type { AudioSession, AudioFormat, AudioSessionStatus } from '../entities/audio-session.entity';
import type { AudioSegment } from '../entities/audio-segment.entity';
import type { MistakeDetection } from '../entities/mistake-detection.entity';
import type { TajweedObservation } from '../entities/tajweed-observation.entity';
import type { AudioScore } from '../entities/audio-score.entity';
import type { AudioRecommendation } from '../entities/audio-recommendation.entity';

/** DI injection token for IAudioSessionRepository. */
export const AUDIO_SESSION_REPOSITORY = 'AUDIO_SESSION_REPOSITORY';

// ── Create ───────────────────────────────────────────────────────────────────

export interface CreateAudioSessionInput {
  tenantId: string;
  studentId: string;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  fileKey: string;
  format: AudioFormat;
  /** Measured or estimated from file header. */
  durationSeconds: number;
  fileSizeBytes: number;
  sampleRate: number;
  channels: number;
  memorizationRecordId?: string;
}

// ── Save Processing Results ──────────────────────────────────────────────────

export interface SaveProcessingResultsInput {
  status: AudioSessionStatus;
  score?: AudioScore;
  recommendations: AudioRecommendation[];
  segments: AudioSegment[];
  mistakes: MistakeDetection[];
  tajweedObservations: TajweedObservation[];
  processedAt: Date;
}

// ── Filters / Queries ────────────────────────────────────────────────────────

export interface AudioSessionFilter {
  studentId?: string;
  status?: AudioSessionStatus;
  surahNumber?: number;
  /** Earliest createdAt (inclusive). */
  fromDate?: Date;
  /** Latest createdAt (inclusive). */
  toDate?: Date;
}

// ── Repository Interface ─────────────────────────────────────────────────────

export interface IAudioSessionRepository {
  /**
   * Create a new AudioSession record in 'pending' status.
   * Called immediately after the file is stored.
   */
  create(input: CreateAudioSessionInput): Promise<AudioSession>;

  /**
   * Find a session by its MongoDB ObjectId string.
   * Returns null if not found or soft-deleted.
   * Does NOT load segments/mistakes/observations (summary only).
   */
  findById(tenantId: string, sessionId: string): Promise<AudioSession | null>;

  /**
   * Find a session and populate all sub-documents (segments, mistakes,
   * tajweedObservations). Used by ProcessAudioSessionUseCase and
   * GetAudioSessionUseCase when full detail is needed.
   */
  findByIdWithDetails(tenantId: string, sessionId: string): Promise<AudioSession | null>;

  /**
   * List sessions for a student, most recent first.
   * Returns summary-level entities (no sub-documents).
   */
  findByStudent(
    tenantId: string,
    studentId: string,
    filter?: AudioSessionFilter,
    limit?: number,
    skip?: number,
  ): Promise<AudioSession[]>;

  /** Total count of sessions matching the filter (for pagination). */
  countByStudent(tenantId: string, studentId: string, filter?: AudioSessionFilter): Promise<number>;

  /**
   * Sessions created within the past `days` days for a student.
   * Used by intelligence profile and insight use-cases.
   */
  findRecentByStudent(tenantId: string, studentId: string, days: number): Promise<AudioSession[]>;

  /**
   * Transition a session to 'processing' or 'failed' status.
   * errorMessage is required when status = 'failed'.
   */
  updateStatus(
    tenantId: string,
    sessionId: string,
    status: AudioSessionStatus,
    errorMessage?: string,
  ): Promise<void>;

  /**
   * Persist all pipeline results and transition session to 'completed'
   * or 'no_asr'.
   */
  saveProcessingResults(
    tenantId: string,
    sessionId: string,
    results: SaveProcessingResultsInput,
  ): Promise<AudioSession>;

  /**
   * Hard-delete a session and all linked sub-documents.
   * Used only by admin data-purge workflows; prefer soft-delete otherwise.
   */
  delete(tenantId: string, sessionId: string): Promise<void>;
}
