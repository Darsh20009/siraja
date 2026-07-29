import { AudioRules } from '../rules/audio-rules';
import type { AudioScore, AudioScoreTier } from '../entities/audio-score.entity';
import type { MistakeDetection } from '../entities/mistake-detection.entity';
import type { TajweedObservation } from '../entities/tajweed-observation.entity';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type { AudioSegment } from '../entities/audio-segment.entity';

export interface ScoreInput {
  sessionId: string;
  wordAlignments: WordAlignment[];
  segments: AudioSegment[];
  mistakes: MistakeDetection[];
  tajweedObservations: TajweedObservation[];
  /** Total expected words from the Quran corpus (from AlignmentEngine output). */
  totalExpectedWords: number;
  correctWords: number;
  deletedWords: number;
  insertedWords: number;
  /** Total speech duration in seconds (sum of VAD-detected segments). */
  speechDurationSeconds: number;
  /** Session-level ASR confidence (0–100) from ConfidenceEngine. */
  asrConfidenceScore: number;
}

/**
 * AudioScoreEngine — produces the composite AudioScore from all pipeline
 * analysis results.
 *
 * Formula:
 *   compositeScore = accuracy×0.35 + tajweed×0.30 + fluency×0.20 + consistency×0.15
 *
 * All sub-scores are computed deterministically from the structured analysis
 * data — no LLM or external service involved.
 *
 * No NestJS dependencies — instantiated with `new AudioScoreEngine()`.
 */
export class AudioScoreEngine {
  /**
   * Compute the full AudioScore for a session.
   */
  score(input: ScoreInput): AudioScore {
    const accuracyScore = this.computeAccuracy(input);
    const tajweedScore = this.computeTajweed(input.tajweedObservations);
    const fluencyScore = this.computeFluency(input);
    const consistencyScore = this.computeConsistency(input);

    const compositeScore = Math.round(
      accuracyScore * AudioRules.W_ACCURACY +
        tajweedScore * AudioRules.W_TAJWEED +
        fluencyScore * AudioRules.W_FLUENCY +
        consistencyScore * AudioRules.W_CONSISTENCY,
    );

    const criticalMistakes = input.mistakes.filter((m) => m.severity === 'critical').length;
    const majorMistakes = input.mistakes.filter((m) => m.severity === 'major').length;
    const minorMistakes = input.mistakes.filter((m) => m.severity === 'minor').length;

    const wordsPerMinute = this.computeWpm(input);

    return {
      sessionId: input.sessionId,
      compositeScore,
      breakdown: {
        accuracyScore,
        fluencyScore,
        tajweedScore,
        consistencyScore,
        asrConfidenceScore: input.asrConfidenceScore,
      },
      totalExpectedWords: input.totalExpectedWords,
      correctWords: input.correctWords,
      insertedWords: input.insertedWords,
      deletedWords: input.deletedWords,
      totalMistakes: input.mistakes.length,
      criticalMistakes,
      majorMistakes,
      minorMistakes,
      wordsPerMinute,
      speechDurationSeconds: input.speechDurationSeconds,
      tier: this.tier(compositeScore),
    };
  }

  /** Determine the performance tier from a composite score. */
  tier(compositeScore: number): AudioScoreTier {
    if (compositeScore >= AudioRules.TIER_EXCELLENT) return 'excellent';
    if (compositeScore >= AudioRules.TIER_GOOD) return 'good';
    if (compositeScore >= AudioRules.TIER_SATISFACTORY) return 'satisfactory';
    return 'needs_improvement';
  }

  // ── Sub-score computations ─────────────────────────────────────────────────

  private computeAccuracy(input: ScoreInput): number {
    if (input.totalExpectedWords === 0) return 0;
    return Math.round(
      Math.min(100, (input.correctWords / input.totalExpectedWords) * 100),
    );
  }

  private computeTajweed(observations: TajweedObservation[]): number {
    const detectable = observations.filter((o) => o.outcome !== 'undetectable');
    if (detectable.length === 0) return 0;
    const correct = detectable.filter((o) => o.outcome === 'correct').length;
    return Math.round((correct / detectable.length) * 100);
  }

  private computeFluency(input: ScoreInput): number {
    // Base score from WPM
    const wpm = this.computeWpm(input);
    let score = 100;

    if (wpm > 0) {
      if (wpm < AudioRules.WPM_IDEAL_MIN) {
        // Too slow — linear penalty
        const deficit = AudioRules.WPM_IDEAL_MIN - wpm;
        score -= Math.min(50, deficit * 0.5);
      } else if (wpm > AudioRules.WPM_IDEAL_MAX) {
        // Too fast
        const excess = wpm - AudioRules.WPM_IDEAL_MAX;
        score -= Math.min(30, excess * 0.3);
      }
    } else {
      score = 0; // No speech detected
    }

    // Penalty for repeated words
    const repeatedWords = input.mistakes.filter((m) => m.type === 'repeated_word').length;
    score -= repeatedWords * AudioRules.FLUENCY_REPEAT_PENALTY;

    // Penalty for unexpected silence (pauses mid-ayah = waqf_kafi observations)
    const badWaqf = input.tajweedObservations.filter(
      (o) => o.rule === 'waqf_kafi' && o.outcome === 'incorrect',
    ).length;
    score -= badWaqf * AudioRules.FLUENCY_PAUSE_PENALTY_PER_SECOND;

    return Math.max(0, Math.round(Math.min(100, score)));
  }

  private computeConsistency(input: ScoreInput): number {
    if (input.segments.length < 2) return 100;

    // Compute per-segment accuracy
    const segmentAccuracies: number[] = [];

    for (const segment of input.segments) {
      const segWords = input.wordAlignments.filter(
        (wa) => wa.segmentId === segment.id,
      );
      const expectedInSeg = segWords.filter((wa) => wa.expectedText !== undefined).length;
      if (expectedInSeg === 0) continue;
      const correctInSeg = segWords.filter((wa) => wa.isMatch).length;
      segmentAccuracies.push(correctInSeg / expectedInSeg);
    }

    if (segmentAccuracies.length < 2) return 100;

    const mean =
      segmentAccuracies.reduce((sum, a) => sum + a, 0) / segmentAccuracies.length;
    const variance =
      segmentAccuracies.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
      segmentAccuracies.length;
    const stdDev = Math.sqrt(variance);

    // Score degrades with standard deviation; stdDev of 0 = 100, stdDev of 0.5 = 0
    return Math.max(0, Math.round(100 - stdDev * 200));
  }

  private computeWpm(input: ScoreInput): number {
    if (input.speechDurationSeconds < 1) return 0;
    const minutes = input.speechDurationSeconds / 60;
    // Use total aligned words (correct + wrong, but not pure deletions)
    const alignedWords = input.wordAlignments.filter(
      (wa) => wa.recognisedText !== '',
    ).length;
    return Math.round(alignedWords / minutes);
  }
}
