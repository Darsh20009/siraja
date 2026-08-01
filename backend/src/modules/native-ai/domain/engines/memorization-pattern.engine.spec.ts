import { MemorizationPatternEngine } from './memorization-pattern.engine';
import { SM2_MIN_EASE, SM2_DEFAULT_EASE } from '../rules/arabic.rules';

describe('MemorizationPatternEngine', () => {
  let engine: MemorizationPatternEngine;

  beforeEach(() => {
    engine = new MemorizationPatternEngine();
  });

  // ── computeSm2 — successful recall ────────────────────────────────────────

  describe('computeSm2 — passing grades (≥ 3)', () => {
    it('first successful recall returns interval 1', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 1, 0, 3);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('second successful recall returns interval 6', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 1, 1, 4);
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it('subsequent recalls multiply by ease factor', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 6, 2, 5);
      expect(result.interval).toBe(Math.round(6 * SM2_DEFAULT_EASE));
    });

    it('grade 5 increases ease factor', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 6, 2, 5);
      expect(result.easeFactor).toBeGreaterThan(SM2_DEFAULT_EASE);
    });

    it('grade 3 decreases ease factor slightly', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 6, 2, 3);
      expect(result.easeFactor).toBeLessThan(SM2_DEFAULT_EASE);
    });

    it('ease factor never drops below SM2_MIN_EASE', () => {
      // Grade 3 repeatedly should floor at SM2_MIN_EASE
      const ease = SM2_MIN_EASE;
      const result = engine.computeSm2(ease, 6, 2, 3);
      expect(result.easeFactor).toBeGreaterThanOrEqual(SM2_MIN_EASE);
    });
  });

  // ── computeSm2 — failed recall ────────────────────────────────────────────

  describe('computeSm2 — failing grades (≤ 2)', () => {
    it('failed recall resets interval to 1', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 30, 5, 2);
      expect(result.interval).toBe(1);
    });

    it('failed recall resets repetitions to 0', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 30, 5, 1);
      expect(result.repetitions).toBe(0);
    });

    it('failed recall reduces ease factor', () => {
      const result = engine.computeSm2(SM2_DEFAULT_EASE, 30, 5, 0);
      expect(result.easeFactor).toBeLessThan(SM2_DEFAULT_EASE);
    });
  });

  // ── computeRetention ──────────────────────────────────────────────────────

  describe('computeRetention', () => {
    it('returns 1 for 0 days since review (same day)', () => {
      const r = engine.computeRetention(0, 30);
      expect(r).toBeCloseTo(1, 4);
    });

    it('returns value < 1 after some days have passed', () => {
      expect(engine.computeRetention(5, 10)).toBeLessThan(1);
    });

    it('retention decreases as days increase', () => {
      const r1 = engine.computeRetention(3, 10);
      const r2 = engine.computeRetention(7, 10);
      expect(r1).toBeGreaterThan(r2);
    });

    it('retention is higher with larger stability (interval)', () => {
      const r1 = engine.computeRetention(5, 5);
      const r2 = engine.computeRetention(5, 20);
      expect(r2).toBeGreaterThan(r1);
    });

    it('returns value in [0, 1]', () => {
      const r = engine.computeRetention(100, 5);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  // ── computeForgettingRate ────────────────────────────────────────────────

  describe('computeForgettingRate', () => {
    it('returns value in [0, 1]', () => {
      const rate = engine.computeForgettingRate(0.8);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('higher retention24h → lower forgetting rate', () => {
      const r1 = engine.computeForgettingRate(0.9);
      const r2 = engine.computeForgettingRate(0.5);
      expect(r1).toBeLessThan(r2);
    });
  });

  // ── analyze — empty sessions ──────────────────────────────────────────────

  describe('analyze — empty sessions', () => {
    it('returns default pattern with SM2_DEFAULT_EASE', () => {
      const pattern = engine.analyze([]);
      expect(pattern.easeFactor).toBe(SM2_DEFAULT_EASE);
      expect(pattern.interval).toBe(1);
      expect(pattern.repetitions).toBe(0);
    });

    it('weeklyCapacity is a positive number', () => {
      const pattern = engine.analyze([]);
      expect(pattern.weeklyCapacity).toBeGreaterThan(0);
    });
  });

  // ── analyze — with sessions ───────────────────────────────────────────────

  describe('analyze — with session history', () => {
    const now = new Date();
    const makeSession = (grade: number, daysAgo: number) => ({
      grade,
      date: new Date(now.getTime() - daysAgo * 86_400_000),
    });

    it('accumulates SM-2 state across sessions', () => {
      const sessions = [
        makeSession(5, 10),
        makeSession(5, 7),
        makeSession(4, 4),
      ];
      const pattern = engine.analyze(sessions);
      expect(pattern.repetitions).toBeGreaterThan(0);
      expect(pattern.interval).toBeGreaterThan(1);
    });

    it('retentionProbability is in [0, 1]', () => {
      const pattern = engine.analyze([makeSession(4, 2)]);
      expect(pattern.retentionProbability).toBeGreaterThanOrEqual(0);
      expect(pattern.retentionProbability).toBeLessThanOrEqual(1);
    });

    it('forgettingRate is in [0, 1]', () => {
      const pattern = engine.analyze([makeSession(4, 2)]);
      expect(pattern.forgettingRate).toBeGreaterThanOrEqual(0);
      expect(pattern.forgettingRate).toBeLessThanOrEqual(1);
    });

    it('recommendedSessionLength is within bounds', () => {
      const pattern = engine.analyze([makeSession(4, 1)]);
      expect(pattern.recommendedSessionLength).toBeGreaterThanOrEqual(15);
      expect(pattern.recommendedSessionLength).toBeLessThanOrEqual(60);
    });

    it('newToReviewRatio is in [0, 1]', () => {
      const pattern = engine.analyze([makeSession(4, 1)]);
      expect(pattern.newToReviewRatio).toBeGreaterThanOrEqual(0);
      expect(pattern.newToReviewRatio).toBeLessThanOrEqual(1);
    });

    it('optimalStudyTime is a valid enum value', () => {
      const pattern = engine.analyze([makeSession(5, 1)]);
      expect(['morning', 'afternoon', 'evening', 'any']).toContain(pattern.optimalStudyTime);
    });
  });
});
