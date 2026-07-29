import { ConfidenceEngine } from './confidence.engine';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type { AudioSegment } from '../entities/audio-segment.entity';

describe('ConfidenceEngine', () => {
  let engine: ConfidenceEngine;

  const seg = (id: string): AudioSegment => ({
    id,
    sessionId: 'sess-1',
    segmentIndex: 0,
    startSeconds: 0,
    endSeconds: 5,
    durationSeconds: 5,
    voiceActivityConfidence: 0.9,
    energyDbfs: -20,
    pitchHz: 180,
    wordAlignments: [],
    createdAt: new Date(),
  });

  const wa = (
    segmentId: string,
    confidence: number,
    recognisedText = 'بِسْمِ',
  ): WordAlignment => ({
    segmentId,
    recognisedText,
    expectedText: 'بِسْمِ',
    surahNumber: 1,
    ayahNumber: 1,
    wordIndex: 0,
    startSeconds: 0,
    endSeconds: 0.5,
    confidence,
    isMatch: true,
    editDistance: 0,
  });

  beforeEach(() => {
    engine = new ConfidenceEngine();
  });

  describe('compute', () => {
    it('returns 0 session confidence for empty alignments', () => {
      const result = engine.compute([], [seg('s1')]);
      expect(result.sessionConfidence).toBe(0);
      expect(result.isReliable).toBe(false);
    });

    it('returns 100 for all-perfect-confidence words', () => {
      const result = engine.compute([wa('s1', 1.0), wa('s1', 1.0)], [seg('s1')]);
      expect(result.sessionConfidence).toBe(100);
      expect(result.isReliable).toBe(true);
    });

    it('returns 0 for all-zero-confidence words', () => {
      const result = engine.compute([wa('s1', 0), wa('s1', 0)], [seg('s1')]);
      expect(result.sessionConfidence).toBe(0);
      expect(result.isReliable).toBe(false);
    });

    it('computes mean correctly for mixed confidences', () => {
      const words = [wa('s1', 0.8), wa('s1', 0.6)];
      const result = engine.compute(words, [seg('s1')]);
      expect(result.sessionConfidence).toBe(70); // (0.8+0.6)/2 * 100
    });

    it('groups by segment correctly', () => {
      const segments = [seg('s1'), { ...seg('s2'), id: 's2' }];
      const words = [wa('s1', 1.0), wa('s2', 0.5)];
      const result = engine.compute(words, segments);
      expect(result.segmentConfidences.get('s1')).toBe(100);
      expect(result.segmentConfidences.get('s2')).toBe(50);
    });

    it('excludes deletion words (empty recognisedText) from confidence', () => {
      const deletion = wa('s1', 0, '');
      const good = wa('s1', 0.9);
      const result = engine.compute([deletion, good], [seg('s1')]);
      expect(result.sessionConfidence).toBe(90);
    });
  });

  describe('mean', () => {
    it('returns 0 for empty array', () => {
      expect(engine.mean([])).toBe(0);
    });

    it('returns correct mean', () => {
      const words = [wa('s1', 0.4), wa('s1', 0.8)];
      expect(engine.mean(words)).toBeCloseTo(0.6, 5);
    });
  });

  describe('standardDeviation', () => {
    it('returns 0 for fewer than 2 words', () => {
      expect(engine.standardDeviation([wa('s1', 0.8)])).toBe(0);
    });

    it('returns 0 when all confidences equal', () => {
      expect(engine.standardDeviation([wa('s1', 0.7), wa('s1', 0.7)])).toBe(0);
    });

    it('returns positive value for varied confidences', () => {
      expect(engine.standardDeviation([wa('s1', 0.0), wa('s1', 1.0)])).toBeGreaterThan(0);
    });
  });
});
