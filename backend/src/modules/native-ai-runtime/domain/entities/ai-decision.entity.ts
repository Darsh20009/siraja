/**
 * AiDecision — the output of the DecisionEngine for a single evaluation pass.
 */
export type AiDecisionType =
  | 'learning_plan_adjustment'
  | 'risk_flag'
  | 'milestone_unlock'
  | 'pace_change'
  | 'intervention_required'
  | 'no_action';

export interface DecisionNode {
  /** Unique identifier within the decision tree. */
  id: string;
  /**
   * Pure predicate evaluated against a feature map.
   * Must be deterministic — no side effects.
   */
  condition: (features: Record<string, number>) => boolean;
  /** Node id to follow when condition is true. Undefined at leaf nodes. */
  trueNodeId?: string;
  /** Node id to follow when condition is false. Undefined at leaf nodes. */
  falseNodeId?: string;
  /** Populated only on leaf nodes — the outcome string emitted. */
  outcome?: string;
  /** Relative importance weight used when computing aggregate confidence. */
  weight: number;
}

export interface AiDecision {
  readonly decisionId: string;
  readonly type: AiDecisionType;
  /** Human-readable outcome key (e.g. "reduce_pace", "flag_for_review"). */
  readonly outcome: string;
  /** 0–100 engine confidence in this decision. */
  readonly confidence: number;
  /** Signal names / rule ids that contributed to this decision. */
  readonly evidence: string[];
  /** Ordered list of rule ids that fired during evaluation. */
  readonly rulesFired: string[];
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}
