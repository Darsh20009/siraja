import { DecisionEngine } from './decision.engine';
import type { DecisionNode, AiDecisionType } from '../entities/ai-decision.entity';

describe('DecisionEngine', () => {
  let engine: DecisionEngine;

  beforeEach(() => {
    engine = new DecisionEngine();
  });

  // ── evaluate ──────────────────────────────────────────────────────────────

  describe('evaluate', () => {
    it('returns "no_action" for an empty node list', () => {
      const result = engine.evaluate([], {}, 'no_action');
      expect(result.outcome).toBe('no_action');
      expect(result.confidence).toBe(0);
    });

    it('walks to the true branch when root condition is true', () => {
      const nodes: DecisionNode[] = [
        { id: 'root', condition: (f) => f['score'] > 50, trueNodeId: 'high', weight: 1.0 },
        { id: 'high', condition: () => true, outcome: 'high_risk', weight: 0.9 },
      ];
      const result = engine.evaluate(nodes, { score: 80 }, 'risk_flag');
      expect(result.outcome).toBe('high_risk');
    });

    it('walks to the false branch when root condition is false', () => {
      const nodes: DecisionNode[] = [
        {
          id: 'root',
          condition: (f) => f['score'] > 50,
          trueNodeId: 'high',
          falseNodeId: 'low',
          weight: 1.0,
        },
        { id: 'high', condition: () => true, outcome: 'high_risk', weight: 0.9 },
        { id: 'low', condition: () => true, outcome: 'low_risk', weight: 0.3 },
      ];
      const result = engine.evaluate(nodes, { score: 20 }, 'risk_flag');
      expect(result.outcome).toBe('low_risk');
    });

    it('stops at a leaf node when there is no next node id', () => {
      const nodes: DecisionNode[] = [
        { id: 'leaf', condition: () => true, outcome: 'done', weight: 0.5 },
      ];
      const result = engine.evaluate(nodes, {}, 'no_action');
      expect(result.outcome).toBe('done');
    });

    it('records the root node id in rulesFired', () => {
      const nodes: DecisionNode[] = [
        { id: 'root', condition: () => true, outcome: 'acted', weight: 1.0 },
      ];
      const result = engine.evaluate(nodes, {}, 'no_action');
      expect(result.rulesFired).toContain('root');
    });

    it('attaches the supplied type to the decision', () => {
      const type: AiDecisionType = 'pace_change';
      const nodes: DecisionNode[] = [
        { id: 'n', condition: () => true, outcome: 'reduce', weight: 1.0 },
      ];
      const result = engine.evaluate(nodes, {}, type);
      expect(result.type).toBe(type);
    });

    it('returns a unique decisionId each call', () => {
      const nodes: DecisionNode[] = [
        { id: 'n', condition: () => true, outcome: 'x', weight: 1.0 },
      ];
      const a = engine.evaluate(nodes, {}, 'no_action');
      const b = engine.evaluate(nodes, {}, 'no_action');
      expect(a.decisionId).not.toBe(b.decisionId);
    });
  });

  // ── evaluateAll ───────────────────────────────────────────────────────────

  describe('evaluateAll', () => {
    it('returns only nodes whose conditions are true and have outcomes', () => {
      const nodes: DecisionNode[] = [
        { id: 'a', condition: () => true, outcome: 'act_a', weight: 0.8 },
        { id: 'b', condition: () => false, outcome: 'act_b', weight: 0.6 },
        { id: 'c', condition: () => true, outcome: 'act_c', weight: 0.5 },
        { id: 'd', condition: () => true, weight: 0.4 }, // no outcome — excluded
      ];
      const results = engine.evaluateAll(nodes, {});
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.outcome)).toEqual(['act_a', 'act_c']);
    });

    it('sorts results by weight descending', () => {
      const nodes: DecisionNode[] = [
        { id: 'low', condition: () => true, outcome: 'low', weight: 0.3 },
        { id: 'high', condition: () => true, outcome: 'high', weight: 0.9 },
      ];
      const results = engine.evaluateAll(nodes, {});
      expect(results[0].outcome).toBe('high');
    });

    it('returns empty array when no node conditions fire', () => {
      const nodes: DecisionNode[] = [
        { id: 'x', condition: () => false, outcome: 'x', weight: 1.0 },
      ];
      expect(engine.evaluateAll(nodes, {})).toHaveLength(0);
    });
  });

  // ── computeConfidenceFromFiredNodes ───────────────────────────────────────

  describe('computeConfidenceFromFiredNodes', () => {
    it('returns 0 for an empty list', () => {
      expect(engine.computeConfidenceFromFiredNodes([], {})).toBe(0);
    });

    it('returns 100 for a single node with maximum weight', () => {
      const nodes: DecisionNode[] = [
        { id: 'n', condition: () => true, outcome: 'x', weight: 1.0 },
      ];
      expect(engine.computeConfidenceFromFiredNodes(nodes, {})).toBe(100);
    });

    it('returns a value in [0, 100]', () => {
      const nodes: DecisionNode[] = [
        { id: 'a', condition: () => true, weight: 0.3, outcome: 'x' },
        { id: 'b', condition: () => true, weight: 0.9, outcome: 'y' },
      ];
      const score = engine.computeConfidenceFromFiredNodes(nodes, {});
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
