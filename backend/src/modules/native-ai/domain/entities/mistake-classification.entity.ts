import type { TajweedRuleType } from './tajweed-rule-application.entity';

/**
 * MistakeCategory — high-level classification of a recitation or
 * memorization error.
 */
export type MistakeCategory =
  | 'tajweed_violation'   // Incorrect application of a tajweed rule
  | 'word_substitution'   // Wrong word pronounced/written
  | 'word_omission'       // Word skipped entirely
  | 'word_insertion'      // Extra word added
  | 'word_repetition'     // Same word repeated
  | 'ayah_omission'       // Entire ayah skipped
  | 'order_error'         // Words/ayahs out of sequence
  | 'pronunciation'       // Unclear articulation (low confidence)
  | 'elongation_error'    // Madd counts wrong
  | 'nasalization_error'; // Ghunna counts wrong

/**
 * ClassifiedMistake — a single mistake enriched with semantic
 * classification, severity, and remediation guidance.
 */
export interface ClassifiedMistake {
  /** The incorrect text produced. */
  raw: string;
  /** The expected correct text. */
  expected: string;
  category: MistakeCategory;
  /** Fine-grained sub-type within the category. */
  subcategory: string;
  severity: 'critical' | 'major' | 'minor';
  /** Which tajweed rule was violated, if applicable. */
  tajweedRule?: TajweedRuleType;
  /** True if this mistake type appears ≥3 times in the session. */
  isSystematic: boolean;
  /** Classification confidence 0–100. */
  confidenceScore: number;
  /** Actionable guidance for the student. */
  remediation: string;
  /** Related rules that the student should review. */
  relatedRules: string[];
}

/**
 * MistakePattern — aggregate of repeated mistake occurrences, used by
 * the AdaptiveLearningEngine to identify systematic weaknesses.
 */
export interface MistakePattern {
  category: MistakeCategory;
  frequency: number;
  isSystematic: boolean;
  /** Word indices where the mistake occurred. */
  affectedPositions: number[];
  trend: 'improving' | 'stable' | 'worsening';
}
