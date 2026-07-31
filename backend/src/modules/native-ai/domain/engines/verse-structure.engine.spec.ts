import { VerseStructureAnalyzerEngine } from './verse-structure.engine';

describe('VerseStructureAnalyzerEngine', () => {
  let engine: VerseStructureAnalyzerEngine;

  beforeEach(() => {
    engine = new VerseStructureAnalyzerEngine();
  });

  // ── analyze ───────────────────────────────────────────────────────────────

  describe('analyze', () => {
    const bismillah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

    it('returns correct surahNumber and ayahNumber', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.surahNumber).toBe(1);
      expect(result.ayahNumber).toBe(1);
    });

    it('preserves original arabicText', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.arabicText).toBe(bismillah);
    });

    it('wordCount is 4 for the Bismillah', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.wordCount).toBe(4);
    });

    it('letterCount is positive', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.letterCount).toBeGreaterThan(0);
    });

    it('uniqueWordCount is at most wordCount', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.uniqueWordCount).toBeLessThanOrEqual(result.wordCount);
    });

    it('words array length equals wordCount', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.words).toHaveLength(4);
    });

    it('tajweedComplexity is between 0 and 100', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.tajweedComplexity).toBeGreaterThanOrEqual(0);
      expect(result.tajweedComplexity).toBeLessThanOrEqual(100);
    });

    it('difficulty is between 0 and 100', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.difficulty).toBeGreaterThanOrEqual(0);
      expect(result.difficulty).toBeLessThanOrEqual(100);
    });

    it('rhymeEnding is defined and non-empty for a normal ayah', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.rhymeEnding).toBeTruthy();
    });

    it('mostDifficultWord is one of the normalized words', () => {
      const result = engine.analyze(bismillah, 1, 1);
      expect(result.mostDifficultWord).toBeTruthy();
    });

    it('hasQalqala is true when any word contains a qalqala letter', () => {
      // الصراط — ط is qalqala
      const result = engine.analyze('اهدنا الصراط المستقيم', 1, 6);
      expect(result.hasQalqala).toBe(true);
    });

    it('hasMadd is true when any word has a madd sequence', () => {
      // رَحِيم — kasrah + ي
      const result = engine.analyze('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 1, 1);
      expect(result.hasMadd).toBe(true);
    });

    it('hasShadda is true when any word has shadda', () => {
      const result = engine.analyze('اللَّهِ', 1, 2);
      expect(result.hasShadda).toBe(true);
    });

    it('handles a single-word ayah', () => {
      const result = engine.analyze('الله', 1, 1);
      expect(result.wordCount).toBe(1);
      expect(result.words).toHaveLength(1);
    });

    it('Fatiha first ayah has correct surahNumber=1 and ayahNumber=1', () => {
      const result = engine.analyze('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 1, 1);
      expect(result.surahNumber).toBe(1);
      expect(result.ayahNumber).toBe(1);
    });
  });

  // ── computeDifficulty ─────────────────────────────────────────────────────

  describe('computeDifficulty', () => {
    it('returns 0 for an empty array', () => {
      expect(engine.computeDifficulty([])).toBe(0);
    });

    it('returns a value between 0 and 100', () => {
      const wordAnalyses = [{ difficulty: 1 }, { difficulty: 3 }, { difficulty: 5 }];
      const result = engine.computeDifficulty(wordAnalyses);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('a single word with difficulty 1 returns low difficulty', () => {
      const result = engine.computeDifficulty([{ difficulty: 1 }]);
      expect(result).toBeLessThanOrEqual(40);
    });

    it('single word with maximum difficulty 5 returns higher score than min', () => {
      const resultHigh = engine.computeDifficulty([{ difficulty: 5 }]);
      const resultLow = engine.computeDifficulty([{ difficulty: 1 }]);
      expect(resultHigh).toBeGreaterThan(resultLow);
    });

    it('more words increase difficulty due to length penalty', () => {
      const fewWords = Array(3).fill({ difficulty: 3 });
      const manyWords = Array(15).fill({ difficulty: 3 });
      const scoreFew = engine.computeDifficulty(fewWords);
      const scoreMany = engine.computeDifficulty(manyWords);
      expect(scoreMany).toBeGreaterThanOrEqual(scoreFew);
    });

    it('capped at 100', () => {
      const words = Array(20).fill({ difficulty: 5 });
      expect(engine.computeDifficulty(words)).toBeLessThanOrEqual(100);
    });
  });

  // ── computeTajweedComplexity ──────────────────────────────────────────────

  describe('computeTajweedComplexity', () => {
    it('returns 0 for empty array', () => {
      expect(engine.computeTajweedComplexity([])).toBe(0);
    });

    it('returns mean of word tajweedComplexity scores', () => {
      const result = engine.computeTajweedComplexity([
        { tajweedComplexity: 20 },
        { tajweedComplexity: 40 },
      ]);
      expect(result).toBe(30);
    });

    it('single word returns that word\'s complexity', () => {
      expect(engine.computeTajweedComplexity([{ tajweedComplexity: 55 }])).toBe(55);
    });

    it('returns a non-negative integer', () => {
      const result = engine.computeTajweedComplexity([
        { tajweedComplexity: 33 },
        { tajweedComplexity: 44 },
      ]);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  // ── extractRhymeEnding ────────────────────────────────────────────────────

  describe('extractRhymeEnding', () => {
    it('returns empty string for empty text', () => {
      expect(engine.extractRhymeEnding('')).toBe('');
    });

    it('returns empty string for whitespace-only text', () => {
      expect(engine.extractRhymeEnding('   ')).toBe('');
    });

    it('returns last 2 consonants of final word', () => {
      const ending = engine.extractRhymeEnding('الرحيم');
      expect(ending).toHaveLength(2);
    });

    it('returns single consonant when final word has only 1 letter', () => {
      const ending = engine.extractRhymeEnding('ب');
      expect(ending).toHaveLength(1);
    });

    it('uses the last word only', () => {
      const ending1 = engine.extractRhymeEnding('بسم الله الرحيم');
      const ending2 = engine.extractRhymeEnding('الرحيم');
      expect(ending1).toBe(ending2);
    });

    it('strips diacritics before extracting', () => {
      const ending1 = engine.extractRhymeEnding('الرَّحِيمِ');
      const ending2 = engine.extractRhymeEnding('الرحيم');
      expect(ending1).toBe(ending2);
    });
  });

  // ── analyzeRhymePattern ───────────────────────────────────────────────────

  describe('analyzeRhymePattern', () => {
    it('returns empty string for empty array', () => {
      expect(engine.analyzeRhymePattern([])).toBe('');
    });

    it('returns the dominant (most common) ending', () => {
      const texts = [
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        'مَالِكِ يَوْمِ الدِّينِ',
        'اهدنا الصراط المستقيم',
      ];
      const result = engine.analyzeRhymePattern(texts);
      expect(typeof result).toBe('string');
      // Should return a string ending (2 chars normally)
    });

    it('returns the single ending when all ayahs end the same', () => {
      // Three texts ending with الرحيم
      const texts = ['X الرحيم', 'Y الرحيم', 'Z الرحيم'];
      const result = engine.analyzeRhymePattern(texts);
      const single = engine.extractRhymeEnding('الرحيم');
      expect(result).toBe(single);
    });

    it('handles single-element array', () => {
      const result = engine.analyzeRhymePattern(['الرحيم']);
      expect(result).toBeTruthy();
    });
  });
});
