import { RuleEngine } from './rule.engine';
import type { AiRule } from '../entities/ai-rule.entity';

const makeRule = (
  id: string,
  fires: boolean,
  weight = 0.5,
): AiRule => ({
  id,
  name: id,
  category: 'risk',
  condition: () => fires,
  weight,
  description: `Test rule ${id}`,
  action: 'no_action',
});

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  // ── evaluate ──────────────────────────────────────────────────────────────

  describe('evaluate', () => {
    it('separates fired from skipped rules correctly', () => {
      const rules: AiRule[] = [
        makeRule('r1', true),
        makeRule('r2', false),
        makeRule('r3', true),
      ];
      const result = engine.evaluate(rules, {});
      expect(result.firedRules.map((r) => r.id)).toEqual(['r1', 'r3']);
      expect(result.skippedRules.map((r) => r.id)).toEqual(['r2']);
    });

    it('returns compositeScore of 0 when no rules fire', () => {
      const rules = [makeRule('r1', false), makeRule('r2', false)];
      expect(engine.evaluate(rules, {}).compositeScore).toBe(0);
    });

    it('returns compositeScore of 100 when all rules fire', () => {
      const rules = [makeRule('r1', true, 0.5), makeRule('r2', true, 0.5)];
      expect(engine.evaluate(rules, {}).compositeScore).toBe(100);
    });

    it('returns compositeScore between 0 and 100 for partial fire', () => {
      const rules = [makeRule('r1', true, 0.5), makeRule('r2', false, 0.5)];
      const { compositeScore } = engine.evaluate(rules, {});
      expect(compositeScore).toBeGreaterThan(0);
      expect(compositeScore).toBeLessThan(100);
    });

    it('sorts firedRules by weight descending', () => {
      const rules: AiRule[] = [
        { ...makeRule('low', true), weight: 0.2 },
        { ...makeRule('high', true), weight: 0.9 },
      ];
      const { firedRules } = engine.evaluate(rules, {});
      expect(firedRules[0].id).toBe('high');
    });

    it('returns empty arrays and score 0 for an empty rule set', () => {
      const result = engine.evaluate([], {});
      expect(result.firedRules).toHaveLength(0);
      expect(result.compositeScore).toBe(0);
    });
  });

  // ── filterApplicable ──────────────────────────────────────────────────────

  describe('filterApplicable', () => {
    it('returns only rules whose conditions are true', () => {
      const rules = [makeRule('a', true), makeRule('b', false), makeRule('c', true)];
      const applicable = engine.filterApplicable(rules, {});
      expect(applicable.map((r) => r.id)).toContain('a');
      expect(applicable.map((r) => r.id)).toContain('c');
      expect(applicable.map((r) => r.id)).not.toContain('b');
    });

    it('sorts by weight descending', () => {
      const rules: AiRule[] = [
        { ...makeRule('light', true), weight: 0.1 },
        { ...makeRule('heavy', true), weight: 0.9 },
      ];
      const applicable = engine.filterApplicable(rules, {});
      expect(applicable[0].id).toBe('heavy');
    });
  });

  // ── computeCompositeScore ─────────────────────────────────────────────────

  describe('computeCompositeScore', () => {
    it('returns 0 when allRules is empty', () => {
      expect(engine.computeCompositeScore([], [])).toBe(0);
    });

    it('uses feature-based conditions correctly', () => {
      const featureDependentRule: AiRule = {
        id: 'fd',
        name: 'Feature Dependent',
        category: 'progress',
        condition: (f) => f['velocity'] < 1,
        weight: 0.5,
        description: 'velocity < 1',
        action: 'none',
      };
      const fired = engine.filterApplicable([featureDependentRule], { velocity: 0.5 });
      expect(fired).toHaveLength(1);
      const notFired = engine.filterApplicable([featureDependentRule], { velocity: 2 });
      expect(notFired).toHaveLength(0);
    });
  });

  // ── groupByCategory ───────────────────────────────────────────────────────

  describe('groupByCategory', () => {
    it('counts fired rules per category', () => {
      const rules: AiRule[] = [
        { ...makeRule('r1', true), category: 'risk' },
        { ...makeRule('r2', true), category: 'tajweed' },
        { ...makeRule('r3', true), category: 'risk' },
        { ...makeRule('r4', false), category: 'risk' },
      ];
      const groups = engine.groupByCategory(rules, {});
      expect(groups['risk']).toBe(2);
      expect(groups['tajweed']).toBe(1);
      expect(groups['risk_not_fired']).toBeUndefined();
    });
  });
});
