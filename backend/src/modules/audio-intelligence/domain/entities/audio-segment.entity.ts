import type { WordAlignment } from './word-alignment.entity';

/**
 * AudioSegment — a contiguous time-slice of audio that the Voice Activity
 * Detector identified as speech.
 *
 * The segmentation stage splits the raw audio at silence boundaries
 * (configurable by AudioRules.VAD_SILENCE_GAP_SECONDS). Each segment is
 * independently aligned to a Quran ayah range by the alignment stage.
 *
 * Word alignments are embedded in the segment document because they are
 * always accessed together and a segment carries at most ~20 words.
 */
export interface AudioSegment {
  id: string;

  /** Parent session reference. */
  sessionId: string;

  /** Zero-based position within the session. */
  segmentIndex: number;

  /** Offset from the start of the audio file, in seconds. */
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;

  /**
   * Probability (0–1) that this segment contains speech, as returned by
   * the VAD provider. Values below AudioRules.VAD_CONFIDENCE_THRESHOLD
   * cause the segment to be discarded before alignment.
   */
  voiceActivityConfidence: number;

  /**
   * Quran range this segment was aligned to.
   * Absent if the VAD confidence was too low or alignment failed.
   */
  surahNumber?: number;
  fromAyah?: number;
  toAyah?: number;

  /**
   * RMS energy level in dBFS for the segment window.
   * Used by the ConfidenceEngine to weight word confidence scores.
   */
  energyDbfs: number;

  /**
   * Fundamental frequency estimate (Hz).
   * 0 when pitch extraction was unavailable (null provider).
   */
  pitchHz: number;

  /** Word-level alignments produced by the alignment stage. */
  wordAlignments: WordAlignment[];

  createdAt: Date;
}
