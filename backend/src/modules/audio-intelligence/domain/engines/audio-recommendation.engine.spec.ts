import { AudioRecommendationEngine } from './audio-recommendation.engine';
import { AudioRules } from '../rules/audio-rules';
import type { AudioScore } from '../entities/audio-score.entity';
import type { MistakeDetection } from '../entities/mistake-detection.entity';
import type { TajweedObservation } from '../entities/tajweed-observation.entity';

describe('AudioRecommendationEngine', () => {
  let engine: AudioRecommendationEngine;

  const makeScore = (overrides: Partial<AudioScore> = {}): AudioScore => ({
    sessionId: 'sess-1',
    compositeScore: 80,
    breakdown: {
      accuracyScore: 85,
      fluencyScore: 78,
      tajweedScore: 72,
      consistencyScore: 80,
      asrConfidenceScore: 75,
    },
    totalExpectedWords: 100,
    correctWords: 85,
    insertedWords: 2,
    deletedWords: 13,
    totalMistakes: 5,
    criticalMistakes: 0,
    majorMistakes: 2,
    minorMistakes: 3,
    wordsPerMinute: 110,
    speechDurationSeconds: 46,
    tier: 'good',
    ...overrides,
  });

  beforeEach(() => {
    engine = new AudioRecommendationEngine();
  });

  describe('generate — excellent session', () => {
    it('adds positive_feedback recommendation when composite >= 85', () => {
      const score = makeScore({
        compositeScore: AudioRules.POSITIVE_FEEDBACK_THRESHOLD,
        breakdown: {
          accuracyScore: 90,
          fluencyScore: 85,
          tajweedScore: 85,
          consistencyScore: 88,
          asrConfidenceScore: 87,
        },
        criticalMistakes: 0,
      });
      const recs = engine.generate(score, [], []);
      expect(recs.some((r) => r.type === 'positive_feedback')).toBe(true);
    });
  });

  describe('generate — critical mistakes', () => {
    it('generates high-priority memorization_gap for critical mistakes', () => {
      const score = makeScore({ criticalMistakes: 1 });
      const mistakes: MistakeDetection[] = [
        {
          id: '', sessionId: 'sess-1', type: 'skipped_ayah', severity: 'critical',
          description: '', isRecurring: false, createdAt: new Date(),
        },
      ];
      const recs = engine.generate(score, mistakes, []);
      const highRec = recs.find((r) => r.priority === 'high');
      expect(highRec).toBeDefined();
    });
  });

  describe('generate — low tajweed score', () => {
    it('generates high-priority tajweed_practice when tajweedScore < 50', () => {
      const score = makeScore({
        breakdown: {
          accuracyScore: 80,
          fluencyScore: 75,
          tajweedScore: 40, // below LOW_TAJWEED_HIGH_THRESHOLD
          consistencyScore: 78,
          asrConfidenceScore: 72,
        },
        criticalMistakes: 0,
      });
      const recs = engine.generate(score, [], []);
      const tajweedHighRec = recs.find(
        (r) => r.type === 'tajweed_practice' && r.priority === 'high',
      );
      expect(tajweedHighRec).toBeDefined();
    });

    it('generates medium-priority tajweed_practice for score 50–70', () => {
      const score = makeScore({
        breakdown: {
          accuracyScore: 80,
          fluencyScore: 75,
          tajweedScore: 60,
          consistencyScore: 78,
          asrConfidenceScore: 72,
        },
        criticalMistakes: 0,
      });
      const recs = engine.generate(score, [], []);
      const tajweedMedRec = recs.find(
        (r) => r.type === 'tajweed_practice' && r.priority === 'medium',
      );
      expect(tajweedMedRec).toBeDefined();
    });
  });

  describe('generate — low accuracy', () => {
    it('generates high-priority memorization_gap when accuracyScore < 70', () => {
      const score = makeScore({
        breakdown: {
          accuracyScore: 60, // below LOW_ACCURACY_THRESHOLD
          fluencyScore: 75,
          tajweedScore: 72,
          consistencyScore: 78,
          asrConfidenceScore: 72,
        },
        criticalMistakes: 0,
      });
      const recs = engine.generate(score, [], []);
      expect(recs.some((r) => r.type === 'memorization_gap' && r.priority === 'high')).toBe(true);
    });
  });

  describe('generate — low fluency', () => {
    it('generates fluency recommendation when fluencyScore < 60', () => {
      const score = makeScore({
        breakdown: {
          accuracyScore: 85,
          fluencyScore: 50, // below LOW_FLUENCY_THRESHOLD
          tajweedScore: 72,
          consistencyScore: 78,
          asrConfidenceScore: 72,
        },
        criticalMistakes: 0,
      });
      const recs = engine.generate(score, [], []);
      expect(recs.some((r) => r.type === 'fluency')).toBe(true);
    });
  });

  describe('generate — output ordering and capping', () => {
    it('returns recommendations sorted high → medium → low', () => {
      const score = makeScore({
        criticalMistakes: 1,
        breakdown: {
          accuracyScore: 60,
          fluencyScore: 50,
          tajweedScore: 40,
          consistencyScore: 50,
          asrConfidenceScore: 55,
        },
      });
      const mistakes: MistakeDetection[] = [
        { id: '', sessionId: 'sess-1', type: 'skipped_ayah', severity: 'critical', description: '', isRecurring: false, createdAt: new Date() },
      ];
      const recs = engine.generate(score, mistakes, []);
      const priorities = recs.map((r) => r.priority);
      const orderMap = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < priorities.length; i++) {
        expect(orderMap[priorities[i]]).toBeGreaterThanOrEqual(orderMap[priorities[i - 1]]);
      }
    });

    it('caps output at MAX_RECOMMENDATIONS', () => {
      const score = makeScore({
        criticalMistakes: 1,
        breakdown: {
          accuracyScore: 60,
          fluencyScore: 50,
          tajweedScore: 40,
          consistencyScore: 50,
          asrConfidenceScore: 55,
        },
      });
      const observations: TajweedObservation[] = [
        { id: '', sessionId: 'sess-1', rule: 'madd_tabii', outcome: 'incorrect', description: '', createdAt: new Date() },
      ];
      const mistakes: MistakeDetection[] = [
        { id: '', sessionId: 'sess-1', type: 'skipped_ayah', severity: 'critical', description: '', isRecurring: false, createdAt: new Date() },
      ];
      const recs = engine.generate(score, mistakes, observations);
      expect(recs.length).toBeLessThanOrEqual(AudioRules.MAX_RECOMMENDATIONS);
    });
  });
});
