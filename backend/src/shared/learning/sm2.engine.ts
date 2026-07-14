import { EvaluationGrade } from '@shared/enums/memorization.enum';

/**
 * SM-2 Revision Engine — pure, deterministic, dependency-free.
 *
 * Implements the SuperMemo SM-2 algorithm with the Anki quality-grade
 * mapping. Called from AyahPerformanceRepository after each memorization,
 * revision, or mistake event.
 *
 * References:
 *   - Original SM-2: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *   - Anki variant: grade mapping extended to EvaluationGrade enum
 *
 * Key invariants:
 *   - EF (easiness factor) is clamped to [EF_MIN=1.3, EF_MAX=2.5].
 *   - Grade 0-1 (WEAK/mistake) resets repetitions and sets interval to 1.
 *   - Grade 2 (ACCEPTABLE) keeps repetitions, sets interval to max(1, floor(interval * 1.2)).
 *   - Grade 3-5 advances the standard SM-2 interval schedule.
 *   - nextReviewDue is always set to today + interval days (UTC midnight).
 */

export interface Sm2State {
  smEasinessFactor: number;   // default 2.5, range [1.3, 2.5]
  smInterval: number;         // days until next review (0 = not yet scheduled)
  smRepetitions: number;      // consecutive successful reviews without failure
  smNextReviewDue: Date | null;
}

const EF_DEFAULT = 2.5;
const EF_MIN = 1.3;
const EF_MAX = 2.5;

/** Maps EvaluationGrade to SM-2 quality score q ∈ [0,5]. */
function gradeToQuality(grade: EvaluationGrade | undefined): number {
  switch (grade) {
    case EvaluationGrade.EXCELLENT:  return 5;
    case EvaluationGrade.VERY_GOOD:  return 4;
    case EvaluationGrade.GOOD:       return 3;
    case EvaluationGrade.ACCEPTABLE: return 2;
    case EvaluationGrade.WEAK:       return 1;
    default:                         return 3; // treat ungraded as GOOD
  }
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + Math.max(1, Math.round(days)));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export class Sm2Engine {
  /** Returns the default SM-2 state for a fresh (never memorized) ayah. */
  initialState(): Sm2State {
    return {
      smEasinessFactor: EF_DEFAULT,
      smInterval: 0,
      smRepetitions: 0,
      smNextReviewDue: null,
    };
  }

  /**
   * Called after a successful memorization or review session.
   * Advances SM-2 schedule based on the quality grade.
   */
  onSuccess(current: Sm2State, grade: EvaluationGrade | undefined): Sm2State {
    const q = gradeToQuality(grade);
    const now = new Date();

    // Grade < 2 is treated as a mistake (quality too low to advance)
    if (q < 2) return this.onMistake(current);

    // Update EF only for passing grades (q >= 3)
    let ef = current.smEasinessFactor;
    if (q >= 3) {
      ef = ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      ef = Math.max(EF_MIN, Math.min(EF_MAX, ef));
    }

    // Grade 2 (ACCEPTABLE): partial credit — keep repetitions, inflate interval slightly
    if (q === 2) {
      const interval = Math.max(1, Math.floor(current.smInterval * 1.2));
      return {
        smEasinessFactor: ef,
        smInterval: interval,
        smRepetitions: current.smRepetitions, // unchanged
        smNextReviewDue: addDays(now, interval),
      };
    }

    // Grade >= 3: standard SM-2 interval progression
    let interval: number;
    if (current.smRepetitions === 0) {
      interval = 1;
    } else if (current.smRepetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(current.smInterval * ef);
    }

    return {
      smEasinessFactor: ef,
      smInterval: interval,
      smRepetitions: current.smRepetitions + 1,
      smNextReviewDue: addDays(now, interval),
    };
  }

  /**
   * Called when a mistake is recorded for this ayah.
   * Resets repetitions and interval without penalising EF (mistakes are
   * expected; a single mistake should not permanently lower EF).
   */
  onMistake(current: Sm2State): Sm2State {
    const now = new Date();
    return {
      smEasinessFactor: current.smEasinessFactor, // EF unchanged on mistake
      smInterval: 1,
      smRepetitions: 0,
      smNextReviewDue: addDays(now, 1),
    };
  }
}
