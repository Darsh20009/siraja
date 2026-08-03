import type { AiDecision } from '../entities/ai-decision.entity';
import type { AiRule } from '../entities/ai-rule.entity';
import type {
  AiExplanation,
  FeatureImportance,
  RuleContribution,
} from '../entities/ai-explanation.entity';

/**
 * ExplainabilityEngine — converts raw AI decisions and rule evaluations into
 * human-readable explanations for dashboards and parent reports.
 *
 * Pure class: no NestJS metadata, no side effects, no I/O.
 */
export class ExplainabilityEngine {
  /**
   * Build a full explanation for a decision.
   *
   * @param decision - The AiDecision to explain.
   * @param allRules - All rules that were available during evaluation.
   * @param features - The feature map used during evaluation.
   * @param featureThresholds - Optional map of feature→threshold for contribution text.
   */
  explain(
    decision: AiDecision,
    allRules: AiRule[],
    features: Record<string, number>,
    featureThresholds: Record<string, number> = {},
  ): AiExplanation {
    const firedRules = allRules.filter((r) => decision.rulesFired.includes(r.id));
    const ruleContributions = this.buildContributions(firedRules, features, featureThresholds);
    const featureImportance = this.computeFeatureImportance(firedRules, features);
    const humanReadable = this.generateHumanReadable(decision, ruleContributions);

    return {
      decisionId: decision.decisionId,
      summary: `Decision "${decision.outcome}" reached with ${decision.confidence}% confidence.`,
      ruleContributions,
      featureImportance,
      confidence: decision.confidence,
      humanReadable,
    };
  }

  /**
   * Compute normalised feature importance across the set of fired rules.
   * Each rule contributes its weight to every feature referenced in its description.
   */
  computeFeatureImportance(
    firedRules: AiRule[],
    features: Record<string, number>,
  ): FeatureImportance[] {
    if (firedRules.length === 0) return [];

    const totalWeight = firedRules.reduce((s, r) => s + r.weight, 0);
    const importanceMap = new Map<string, number>();

    // Heuristic: each fired rule contributes its weight to each feature
    // mentioned in its id (e.g. "risk.high_burden" → burdenScore)
    for (const rule of firedRules) {
      const relatedFeature = this.extractFeatureFromRuleId(rule.id);
      if (relatedFeature) {
        importanceMap.set(
          relatedFeature,
          (importanceMap.get(relatedFeature) ?? 0) + rule.weight,
        );
      }
    }

    // Normalise
    const items: FeatureImportance[] = [];
    for (const [featureName, weight] of importanceMap) {
      const currentValue = features[featureName] ?? 0;
      items.push({
        featureName,
        importance: totalWeight > 0 ? weight / totalWeight : 0,
        currentValue,
        direction: currentValue > 50 ? 'positive' : 'negative',
      });
    }

    return items.sort((a, b) => b.importance - a.importance);
  }

  /** Generate a plain-language explanation suitable for parent / guardian display. */
  generateHumanReadable(
    decision: AiDecision,
    contributions: RuleContribution[],
  ): string {
    if (contributions.length === 0) {
      return `The AI evaluated the student's progress and found no concerns (outcome: ${decision.outcome}).`;
    }

    const topThree = contributions.slice(0, 3);
    const lines = topThree.map((c) => `• ${c.explanation}`);
    return (
      `Based on the student's recent activity, the AI reached the following decision: "${decision.outcome}". ` +
      `Key contributing factors:\n${lines.join('\n')}`
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildContributions(
    firedRules: AiRule[],
    features: Record<string, number>,
    featureThresholds: Record<string, number>,
  ): RuleContribution[] {
    const totalWeight = firedRules.reduce((s, r) => s + r.weight, 0);

    return firedRules.map((rule) => {
      const featureName = this.extractFeatureFromRuleId(rule.id) ?? 'unknown';
      const triggerValue = features[featureName] ?? 0;
      const threshold = featureThresholds[featureName] ?? 0;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        contribution: totalWeight > 0 ? rule.weight / totalWeight : 0,
        triggerValue,
        threshold,
        explanation: this.buildExplanationText(rule, triggerValue, threshold),
      };
    });
  }

  private buildExplanationText(
    rule: AiRule,
    triggerValue: number,
    threshold: number,
  ): string {
    if (threshold > 0) {
      const direction = triggerValue > threshold ? 'exceeded' : 'fell below';
      return `${rule.name}: value ${triggerValue.toFixed(1)} ${direction} threshold ${threshold.toFixed(1)}.`;
    }
    return `${rule.name}: ${rule.description}`;
  }

  /** Extract a likely feature name from a rule id using naming convention. */
  private extractFeatureFromRuleId(ruleId: string): string | null {
    // Convention: "risk.high_burden" → "burdenScore"
    const mapping: Record<string, string> = {
      burden: 'burdenScore',
      velocity: 'velocity',
      retention: 'retentionRate',
      tajweed: 'tajweedScore',
      absence: 'daysSinceLastSession',
      inactivity: 'daysSinceLastSession',
      mistake: 'mistakeRate',
      risk: 'riskScore',
      engagement: 'engagementScore',
    };

    const parts = ruleId.toLowerCase().split('.');
    for (const part of parts) {
      for (const [keyword, feature] of Object.entries(mapping)) {
        if (part.includes(keyword)) return feature;
      }
    }
    return null;
  }
}
