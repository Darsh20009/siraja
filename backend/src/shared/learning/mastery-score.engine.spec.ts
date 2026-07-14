import { MasteryScoreEngine, MasteryInput } from './mastery-score.engine';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

describe('MasteryScoreEngine', () => {
  let engine: MasteryScoreEngine;

  beforeEach(() => {
    engine = new MasteryScoreEngine();
  });

  // ── baseScore ──────────────────────────────────────────────────────────
  describe('baseScore', () => {
    it('maps EXCELLENT → 95', () => {
      expect(engine.baseScore(EvaluationGrade.EXCELLENT)).toBe(95);
    });
    it('maps VERY_GOOD → 85', () => {
      expect(engine.baseScore(EvaluationGrade.VERY_GOOD)).toBe(85);
    });
    it('maps GOOD → 70', () => {
      expect(engine.baseScore(EvaluationGrade.GOOD)).toBe(70);
    });
    it('maps ACCEPTABLE → 55', () => {
      expect(engine.baseScore(EvaluationGrade.ACCEPTABLE)).toBe(55);
    });
    it('maps WEAK → 30', () => {
      expect(engine.baseScore(EvaluationGrade.WEAK)).toBe(30);
    });
    it('maps undefined → 60 (default)', () => {
      expect(engine.baseScore(undefined)).toBe(60);
    });
  });

  // ── recencyFactor ──────────────────────────────────────────────────────
  describe('recencyFactor', () => {
    it('returns 0 when lastActivityAt is null', () => {
      expect(engine.recencyFactor(null)).toBe(0);
    });

    it('returns ~100 when memorized moments ago', () => {
      const justNow = new Date(Date.now() - 1000); // 1 second ago
      expect(engine.recencyFactor(justNow)).toBeGreaterThan(99);
    });

    it('returns ~37 after 30 days (e^-1 decay)', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
      const factor = engine.recencyFactor(thirtyDaysAgo);
      expect(factor).toBeGreaterThan(35);
      expect(factor).toBeLessThan(40);
    });

    it('returns a low value after 90 days', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
      expect(engine.recencyFactor(ninetyDaysAgo)).toBeLessThan(10);
    });

    it('clamps to 0 minimum', () => {
      const veryOld = new Date(Date.now() - 365 * 86_400_000);
      expect(engine.recencyFactor(veryOld)).toBeGreaterThanOrEqual(0);
    });
  });

  // ── mistakeFactor ──────────────────────────────────────────────────────
  describe('mistakeFactor', () => {
    it('returns 100 when no mistakes', () => {
      expect(engine.mistakeFactor(0)).toBe(100);
    });
    it('returns 92 with 1 mistake', () => {
      expect(engine.mistakeFactor(1)).toBe(92);
    });
    it('returns 60 with 5 mistakes', () => {
      expect(engine.mistakeFactor(5)).toBe(60);
    });
    it('clamps at 20 for 10+ mistakes', () => {
      expect(engine.mistakeFactor(10)).toBe(20);
      expect(engine.mistakeFactor(100)).toBe(20);
    });
  });

  // ── revisionFactor ─────────────────────────────────────────────────────
  describe('revisionFactor', () => {
    it('returns 50 when never revised', () => {
      expect(engine.revisionFactor(0)).toBe(50);
    });
    it('returns 55 with 1 revision', () => {
      expect(engine.revisionFactor(1)).toBe(55);
    });
    it('returns 100 with 10+ revisions', () => {
      expect(engine.revisionFactor(10)).toBe(100);
      expect(engine.revisionFactor(50)).toBe(100);
    });
  });

  // ── compute ────────────────────────────────────────────────────────────
  describe('compute', () => {
    it('returns a value in [0, 100]', () => {
      const inputs: MasteryInput[] = [
        { grade: EvaluationGrade.EXCELLENT, lastActivityAt: new Date(), mistakeCount: 0, revisionCount: 0 },
        { grade: EvaluationGrade.WEAK, lastActivityAt: null, mistakeCount: 20, revisionCount: 0 },
        { grade: undefined, lastActivityAt: null, mistakeCount: 0, revisionCount: 0 },
      ];
      for (const input of inputs) {
        const score = engine.compute(input);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('excellent grade with no mistakes and recent activity scores high', () => {
      const score = engine.compute({
        grade: EvaluationGrade.EXCELLENT,
        lastActivityAt: new Date(),
        mistakeCount: 0,
        revisionCount: 5,
      });
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('weak grade with many mistakes and old activity scores low', () => {
      const score = engine.compute({
        grade: EvaluationGrade.WEAK,
        lastActivityAt: new Date(Date.now() - 90 * 86_400_000),
        mistakeCount: 10,
        revisionCount: 0,
      });
      expect(score).toBeLessThan(35);
    });

    it('null lastActivityAt significantly depresses the score', () => {
      const withRecency = engine.compute({
        grade: EvaluationGrade.GOOD,
        lastActivityAt: new Date(),
        mistakeCount: 0,
        revisionCount: 0,
      });
      const withoutRecency = engine.compute({
        grade: EvaluationGrade.GOOD,
        lastActivityAt: null,
        mistakeCount: 0,
        revisionCount: 0,
      });
      expect(withRecency).toBeGreaterThan(withoutRecency + 20);
    });

    it('returns an integer', () => {
      const score = engine.compute({
        grade: EvaluationGrade.GOOD,
        lastActivityAt: new Date(),
        mistakeCount: 2,
        revisionCount: 3,
      });
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  // ── applyMistakePenalty ────────────────────────────────────────────────
  describe('applyMistakePenalty', () => {
    it('subtracts 10 from current score', () => {
      expect(engine.applyMistakePenalty(80, 1)).toBe(70);
    });

    it('clamps at 0', () => {
      expect(engine.applyMistakePenalty(5, 1)).toBe(0);
    });

    it('does not go above 100', () => {
      // No scenario produces above 100, but the clamp is defensive
      expect(engine.applyMistakePenalty(100, 1)).toBe(90);
    });
  });
});
