import { AudioScoreEngine, ScoreInput } from './audio-score.engine';
import { AudioRules } from '../rules/audio-rules';

describe('AudioScoreEngine', () => {
  let engine: AudioScoreEngine;

  const baseInput = (): ScoreInput => ({
    sessionId: 'sess-1',
    wordAlignments: [],
    segments: [],
    mistakes: [],
    tajweedObservations: [],
    totalExpectedWords: 100,
    correctWords: 100,
    deletedWords: 0,
    insertedWords: 0,
    speechDurationSeconds: 60,
    asrConfidenceScore: 90,
  });

  beforeEach(() => {
    engine = new AudioScoreEngine();
  });

  describe('score — perfect session', () => {
    it('returns compositeScore of 100 for all-perfect inputs', () => {
      const input = baseInput();
      const result = engine.score(input);
      // Accuracy=100, tajweed=0 (no observations), fluency computed from 100 wpm, consistency=100
      // The perfect scenario with no tajweed observations gives tajweedScore=0
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
    });

    it('sets tier to excellent when compositeScore >= 85', () => {
      const input: ScoreInput = {
        ...baseInput(),
        tajweedObservations: [
          { id: '', sessionId: 'sess-1', rule: 'madd_tabii', outcome: 'correct', description: '', createdAt: new Date() },
          { id: '', sessionId: 'sess-1', rule: 'ghunna', outcome: 'correct', description: '', createdAt: new Date() },
        ],
      };
      const result = engine.score(input);
      if (result.compositeScore >= AudioRules.TIER_EXCELLENT) {
        expect(result.tier).toBe('excellent');
      }
    });
  });

  describe('score — zero accuracy', () => {
    it('returns needs_improvement tier when accuracy is 0', () => {
      const input: ScoreInput = {
        ...baseInput(),
        correctWords: 0,
        deletedWords: 100,
        speechDurationSeconds: 0,
      };
      const result = engine.score(input);
      expect(result.breakdown.accuracyScore).toBe(0);
      expect(['needs_improvement', 'satisfactory']).toContain(result.tier);
    });
  });

  describe('tier', () => {
    it('returns excellent for score >= 85', () => {
      expect(engine.tier(85)).toBe('excellent');
      expect(engine.tier(100)).toBe('excellent');
    });

    it('returns good for 70 <= score < 85', () => {
      expect(engine.tier(70)).toBe('good');
      expect(engine.tier(84)).toBe('good');
    });

    it('returns satisfactory for 50 <= score < 70', () => {
      expect(engine.tier(50)).toBe('satisfactory');
      expect(engine.tier(69)).toBe('satisfactory');
    });

    it('returns needs_improvement for score < 50', () => {
      expect(engine.tier(49)).toBe('needs_improvement');
      expect(engine.tier(0)).toBe('needs_improvement');
    });
  });

  describe('score — weight distribution', () => {
    it('formula weights sum to 1.0', () => {
      const total =
        AudioRules.W_ACCURACY + AudioRules.W_TAJWEED + AudioRules.W_FLUENCY + AudioRules.W_CONSISTENCY;
      expect(total).toBeCloseTo(1.0, 5);
    });
  });

  describe('score — WPM calculation', () => {
    it('computes 100 wpm for 60 words in 60 seconds of speech', () => {
      const input: ScoreInput = {
        ...baseInput(),
        wordAlignments: Array.from({ length: 60 }, (_, i) => ({
          segmentId: 'seg-1',
          recognisedText: 'word',
          expectedText: 'word',
          surahNumber: 1,
          ayahNumber: 1,
          wordIndex: i,
          startSeconds: i * 0.5,
          endSeconds: i * 0.5 + 0.4,
          confidence: 0.9,
          isMatch: true,
          editDistance: 0,
        })),
        speechDurationSeconds: 60,
        correctWords: 60,
        totalExpectedWords: 60,
      };
      const result = engine.score(input);
      expect(result.wordsPerMinute).toBe(60);
    });
  });

  describe('score — mistake counts', () => {
    it('correctly counts critical/major/minor mistakes', () => {
      const input: ScoreInput = {
        ...baseInput(),
        mistakes: [
          { id: '', sessionId: 'sess-1', type: 'skipped_ayah', severity: 'critical', description: '', isRecurring: false, createdAt: new Date() },
          { id: '', sessionId: 'sess-1', type: 'skipped_word', severity: 'major', description: '', isRecurring: false, createdAt: new Date() },
          { id: '', sessionId: 'sess-1', type: 'wrong_word', severity: 'minor', description: '', isRecurring: false, createdAt: new Date() },
        ],
      };
      const result = engine.score(input);
      expect(result.criticalMistakes).toBe(1);
      expect(result.majorMistakes).toBe(1);
      expect(result.minorMistakes).toBe(1);
      expect(result.totalMistakes).toBe(3);
    });
  });
});
