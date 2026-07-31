import { ForecastEngine, ForecastInput } from './forecast.engine';
import { MemorizationRules } from '../rules/memorization.rules';

const baseInput: ForecastInput = {
  targetAyahs: 6236,
  currentProgress: 500,
  weeklyVelocities: [5, 5, 5, 5],
  burdenScore: 0,
  reviewOverdueCount: 0,
};

describe('ForecastEngine', () => {
  let engine: ForecastEngine;

  beforeEach(() => {
    engine = new ForecastEngine();
  });

  // ── computeVelocity ───────────────────────────────────────────────────────

  describe('computeVelocity', () => {
    it('returns mean of velocities', () => {
      expect(engine.computeVelocity([4, 6])).toBe(5);
    });

    it('returns default 1 for empty array', () => {
      expect(engine.computeVelocity([])).toBe(1);
    });

    it('handles single velocity', () => {
      expect(engine.computeVelocity([10])).toBe(10);
    });
  });

  // ── compute — output structure ────────────────────────────────────────────

  describe('compute — output structure', () => {
    it('has all required AiForecast fields', () => {
      const f = engine.compute(baseInput);
      expect(f).toHaveProperty('targetAyahs');
      expect(f).toHaveProperty('currentProgress');
      expect(f).toHaveProperty('remainingAyahs');
      expect(f).toHaveProperty('velocity');
      expect(f).toHaveProperty('projectedVelocity');
      expect(f).toHaveProperty('estimatedCompletionDate');
      expect(f).toHaveProperty('confidenceLow');
      expect(f).toHaveProperty('confidenceHigh');
      expect(f).toHaveProperty('weeklyPaceRequired');
      expect(f).toHaveProperty('isOnTrack');
      expect(f).toHaveProperty('completionProbability');
      expect(f).toHaveProperty('milestones');
      expect(f).toHaveProperty('burdenScore');
    });

    it('remainingAyahs = targetAyahs - currentProgress', () => {
      const f = engine.compute(baseInput);
      expect(f.remainingAyahs).toBe(baseInput.targetAyahs - baseInput.currentProgress);
    });

    it('returns 0 remainingAyahs when already complete', () => {
      const f = engine.compute({ ...baseInput, currentProgress: 6236 });
      expect(f.remainingAyahs).toBe(0);
    });

    it('velocity matches computeVelocity result', () => {
      const f = engine.compute(baseInput);
      expect(f.velocity).toBe(engine.computeVelocity(baseInput.weeklyVelocities));
    });
  });

  // ── compute — projected velocity ──────────────────────────────────────────

  describe('compute — projectedVelocity', () => {
    it('projectedVelocity equals velocity when burdenScore is 0', () => {
      const f = engine.compute({ ...baseInput, burdenScore: 0 });
      expect(f.projectedVelocity).toBeCloseTo(f.velocity, 5);
    });

    it('projectedVelocity < velocity when burdenScore is high', () => {
      const f = engine.compute({ ...baseInput, burdenScore: 80 });
      expect(f.projectedVelocity).toBeLessThan(f.velocity);
    });
  });

  // ── compute — dates ───────────────────────────────────────────────────────

  describe('compute — dates', () => {
    it('estimatedCompletionDate is a future Date', () => {
      const f = engine.compute(baseInput);
      expect(f.estimatedCompletionDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('confidenceLow is before estimatedCompletionDate', () => {
      const f = engine.compute(baseInput);
      expect(f.confidenceLow.getTime()).toBeLessThanOrEqual(f.estimatedCompletionDate.getTime());
    });

    it('confidenceHigh is after estimatedCompletionDate', () => {
      const f = engine.compute(baseInput);
      expect(f.confidenceHigh.getTime()).toBeGreaterThanOrEqual(f.estimatedCompletionDate.getTime());
    });
  });

  // ── compute — milestones ──────────────────────────────────────────────────

  describe('compute — milestones', () => {
    it('returns milestones array', () => {
      const f = engine.compute(baseInput);
      expect(Array.isArray(f.milestones)).toBe(true);
    });

    it('milestones have required fields', () => {
      const f = engine.compute(baseInput);
      for (const m of f.milestones) {
        expect(m).toHaveProperty('label');
        expect(m).toHaveProperty('targetAyahs');
        expect(m).toHaveProperty('estimatedDate');
        expect(m).toHaveProperty('probability');
        expect(m.probability).toBeGreaterThanOrEqual(0);
        expect(m.probability).toBeLessThanOrEqual(1);
      }
    });
  });

  // ── compute — isOnTrack ───────────────────────────────────────────────────

  describe('compute — isOnTrack', () => {
    it('isOnTrack true for active student', () => {
      const f = engine.compute({ ...baseInput, weeklyVelocities: [MemorizationRules.MIN_ACTIVE_VELOCITY + 1] });
      expect(f.isOnTrack).toBe(true);
    });

    it('isOnTrack false for zero velocity', () => {
      const f = engine.compute({ ...baseInput, weeklyVelocities: [0] });
      expect(f.isOnTrack).toBe(false);
    });
  });

  // ── compute — completionProbability ──────────────────────────────────────

  describe('compute — completionProbability', () => {
    it('returns value in [0, 1]', () => {
      const f = engine.compute(baseInput);
      expect(f.completionProbability).toBeGreaterThanOrEqual(0);
      expect(f.completionProbability).toBeLessThanOrEqual(1);
    });

    it('consistent velocities produce high probability', () => {
      const f = engine.compute({ ...baseInput, weeklyVelocities: [5, 5, 5, 5, 5] });
      expect(f.completionProbability).toBeGreaterThan(0.8);
    });
  });

  // ── compute — burdenScore ────────────────────────────────────────────────

  describe('compute — burdenScore', () => {
    it('preserves input burdenScore in output', () => {
      const f = engine.compute({ ...baseInput, burdenScore: 45 });
      expect(f.burdenScore).toBe(45);
    });
  });
});
