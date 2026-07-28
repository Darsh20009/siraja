import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { RevisionRules } from '../rules/revision.rules';
import { TajweedRules } from '../rules/tajweed.rules';

export interface DifficultyInput {
  gradeDistribution: Record<EvaluationGrade | 'ungraded', number>;
  totalSessions: number;
  totalMistakes: number;
  averageSmEasinessFactor: number;
  mistakeRatePerAyah: number;
  averageScore: number;
}

export interface DifficultyAnalysis {
  /** 0–100. Higher = more difficulty. */
  difficultyIndex: number;
  level: 'easy' | 'moderate' | 'challenging' | 'difficult';
  averageSmEasinessFactor: number;
  mistakeRatePerAyah: number;
  weakGradeRate: number;
  excellentGradeRate: number;
}

/**
 * DifficultyEngine — pure, dependency-free.
 *
 * Computes a difficulty index (0–100) from grade distribution,
 * SM-2 easiness factors, and mistake rate. Higher index means
 * the student is finding the material harder than average.
 */
export class DifficultyEngine {
  analyse(input: DifficultyInput): DifficultyAnalysis {
    const { gradeDistribution, totalSessions, totalMistakes, averageSmEasinessFactor, mistakeRatePerAyah, averageScore } = input;

    // ── Grade-based difficulty ────────────────────────────────────────────────
    const total = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
    const weakCount = (gradeDistribution[EvaluationGrade.WEAK] ?? 0) +
                      (gradeDistribution[EvaluationGrade.ACCEPTABLE] ?? 0);
    const excellentCount = (gradeDistribution[EvaluationGrade.EXCELLENT] ?? 0) +
                           (gradeDistribution[EvaluationGrade.VERY_GOOD] ?? 0);

    const weakGradeRate = total > 0 ? weakCount / total : 0;
    const excellentGradeRate = total > 0 ? excellentCount / total : 0;

    // Grade difficulty: 0=all excellent, 100=all weak
    const gradeDifficulty = total > 0
      ? clamp(Math.round((1 - (averageScore / 100)) * 100), 0, 100)
      : 50;

    // ── SM-2 difficulty ───────────────────────────────────────────────────────
    // EF range is 1.3–2.5. Low EF = high difficulty. Normalize to 0–100.
    const efRange = 2.5 - 1.3; // 1.2
    const efNormalized = clamp((2.5 - averageSmEasinessFactor) / efRange, 0, 1);
    const efDifficulty = Math.round(efNormalized * 100);

    // ── Mistake difficulty ────────────────────────────────────────────────────
    // Mistake rate of MAX_ACCEPTABLE_MISTAKE_RATE → 50 difficulty
    // Double that rate → 100 difficulty
    const mistakeDifficulty = clamp(
      Math.round((mistakeRatePerAyah / (TajweedRules.MAX_ACCEPTABLE_MISTAKE_RATE * 2)) * 100),
      0,
      100,
    );

    // ── Composite ────────────────────────────────────────────────────────────
    const difficultyIndex = Math.round(
      gradeDifficulty * 0.45 +
      efDifficulty * 0.30 +
      mistakeDifficulty * 0.25,
    );

    const clamped = clamp(difficultyIndex, 0, 100);

    const level: DifficultyAnalysis['level'] =
      clamped < 25 ? 'easy' :
      clamped < 50 ? 'moderate' :
      clamped < 75 ? 'challenging' : 'difficult';

    return {
      difficultyIndex: clamped,
      level,
      averageSmEasinessFactor: parseFloat(averageSmEasinessFactor.toFixed(2)),
      mistakeRatePerAyah,
      weakGradeRate: parseFloat(weakGradeRate.toFixed(3)),
      excellentGradeRate: parseFloat(excellentGradeRate.toFixed(3)),
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
