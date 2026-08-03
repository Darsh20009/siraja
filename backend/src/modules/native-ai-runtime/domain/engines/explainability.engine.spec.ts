import { ExplainabilityEngine } from './explainability.engine';
import type { AiDecision } from '../entities/ai-decision.entity';
import type { AiRule } from '../entities/ai-rule.entity';

const makeRule = (id: string, weight = 0.5): AiRule => ({
  id,
  name: id,
  category: 'risk',
  condition: () => true,
  weight,
  description: `Rule ${id}`,
  action: 'no_action',
});

const makeDecision = (rulesFired: string[]): AiDecision => ({
  decisionId: 'test_decision',
  type: 'risk_flag',
  outcome: 'flag_for_review',
  confidence: 75,
  evidence: ['high_burden'],
  rulesFired,
  timestamp: new Date(),
  metadata: {},
});

describe('ExplainabilityEngine', () => {
  let engine: ExplainabilityEngine;

  beforeEach(() => {
    engine = new ExplainabilityEngine();
  });

  // ── explain ───────────────────────────────────────────────────────────────

  describe('explain', () => {
    it('returns a non-empty summary', () => {
      const decision = makeDecision(['risk.high_burden']);
      const rules = [makeRule('risk.high_burden')];
      const result = engine.explain(decision, rules, { burdenScore: 75 });
      expect(result.summary).toBeTruthy();
      expect(typeof result.summary).toBe('string');
    });

    it('sets the decisionId from the input decision', () => {
      const decision = makeDecision(['risk.high_burden']);
      const result = engine.explain(decision, [makeRule('risk.high_burden')], {});
      expect(result.decisionId).toBe('test_decision');
    });

    it('sets confidence from the input decision', () => {
      const decision = makeDecision([]);
      const result = engine.explain(decision, [], {});
      expect(result.confidence).toBe(75);
    });

    it('builds ruleContributions for each fired rule that exists in allRules', () => {
      const decision = makeDecision(['risk.high_burden', 'risk.low_velocity']);
      const rules = [makeRule('risk.high_burden', 0.3), makeRule('risk.low_velocity', 0.2)];
      const result = engine.explain(decision, rules, {});
      expect(result.ruleContributions).toHaveLength(2);
    });

    it('returns empty ruleContributions when no rules fired', () => {
      const decision = makeDecision([]);
      const result = engine.explain(decision, [], {});
      expect(result.ruleContributions).toHaveLength(0);
    });

    it('generates a human-readable string', () => {
      const decision = makeDecision(['risk.high_burden']);
      const rules = [makeRule('risk.high_burden')];
      const result = engine.explain(decision, rules, { burdenScore: 75 });
      expect(result.humanReadable).toBeTruthy();
      expect(result.humanReadable.length).toBeGreaterThan(20);
    });
  });

  // ── computeFeatureImportance ──────────────────────────────────────────────

  describe('computeFeatureImportance', () => {
    it('returns empty array when no rules fired', () => {
      const result = engine.computeFeatureImportance([], {});
      expect(result).toHaveLength(0);
    });

    it('assigns importance values that are between 0 and 1', () => {
      const rules = [makeRule('risk.high_burden', 0.4), makeRule('risk.low_velocity', 0.6)];
      const result = engine.computeFeatureImportance(rules, {
        burdenScore: 80,
        velocity: 0.5,
      });
      for (const item of result) {
        expect(item.importance).toBeGreaterThanOrEqual(0);
        expect(item.importance).toBeLessThanOrEqual(1);
      }
    });

    it('sorts features by importance descending', () => {
      const rules = [
        makeRule('risk.high_burden', 0.8),
        makeRule('tajweed.low_score', 0.2),
      ];
      const result = engine.computeFeatureImportance(rules, {});
      if (result.length >= 2) {
        expect(result[0].importance).toBeGreaterThanOrEqual(result[1].importance);
      }
    });
  });

  // ── generateHumanReadable ─────────────────────────────────────────────────

  describe('generateHumanReadable', () => {
    it('returns a fallback sentence when no contributions', () => {
      const decision = makeDecision([]);
      const text = engine.generateHumanReadable(decision, []);
      expect(text).toContain('no concerns');
    });

    it('includes the decision outcome in the text', () => {
      const decision = makeDecision(['risk.high_burden']);
      const rules = [makeRule('risk.high_burden')];
      const { ruleContributions } = engine.explain(decision, rules, {});
      const text = engine.generateHumanReadable(decision, ruleContributions);
      expect(text).toContain('flag_for_review');
    });
  });
});
