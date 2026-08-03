/**
 * AiRule — a single business rule evaluated by the RuleEngine.
 *
 * Rules are pure value objects: they carry no mutable state and their
 * condition is a deterministic predicate over a numeric feature map.
 */
export type RuleCategory =
  | 'risk'
  | 'progress'
  | 'tajweed'
  | 'engagement'
  | 'schedule'
  | 'milestone';

export interface AiRule {
  /** Unique rule identifier, e.g. "risk.high_burden". */
  readonly id: string;
  readonly name: string;
  readonly category: RuleCategory;
  /**
   * Deterministic predicate.  Receives the full feature map and returns
   * true when the rule's condition is satisfied.
   */
  readonly condition: (features: Record<string, number>) => boolean;
  /**
   * Relative weight (0–1) used when rolling up a composite score across
   * all fired rules.  Higher weight → rule has more influence on the
   * aggregate outcome.
   */
  readonly weight: number;
  /** One-sentence description of when this rule fires. */
  readonly description: string;
  /**
   * Action to take when this rule fires.
   * Consumed by callers (e.g. RecommendationPipeline) to map a rule to
   * a concrete action or recommendation type.
   */
  readonly action: string;
}

export interface RuleEvaluationResult {
  /** Rules whose condition returned true. */
  readonly firedRules: AiRule[];
  /** Rules whose condition returned false. */
  readonly skippedRules: AiRule[];
  /**
   * Weighted aggregate score across all fired rules (0–100).
   * Computed as: sum(firedWeight) / sum(totalWeight) × 100.
   */
  readonly compositeScore: number;
}
