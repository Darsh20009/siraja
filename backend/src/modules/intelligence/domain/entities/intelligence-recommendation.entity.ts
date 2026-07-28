/**
 * IntelligenceRecommendation — a single personalised recommendation
 * produced by the RecommendationEngine from internal platform data.
 *
 * Every recommendation is actionable, specific to this student, and
 * grounded entirely in deterministic rule evaluation — no LLM involved.
 */
export type RecommendationType =
  | 'memorization'
  | 'revision'
  | 'attendance'
  | 'schedule'
  | 'tajweed'
  | 'motivation';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface IntelligenceRecommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  /** Short, human-readable title. */
  title: string;
  /** Specific, actionable description. */
  description: string;
  /** The rule key that triggered this recommendation — for traceability. */
  triggeredBy: string;
  /** Whether this recommendation has a clear immediate action for the student. */
  actionable: boolean;
  /**
   * Optional quantitative target attached to this recommendation.
   * e.g. { unit: 'ayahs', value: 5, period: 'day' }
   */
  target?: { unit: string; value: number; period?: string };
}
