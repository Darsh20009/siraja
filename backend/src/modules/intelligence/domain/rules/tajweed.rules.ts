import { MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

/**
 * TajweedRules — constants governing mistake severity classification
 * and Tajweed pattern detection within the Intelligence Platform.
 *
 * These rules align with standard Tajweed pedagogy: structural mistakes
 * (skipped ayahs, wrong order) are critical; pronunciation nuances
 * (wrong word, missing word) are serious; repeated words are minor.
 */
export const TajweedRules = Object.freeze({
  /**
   * Mistake types that are considered critical — they represent
   * fundamental recitation errors that must be resolved before
   * the student advances.
   */
  CRITICAL_MISTAKE_TYPES: [
    MistakeType.SKIPPED_AYAH,
    MistakeType.ORDER_MISTAKE,
  ] as MistakeType[],

  /**
   * Mistake types that are serious but not blocking.
   */
  SERIOUS_MISTAKE_TYPES: [
    MistakeType.WRONG_WORD,
    MistakeType.MISSING_WORD,
  ] as MistakeType[],

  /** Severity classification used for Tajweed analytics. */
  CRITICAL_SEVERITY: MistakeSeverity.MAJOR,
  MODERATE_SEVERITY: MistakeSeverity.MODERATE,
  MINOR_SEVERITY: MistakeSeverity.MINOR,

  /**
   * Maximum acceptable mistake rate (mistakes per ayah memorized) before
   * the student triggers a Tajweed-focused recommendation.
   */
  MAX_ACCEPTABLE_MISTAKE_RATE: 0.10,

  /**
   * Number of occurrences of the same mistake type in a single surah
   * that identifies a recurring pattern requiring targeted correction.
   */
  RECURRENCE_THRESHOLD: 3,

  /**
   * Mistake resolution rate (%) below which open-mistake backlog is
   * flagged as a problem.
   */
  MIN_RESOLUTION_RATE: 70,

  /**
   * Number of open critical mistakes above which a high-priority
   * recommendation fires immediately.
   */
  CRITICAL_OPEN_MISTAKES_THRESHOLD: 3,
} as const);
