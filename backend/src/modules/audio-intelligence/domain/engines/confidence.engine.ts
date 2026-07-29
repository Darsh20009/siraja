import type { WordAlignment } from '../entities/word-alignment.entity';
import type { AudioSegment } from '../entities/audio-segment.entity';

export interface ConfidenceResult {
  /** Session-level mean confidence (0–100). */
  sessionConfidence: number;

  /** Map of segmentIndex → mean confidence (0–100) for words in that segment. */
  segmentConfidences: Map<string, number>;

  /**
   * Whether ASR confidence is reliable.
   * False when all words have confidence 0 (null provider active).
   */
  isReliable: boolean;
}

/**
 * ConfidenceEngine — aggregates word-level ASR confidence scores into
 * segment-level and session-level confidence metrics.
 *
 * Used by AudioScoreEngine to produce the asrConfidenceScore breakdown.
 *
 * No NestJS dependencies — instantiated with `new ConfidenceEngine()`.
 */
export class ConfidenceEngine {
  /**
   * Compute session and per-segment confidence from word alignments.
   *
   * @param wordAlignments  All alignments (including deletions with confidence 0).
   * @param segments        Segment descriptors (used for grouping).
   */
  compute(wordAlignments: WordAlignment[], segments: AudioSegment[]): ConfidenceResult {
    if (wordAlignments.length === 0) {
      return {
        sessionConfidence: 0,
        segmentConfidences: new Map(),
        isReliable: false,
      };
    }

    // Group word alignments by segmentId
    const bySegment = new Map<string, WordAlignment[]>();
    for (const wa of wordAlignments) {
      if (!wa.recognisedText) continue; // deletions contribute no confidence signal
      const group = bySegment.get(wa.segmentId) ?? [];
      group.push(wa);
      bySegment.set(wa.segmentId, group);
    }

    const segmentConfidences = new Map<string, number>();
    const allConfidences: number[] = [];

    for (const segment of segments) {
      const words = bySegment.get(segment.id) ?? [];
      if (words.length === 0) {
        segmentConfidences.set(segment.id, 0);
        continue;
      }
      const mean = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
      const score = Math.round(mean * 100);
      segmentConfidences.set(segment.id, score);
      allConfidences.push(mean);
    }

    const sessionConfidence =
      allConfidences.length === 0
        ? 0
        : Math.round(
            (allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length) * 100,
          );

    // If all words have confidence 0, the null provider is active
    const hasAnyNonZero = wordAlignments.some(
      (wa) => wa.recognisedText !== '' && wa.confidence > 0,
    );

    return {
      sessionConfidence,
      segmentConfidences,
      isReliable: hasAnyNonZero,
    };
  }

  /**
   * Compute the mean confidence of a single set of word alignments.
   * Convenience method used by individual pipeline stages.
   */
  mean(wordAlignments: WordAlignment[]): number {
    const recognised = wordAlignments.filter(
      (wa) => wa.recognisedText !== '' && wa.confidence > 0,
    );
    if (recognised.length === 0) return 0;
    return recognised.reduce((sum, wa) => sum + wa.confidence, 0) / recognised.length;
  }

  /**
   * Compute the standard deviation of confidence values.
   * Used by AudioScoreEngine to detect inconsistent ASR output.
   */
  standardDeviation(wordAlignments: WordAlignment[]): number {
    const recognised = wordAlignments.filter(
      (wa) => wa.recognisedText !== '' && wa.confidence > 0,
    );
    if (recognised.length < 2) return 0;
    const mean = recognised.reduce((sum, wa) => sum + wa.confidence, 0) / recognised.length;
    const variance =
      recognised.reduce((sum, wa) => sum + Math.pow(wa.confidence - mean, 2), 0) /
      recognised.length;
    return Math.sqrt(variance);
  }
}
