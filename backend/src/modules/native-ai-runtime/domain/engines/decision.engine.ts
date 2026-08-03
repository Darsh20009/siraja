import type { DecisionNode, AiDecision, AiDecisionType } from '../entities/ai-decision.entity';

/**
 * DecisionEngine — evaluates a binary decision tree against a feature map
 * to produce a typed AiDecision.
 *
 * Pure class: no NestJS metadata, no side effects, no I/O.
 */
export class DecisionEngine {
  /**
   * Walk the decision tree starting at the root node and return the first
   * leaf node's outcome, together with accumulated metadata.
   *
   * @param nodes - Full node list; root is nodes[0].
   * @param features - Numeric feature map to evaluate predicates against.
   * @param type - Decision type tag attached to the result.
   */
  evaluate(
    nodes: DecisionNode[],
    features: Record<string, number>,
    type: AiDecisionType = 'no_action',
  ): AiDecision {
    if (nodes.length === 0) {
      return this.makeDecision('no_action', type, 0, [], []);
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const rulesFired: string[] = [];
    let current: DecisionNode = nodes[0];

    // Walk the tree (max depth = node count to guard against cycles)
    for (let depth = 0; depth < nodes.length; depth++) {
      const conditionResult = current.condition(features);
      rulesFired.push(current.id);

      if (conditionResult && current.trueNodeId) {
        const next = nodeMap.get(current.trueNodeId);
        if (!next) break;
        current = next;
        continue;
      }

      if (!conditionResult && current.falseNodeId) {
        const next = nodeMap.get(current.falseNodeId);
        if (!next) break;
        current = next;
        continue;
      }

      // Leaf node reached
      break;
    }

    const outcome = current.outcome ?? 'no_action';
    const confidence = this.computeConfidenceFromFiredNodes(
      rulesFired.map((id) => nodeMap.get(id)!).filter(Boolean),
      features,
    );

    return this.makeDecision(outcome, type, confidence, rulesFired, [outcome]);
  }

  /**
   * Evaluate every rule independently (non-tree mode) and return all
   * decisions where the condition returned true, sorted by weight desc.
   */
  evaluateAll(
    nodes: DecisionNode[],
    features: Record<string, number>,
    type: AiDecisionType = 'no_action',
  ): AiDecision[] {
    return nodes
      .filter((n) => n.condition(features) && n.outcome)
      .sort((a, b) => b.weight - a.weight)
      .map((n) => this.makeDecision(n.outcome!, type, n.weight * 100, [n.id], [n.outcome!]));
  }

  /**
   * Compute a 0–100 confidence score from the weighted mean of fired nodes.
   */
  computeConfidenceFromFiredNodes(
    firedNodes: DecisionNode[],
    _features: Record<string, number>,
  ): number {
    if (firedNodes.length === 0) return 0;
    const totalWeight = firedNodes.reduce((sum, n) => sum + n.weight, 0);
    const maxWeight = Math.max(...firedNodes.map((n) => n.weight), 1);
    // Normalise: mean(weights) / max(weight) × 100
    const meanWeight = totalWeight / firedNodes.length;
    return Math.min(100, Math.round((meanWeight / maxWeight) * 100));
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private makeDecision(
    outcome: string,
    type: AiDecisionType,
    confidence: number,
    rulesFired: string[],
    evidence: string[],
  ): AiDecision {
    return {
      decisionId: `decision_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      outcome,
      confidence,
      evidence,
      rulesFired,
      timestamp: new Date(),
      metadata: {},
    };
  }
}
