import { TajweedAnalysisEngine } from './tajweed-analysis.engine';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type { SegmentFeatures } from '../../infrastructure/providers/interfaces/audio-feature-extractor.provider.interface';

describe('TajweedAnalysisEngine', () => {
  let engine: TajweedAnalysisEngine;
  const sessionId = 'session-xyz';

  const makeWa = (expectedText: string, options: Partial<WordAlignment> = {}): WordAlignment => ({
    segmentId: 'seg-1',
    recognisedText: expectedText,
    expectedText,
    surahNumber: 1,
    ayahNumber: 1,
    wordIndex: 0,
    startSeconds: 0,
    endSeconds: 1.0,
    confidence: 0.9,
    isMatch: true,
    editDistance: 0,
    ...options,
  });

  const nullFeatures = new Map<number, SegmentFeatures>();

  const realFeatures = new Map<number, SegmentFeatures>([
    [
      0,
      {
        segmentIndex: 0,
        startSeconds: 0,
        endSeconds: 5,
        meanPitchHz: 180,
        meanEnergyDbfs: -20,
        pitchVariance: 5,
        mfccMeans: new Array(13).fill(0),
        voicedRatio: 0.8,
        providerName: 'real',
      },
    ],
  ]);

  beforeEach(() => {
    engine = new TajweedAnalysisEngine();
  });

  describe('analyse — with null provider (no features)', () => {
    it('produces undetectable outcomes for madd words', () => {
      // ا is a madd letter
      const wa = makeWa('الله');
      const observations = engine.analyse([wa], nullFeatures, sessionId);
      expect(observations.length).toBeGreaterThan(0);
      expect(observations.every((o) => o.outcome === 'undetectable')).toBe(true);
    });

    it('returns empty array for empty alignments', () => {
      const observations = engine.analyse([], nullFeatures, sessionId);
      expect(observations).toHaveLength(0);
    });

    it('skips insertions (no expectedText)', () => {
      const insertion = makeWa('', { expectedText: undefined });
      const observations = engine.analyse([insertion], nullFeatures, sessionId);
      expect(observations).toHaveLength(0);
    });
  });

  describe('analyse — with real features', () => {
    it('produces detectable outcomes when real features present', () => {
      const wa = makeWa('الله', { startSeconds: 0, endSeconds: 0.5 });
      const observations = engine.analyse([wa], realFeatures, sessionId);
      const detectable = observations.filter((o) => o.outcome !== 'undetectable');
      expect(detectable.length).toBeGreaterThan(0);
    });

    it('assigns session ID to all observations', () => {
      const wa = makeWa('الله');
      const observations = engine.analyse([wa], realFeatures, sessionId);
      expect(observations.every((o) => o.sessionId === sessionId)).toBe(true);
    });
  });

  describe('analyse — ghunna detection', () => {
    it('detects ghunna on noon with shadda (نّ)', () => {
      // نّ = noon + shadda = ghunna
      const wa = makeWa('إِنَّ');
      const observations = engine.analyse([wa], nullFeatures, sessionId);
      expect(observations.some((o) => o.rule === 'ghunna')).toBe(true);
    });
  });

  describe('analyse — qalqala detection', () => {
    it('detects qalqala on qaf letter (ق)', () => {
      const wa = makeWa('قُلْ');
      const observations = engine.analyse([wa], nullFeatures, sessionId);
      expect(observations.some((o) => o.rule === 'qalqala')).toBe(true);
    });
  });

  describe('analyse — waqf detection', () => {
    it('adds waqf_tam observation for pause at ayah boundary', () => {
      const wa1 = makeWa('كُفُوًا', {
        ayahNumber: 4,
        startSeconds: 0,
        endSeconds: 1.0,
      });
      const wa2 = makeWa('بِسْمِ', {
        ayahNumber: 5,
        startSeconds: 3.5, // 2.5s gap > 1s → waqf_tam
        endSeconds: 4.0,
      });
      const observations = engine.analyse([wa1, wa2], nullFeatures, sessionId);
      expect(observations.some((o) => o.rule === 'waqf_tam')).toBe(true);
    });

    it('adds incorrect waqf_kafi for pause within same ayah', () => {
      const wa1 = makeWa('بِسْمِ', {
        ayahNumber: 1,
        startSeconds: 0,
        endSeconds: 1.0,
      });
      const wa2 = makeWa('اللَّهِ', {
        ayahNumber: 1,
        startSeconds: 3.0, // 2s gap within same ayah → bad stop
        endSeconds: 3.5,
      });
      const observations = engine.analyse([wa1, wa2], nullFeatures, sessionId);
      const badWaqf = observations.find((o) => o.rule === 'waqf_kafi' && o.outcome === 'incorrect');
      expect(badWaqf).toBeDefined();
    });
  });

  describe('summarise', () => {
    it('returns tajweedScore 0 when all observations are undetectable', () => {
      const obs = [{ outcome: 'undetectable' as const, rule: 'madd_tabii' as const, id: '', sessionId, description: '', createdAt: new Date() }];
      const summary = engine.summarise(obs);
      expect(summary.tajweedScore).toBe(0);
    });

    it('computes 100 when all detectable observations are correct', () => {
      const obs = [
        { outcome: 'correct' as const, rule: 'madd_tabii' as const, id: '', sessionId, description: '', createdAt: new Date() },
        { outcome: 'correct' as const, rule: 'ghunna' as const, id: '', sessionId, description: '', createdAt: new Date() },
      ];
      const summary = engine.summarise(obs);
      expect(summary.tajweedScore).toBe(100);
    });

    it('computes 50 when half are incorrect', () => {
      const obs = [
        { outcome: 'correct' as const, rule: 'madd_tabii' as const, id: '', sessionId, description: '', createdAt: new Date() },
        { outcome: 'incorrect' as const, rule: 'ghunna' as const, id: '', sessionId, description: '', createdAt: new Date() },
      ];
      const summary = engine.summarise(obs);
      expect(summary.tajweedScore).toBe(50);
    });
  });
});
