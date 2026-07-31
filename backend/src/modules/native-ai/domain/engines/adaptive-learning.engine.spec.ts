import { AdaptiveLearningEngine, AdaptivePlanInput } from './adaptive-learning.engine';
import { MemorizationRules } from '../rules/memorization.rules';

const baseInput: AdaptivePlanInput = {
  currentDifficultyLevel: 2,
  velocity: 5,
  burdenScore: 20,
  forgettingRate: 0.03,
  systematicMistakes: [],
  tajweedWeaknesses: [],
  estimatedWeeksToGoal: 52,
};

describe('AdaptiveLearningEngine', () => {
  let engine: AdaptiveLearningEngine;

  beforeEach(() => {
    engine = new AdaptiveLearningEngine();
  });

  // ── buildPlan — output structure ──────────────────────────────────────────

  describe('buildPlan — output structure', () => {
    it('returns all required AdaptivePlan fields', () => {
      const plan = engine.buildPlan(baseInput);
      expect(plan).toHaveProperty('adjustedWeeklyPace');
      expect(plan).toHaveProperty('difficultyLevel');
      expect(plan).toHaveProperty('reviewEmphasis');
      expect(plan).toHaveProperty('weeklySchedule');
      expect(plan).toHaveProperty('focusAreas');
      expect(plan).toHaveProperty('tajweedFocusRules');
      expect(plan).toHaveProperty('estimatedWeeksToGoal');
      expect(plan).toHaveProperty('rationale');
    });

    it('weeklySchedule is an array', () => {
      const plan = engine.buildPlan(baseInput);
      expect(Array.isArray(plan.weeklySchedule)).toBe(true);
    });

    it('focusAreas is an array', () => {
      const plan = engine.buildPlan(baseInput);
      expect(Array.isArray(plan.focusAreas)).toBe(true);
    });

    it('rationale is a non-empty array', () => {
      const plan = engine.buildPlan(baseInput);
      expect(plan.rationale.length).toBeGreaterThan(0);
    });

    it('difficultyLevel matches input', () => {
      const plan = engine.buildPlan(baseInput);
      expect(plan.difficultyLevel).toBe(baseInput.currentDifficultyLevel);
    });

    it('estimatedWeeksToGoal matches input', () => {
      const plan = engine.buildPlan(baseInput);
      expect(plan.estimatedWeeksToGoal).toBe(baseInput.estimatedWeeksToGoal);
    });
  });

  // ── buildPlan — pace reduction ────────────────────────────────────────────

  describe('buildPlan — pace adjustments for burden', () => {
    it('reduces pace by ~50% under critical burden', () => {
      const plan = engine.buildPlan({ ...baseInput, burdenScore: MemorizationRules.CRITICAL_BURDEN_SCORE + 1 });
      expect(plan.adjustedWeeklyPace).toBeLessThan(baseInput.velocity);
    });

    it('reduces pace by ~25% under high burden', () => {
      const plan = engine.buildPlan({ ...baseInput, burdenScore: MemorizationRules.HIGH_BURDEN_SCORE + 1 });
      expect(plan.adjustedWeeklyPace).toBeLessThan(baseInput.velocity);
    });

    it('keeps pace unchanged under low burden', () => {
      const plan = engine.buildPlan({ ...baseInput, burdenScore: 10 });
      expect(plan.adjustedWeeklyPace).toBe(baseInput.velocity);
    });
  });

  // ── buildPlan — reviewEmphasis ────────────────────────────────────────────

  describe('buildPlan — reviewEmphasis', () => {
    it('reviewEmphasis is in [0, 1]', () => {
      const plan = engine.buildPlan(baseInput);
      expect(plan.reviewEmphasis).toBeGreaterThanOrEqual(0);
      expect(plan.reviewEmphasis).toBeLessThanOrEqual(1);
    });

    it('high burden produces higher reviewEmphasis', () => {
      const low = engine.buildPlan({ ...baseInput, burdenScore: 10 });
      const high = engine.buildPlan({ ...baseInput, burdenScore: 80 });
      expect(high.reviewEmphasis).toBeGreaterThan(low.reviewEmphasis);
    });
  });

  // ── buildPlan — weeklySchedule ────────────────────────────────────────────

  describe('buildPlan — weeklySchedule', () => {
    it('schedule days are in [0, 6]', () => {
      const plan = engine.buildPlan(baseInput);
      for (const day of plan.weeklySchedule) {
        expect(day.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(day.dayOfWeek).toBeLessThanOrEqual(6);
      }
    });

    it('sessionMinutes are within bounds', () => {
      const plan = engine.buildPlan(baseInput);
      for (const day of plan.weeklySchedule) {
        expect(day.sessionMinutes).toBeGreaterThanOrEqual(MemorizationRules.MIN_SESSION_MINUTES);
        expect(day.sessionMinutes).toBeLessThanOrEqual(MemorizationRules.MAX_SESSION_MINUTES);
      }
    });

    it('each day schedule has required fields', () => {
      const plan = engine.buildPlan(baseInput);
      for (const day of plan.weeklySchedule) {
        expect(day).toHaveProperty('dayOfWeek');
        expect(day).toHaveProperty('sessionMinutes');
        expect(day).toHaveProperty('newAyahsTarget');
        expect(day).toHaveProperty('reviewAyahsTarget');
        expect(day).toHaveProperty('tajweedPractice');
      }
    });
  });

  // ── buildPlan — focusAreas ────────────────────────────────────────────────

  describe('buildPlan — focusAreas from tajweedWeaknesses', () => {
    it('adds tajweed focus area when weaknesses are provided', () => {
      const plan = engine.buildPlan({ ...baseInput, tajweedWeaknesses: ['idhar', 'iqlab'] });
      const tajweedArea = plan.focusAreas.find((f) => f.area === 'tajweed');
      expect(tajweedArea).toBeDefined();
    });

    it('tajweedFocusRules includes provided weaknesses', () => {
      const plan = engine.buildPlan({ ...baseInput, tajweedWeaknesses: ['idhar', 'iqlab'] });
      expect(plan.tajweedFocusRules).toContain('idhar');
      expect(plan.tajweedFocusRules).toContain('iqlab');
    });

    it('no focus areas when no weaknesses or mistakes', () => {
      const plan = engine.buildPlan({ ...baseInput, tajweedWeaknesses: [], systematicMistakes: [] });
      expect(plan.focusAreas).toHaveLength(0);
    });
  });

  // ── buildPlan — tajweedPractice flag ──────────────────────────────────────

  describe('buildPlan — tajweedPractice flag', () => {
    it('tajweedPractice is true when weaknesses exist', () => {
      const plan = engine.buildPlan({ ...baseInput, tajweedWeaknesses: ['idhar'] });
      const dayWithPractice = plan.weeklySchedule.find((d) => d.tajweedPractice);
      expect(dayWithPractice).toBeDefined();
    });

    it('tajweedPractice is false when no weaknesses', () => {
      const plan = engine.buildPlan({ ...baseInput, tajweedWeaknesses: [] });
      expect(plan.weeklySchedule.every((d) => !d.tajweedPractice)).toBe(true);
    });
  });
});
