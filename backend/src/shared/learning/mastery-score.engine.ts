import { EvaluationGrade } from '@shared/enums/memorization.enum';

/**
 * MasteryScoreEngine — pure, deterministic, dependency-free.
 *
 * Computes a 0–100 composite mastery score for a single (student, ayah)
 * pair. Called from AyahPerformanceRepository after each memorization,
 * revision, or mistake event. The result replaces the previous
 * `confidenceScore` logic (simple ±10 nudging) with a weighted multi-
 * factor model that accounts for recency decay.
 *
 * Weights (must sum to 1.0):
 *   base_score    40% — grade-derived starting point
 *   recency       30% — exponential time decay since last activity
 *   mistake_pen   20% — cumulative mistake penalty
 *   revision_bon  10% — bonus for repeated successful revisions
 *
 * TAU = 30 days → half-life ≈ 21 days (100 * e^(-ln2 / 0.693...) * 21/30)
 * In practice: 30 days without review → ~37/100 recency contribution.
 */

const W_BASE = 0.40;
const W_RECENCY = 0.30;
const W_MISTAKES = 0.20;
const W_REVISION = 0.10;
const TAU_DAYS = 30; // exponential decay time constant

export interface MasteryInput {
  grade?: EvaluationGrade;
  lastActivityAt: Date | null; // max(lastMemorizedAt, lastRevisedAt)
  mistakeCount: number;
  revisionCount: number;
}

export class MasteryScoreEngine {
  /**
   * Compute and return a clamped 0–100 mastery score.
   */
  compute(input: MasteryInput): number {
    const base = this.baseScore(input.grade) * W_BASE;
    const recency = this.recencyFactor(input.lastActivityAt) * W_RECENCY;
    const mistakes = this.mistakeFactor(input.mistakeCount) * W_MISTAKES;
    const revision = this.revisionFactor(input.revisionCount) * W_REVISION;

    return clamp(Math.round(base + recency + mistakes + revision), 0, 100);
  }

  /**
   * Apply a one-time mistake penalty to an existing score.
   * Used inside `recordMistake` where the grade is unknown — we penalise
   * the current score directly rather than recomputing from scratch, to
   * avoid erasing accumulated recency / revision bonuses.
   */
  applyMistakePenalty(currentScore: number, newMistakeCount: number): number {
    // Recompute only the mistake factor with the incremented count
    const mistakePenalty = this.mistakeFactor(newMistakeCount) * W_MISTAKES;
    // Replace the old mistake contribution (unknown) with the new one.
    // Subtract the worst-case old penalty and add the new one, then clamp.
    // Simpler and safe: subtract a flat 10 points (matches Phase 9 original behaviour).
    return clamp(currentScore - 10, 0, 100);
  }

  // ── Private factors ─────────────────────────────────────────────────────

  baseScore(grade: EvaluationGrade | undefined): number {
    switch (grade) {
      case EvaluationGrade.EXCELLENT:  return 95;
      case EvaluationGrade.VERY_GOOD:  return 85;
      case EvaluationGrade.GOOD:       return 70;
      case EvaluationGrade.ACCEPTABLE: return 55;
      case EvaluationGrade.WEAK:       return 30;
      default:                         return 60; // memorized without grade
    }
  }

  recencyFactor(lastActivityAt: Date | null): number {
    if (!lastActivityAt) return 0;
    const daysSince = (Date.now() - lastActivityAt.getTime()) / 86_400_000;
    return clamp(100 * Math.exp(-daysSince / TAU_DAYS), 0, 100);
  }

  mistakeFactor(mistakeCount: number): number {
    const penalty = Math.min(mistakeCount * 8, 80);
    return 100 - penalty; // range: 20–100
  }

  revisionFactor(revisionCount: number): number {
    const bonus = Math.min(revisionCount * 5, 50);
    return 50 + bonus; // range: 50–100
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
