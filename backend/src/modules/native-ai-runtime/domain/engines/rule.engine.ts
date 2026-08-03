import type { AiRule, RuleEvaluationResult } from '../entities/ai-rule.entity';

/**
 * RuleEngine — evaluates a set of AiRules against a numeric feature map.
 *
 * Responsibilities:
 * - Filter rules whose conditions are satisfied.
 * - Compute a composite score across all fired rules.
 * - Sort results by weight descending.
 *
 * Pure class: no NestJS metadata, no side effects, no I/O.
 */
export class RuleEngine {
  /**
   * Evaluate every rule against the feature map and return the full
   * evaluation result (fired rules, skipped rules, composite score).
   */
  evaluate(
    rules: AiRule[],
    features: Record<string, number>,
  ): RuleEvaluationResult {
    const firedRules: AiRule[] = [];
    const skippedRules: AiRule[] = [];

    for (const rule of rules) {
      if (rule.condition(features)) {
        firedRules.push(rule);
      } else {
        skippedRules.push(rule);
      }
    }

    // Sort fired rules by weight descending
    firedRules.sort((a, b) => b.weight - a.weight);

    const compositeScore = this.computeCompositeScore(firedRules, rules);

    return { firedRules, skippedRules, compositeScore };
  }

  /**
   * Return only the rules whose conditions are satisfied, sorted by weight.
   */
  filterApplicable(
    rules: AiRule[],
    features: Record<string, number>,
  ): AiRule[] {
    return rules
      .filter((r) => r.condition(features))
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Compute a 0–100 composite score representing the weighted proportion of
   * fired rules.
   *
   * Formula: ( sum(fired.weight) / sum(all.weight) ) × 100
   * Returns 0 when the rule set is empty.
   */
  computeCompositeScore(firedRules: AiRule[], allRules: AiRule[]): number {
    if (allRules.length === 0) return 0;
    const totalWeight = allRules.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) return 0;
    const firedWeight = firedRules.reduce((s, r) => s + r.weight, 0);
    return Math.min(100, Math.round((firedWeight / totalWeight) * 100));
  }

  /**
   * Group fired rules by their category and return counts per category.
   */
  groupByCategory(
    rules: AiRule[],
    features: Record<string, number>,
  ): Record<string, number> {
    const fired = this.filterApplicable(rules, features);
    const counts: Record<string, number> = {};
    for (const rule of fired) {
      counts[rule.category] = (counts[rule.category] ?? 0) + 1;
    }
    return counts;
  }
}
