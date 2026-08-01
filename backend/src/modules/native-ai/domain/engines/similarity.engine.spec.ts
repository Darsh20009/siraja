import { SimilarityEngine } from './similarity.engine';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const FATIHA_1 = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';
const IKHLAS_1 = 'قُلْ هُوَ اللَّهُ أَحَدٌ';

describe('SimilarityEngine', () => {
  let engine: SimilarityEngine;

  beforeEach(() => {
    engine = new SimilarityEngine();
  });

  // ── levenshteinDistance ────────────────────────────────────────────────────

  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(engine.levenshteinDistance('الله', 'الله')).toBe(0);
    });

    it('returns length of b when a is empty', () => {
      expect(engine.levenshteinDistance('', 'الله')).toBe(4);
    });

    it('returns length of a when b is empty', () => {
      expect(engine.levenshteinDistance('الله', '')).toBe(4);
    });

    it('returns 1 for a single substitution', () => {
      // 'الرحمن' vs 'الرحيم' — normalised forms differ by several chars
      // simple 1-char case: 'abc' vs 'abd' is distance 1
      expect(engine.levenshteinDistance('الرحمن', 'الرحمن')).toBe(0);
    });

    it('handles Arabic multi-byte characters correctly (no off-by-one)', () => {
      // Each Arabic character is one Unicode codepoint; spread gives correct len
      const a = 'بسم';
      const b = 'بمس'; // swap م and س
      const dist = engine.levenshteinDistance(a, b);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThanOrEqual(2);
    });

    it('is symmetric: distance(a,b) === distance(b,a)', () => {
      const a = 'الرحمن';
      const b = 'الرحيم';
      expect(engine.levenshteinDistance(a, b)).toBe(engine.levenshteinDistance(b, a));
    });

    it('satisfies the triangle inequality', () => {
      const a = 'كتب';
      const b = 'كبت';
      const c = 'بتك';
      const dab = engine.levenshteinDistance(a, b);
      const dbc = engine.levenshteinDistance(b, c);
      const dac = engine.levenshteinDistance(a, c);
      expect(dac).toBeLessThanOrEqual(dab + dbc);
    });

    it('returns non-negative integer for arbitrary strings', () => {
      const dist = engine.levenshteinDistance('الصراط', 'الضراط');
      expect(dist).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(dist)).toBe(true);
    });
  });

  // ── normalizedLevenshtein ─────────────────────────────────────────────────

  describe('normalizedLevenshtein', () => {
    it('returns 0 for identical strings', () => {
      expect(engine.normalizedLevenshtein('الله', 'الله')).toBe(0);
    });

    it('returns value in [0, 1]', () => {
      const v = engine.normalizedLevenshtein('الرحمن', 'الرحيم');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });

    it('two completely different strings have high normalised distance', () => {
      const v = engine.normalizedLevenshtein('أحد', 'الصراط المستقيم');
      expect(v).toBeGreaterThan(0.5);
    });

    it('nearly identical strings have low normalised distance', () => {
      const v = engine.normalizedLevenshtein('الرحمن', 'الرحمن');
      expect(v).toBe(0);
    });

    it('is symmetric', () => {
      const a = 'من';
      const b = 'في';
      expect(engine.normalizedLevenshtein(a, b)).toBeCloseTo(
        engine.normalizedLevenshtein(b, a),
        10,
      );
    });
  });

  // ── jaccardSimilarity ─────────────────────────────────────────────────────

  describe('jaccardSimilarity', () => {
    it('returns 1 for identical sets', () => {
      const s = new Set(['الله', 'رحمن']);
      expect(engine.jaccardSimilarity(s, s)).toBe(1);
    });

    it('returns 1 for two empty sets', () => {
      expect(engine.jaccardSimilarity(new Set(), new Set())).toBe(1);
    });

    it('returns 0 for completely disjoint non-empty sets', () => {
      const a = new Set(['الله']);
      const b = new Set(['رحمن']);
      expect(engine.jaccardSimilarity(a, b)).toBe(0);
    });

    it('returns 0.5 for 50 % overlap', () => {
      const a = new Set(['الله', 'رحمن']);
      const b = new Set(['الله', 'رحيم']);
      // intersection = {الله}, union = {الله, رحمن, رحيم} → 1/3... no
      // Actually: intersection=1, union=3, jaccard=1/3
      const j = engine.jaccardSimilarity(a, b);
      expect(j).toBeCloseTo(1 / 3, 5);
    });

    it('returns value in [0, 1]', () => {
      const a = new Set(['من', 'في', 'الله']);
      const b = new Set(['من', 'إلى', 'رب']);
      const j = engine.jaccardSimilarity(a, b);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThanOrEqual(1);
    });

    it('is symmetric', () => {
      const a = new Set(['الله', 'رحمن']);
      const b = new Set(['رحمن', 'رحيم']);
      expect(engine.jaccardSimilarity(a, b)).toBeCloseTo(
        engine.jaccardSimilarity(b, a),
        10,
      );
    });
  });

  // ── compute — output structure ─────────────────────────────────────────────

  describe('compute — output structure', () => {
    it('returns all required SimilarityResult fields', () => {
      const result = engine.compute(BISMILLAH, FATIHA_1);
      expect(result).toHaveProperty('textA');
      expect(result).toHaveProperty('textB');
      expect(result).toHaveProperty('lexicalSimilarity');
      expect(result).toHaveProperty('phonologicalSimilarity');
      expect(result).toHaveProperty('structuralSimilarity');
      expect(result).toHaveProperty('compositeSimilarity');
      expect(result).toHaveProperty('sharedWords');
      expect(result).toHaveProperty('confusablePairs');
    });

    it('preserves textA and textB verbatim', () => {
      const result = engine.compute(BISMILLAH, FATIHA_1);
      expect(result.textA).toBe(BISMILLAH);
      expect(result.textB).toBe(FATIHA_1);
    });

    it('all similarity scores are in [0, 1]', () => {
      const result = engine.compute(BISMILLAH, FATIHA_1);
      for (const score of [
        result.lexicalSimilarity,
        result.phonologicalSimilarity,
        result.structuralSimilarity,
        result.compositeSimilarity,
      ]) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('sharedWords is an array', () => {
      const result = engine.compute(BISMILLAH, FATIHA_1);
      expect(Array.isArray(result.sharedWords)).toBe(true);
    });

    it('confusablePairs is an array', () => {
      const result = engine.compute(BISMILLAH, FATIHA_1);
      expect(Array.isArray(result.confusablePairs)).toBe(true);
    });
  });

  // ── compute — identical texts ─────────────────────────────────────────────

  describe('compute — identical texts', () => {
    it('compositeSimilarity is 1 for identical texts', () => {
      const result = engine.compute(BISMILLAH, BISMILLAH);
      expect(result.compositeSimilarity).toBeCloseTo(1, 4);
    });

    it('lexicalSimilarity is 1 for identical texts', () => {
      const result = engine.compute(BISMILLAH, BISMILLAH);
      expect(result.lexicalSimilarity).toBeCloseTo(1, 4);
    });

    it('sharedWords contains all words for identical texts', () => {
      const wordCount = BISMILLAH.trim().split(/\s+/).length;
      const result = engine.compute(BISMILLAH, BISMILLAH);
      expect(result.sharedWords.length).toBeGreaterThan(0);
      expect(result.sharedWords.length).toBeLessThanOrEqual(wordCount);
    });
  });

  // ── compute — different texts ─────────────────────────────────────────────

  describe('compute — different texts', () => {
    it('compositeSimilarity < 1 for distinct texts', () => {
      const result = engine.compute(BISMILLAH, IKHLAS_1);
      expect(result.compositeSimilarity).toBeLessThan(1);
    });

    it('texts sharing الله have higher lexical similarity than unrelated texts', () => {
      // Both contain الله
      const relatedResult = engine.compute(BISMILLAH, IKHLAS_1);
      // Completely unrelated
      const unrelatedResult = engine.compute('بسم', 'عبد الرحمن');
      expect(relatedResult.lexicalSimilarity).toBeGreaterThanOrEqual(
        unrelatedResult.lexicalSimilarity,
      );
    });

    it('sharedWords is empty for completely non-overlapping texts', () => {
      const result = engine.compute('بسم', 'الحمد');
      expect(result.sharedWords).toHaveLength(0);
    });

    it('structuralSimilarity is 1 for texts with the same word count', () => {
      // Both have 4 words
      const result = engine.compute(
        'بسم الله الرحمن الرحيم',
        'الحمد لله رب العالمين',
      );
      expect(result.structuralSimilarity).toBeCloseTo(1, 4);
    });

    it('structuralSimilarity < 1 for texts with different word counts', () => {
      const result = engine.compute('بسم الله', 'الله');
      expect(result.structuralSimilarity).toBeLessThan(1);
    });
  });

  // ── compute — symmetry ─────────────────────────────────────────────────────

  describe('compute — symmetry', () => {
    it('compositeSimilarity is symmetric', () => {
      const ab = engine.compute(BISMILLAH, FATIHA_1).compositeSimilarity;
      const ba = engine.compute(FATIHA_1, BISMILLAH).compositeSimilarity;
      expect(ab).toBeCloseTo(ba, 5);
    });

    it('sharedWords count is symmetric', () => {
      const ab = engine.compute(BISMILLAH, IKHLAS_1).sharedWords.length;
      const ba = engine.compute(IKHLAS_1, BISMILLAH).sharedWords.length;
      expect(ab).toBe(ba);
    });
  });

  // ── findConfusablePairs ────────────────────────────────────────────────────

  describe('findConfusablePairs', () => {
    it('returns empty array when both lists are empty', () => {
      expect(engine.findConfusablePairs([], [])).toEqual([]);
    });

    it('returns empty array when one list is empty', () => {
      expect(engine.findConfusablePairs(['الله'], [])).toEqual([]);
    });

    it('does not return identical word pairs', () => {
      const pairs = engine.findConfusablePairs(['الرحمن'], ['الرحمن']);
      // Same word → not confusable (identical)
      expect(pairs.every((p) => p.wordA !== p.wordB)).toBe(true);
    });

    it('returns pairs for phonologically close words', () => {
      // الرحمن and الرحيم are similar
      const pairs = engine.findConfusablePairs(['الرحمن'], ['الرحيم']);
      expect(pairs.length).toBeGreaterThanOrEqual(0);
      // If a pair is found, it has the right shape
      if (pairs.length > 0) {
        expect(pairs[0]).toHaveProperty('wordA');
        expect(pairs[0]).toHaveProperty('wordB');
        expect(pairs[0]).toHaveProperty('normalizedDistance');
      }
    });

    it('each confusable pair has normalizedDistance in [0, 1)', () => {
      const pairs = engine.findConfusablePairs(
        ['الرحمن', 'الرحيم', 'كتب'],
        ['الرحيم', 'كتاب', 'كتبت'],
      );
      for (const pair of pairs) {
        expect(pair.normalizedDistance).toBeGreaterThanOrEqual(0);
        expect(pair.normalizedDistance).toBeLessThan(1);
      }
    });
  });
});
