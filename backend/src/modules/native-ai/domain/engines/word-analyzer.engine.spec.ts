import { WordAnalyzerEngine } from './word-analyzer.engine';

describe('WordAnalyzerEngine', () => {
  let engine: WordAnalyzerEngine;

  beforeEach(() => {
    engine = new WordAnalyzerEngine();
  });

  // ── analyze ───────────────────────────────────────────────────────────────

  describe('analyze', () => {
    it('returns the original word in the "word" field', () => {
      const result = engine.analyze('الله');
      expect(result.word).toBe('الله');
    });

    it('normalized is diacritic-free', () => {
      const result = engine.analyze('بِسْمِ');
      expect(result.normalized).not.toMatch(/[\u064B-\u065F]/);
    });

    it('letterCount is positive for a normal word', () => {
      expect(engine.analyze('الرحمن').letterCount).toBeGreaterThan(0);
    });

    it('syllableEstimate is at least 1', () => {
      expect(engine.analyze('الله').syllableEstimate).toBeGreaterThanOrEqual(1);
    });

    it('morphemes has a stem', () => {
      expect(engine.analyze('الرحمن').morphemes.stem).toBeTruthy();
    });

    it('tajweedComplexity is between 0 and 100', () => {
      const result = engine.analyze('الصراط');
      expect(result.tajweedComplexity).toBeGreaterThanOrEqual(0);
      expect(result.tajweedComplexity).toBeLessThanOrEqual(100);
    });

    it('difficulty is between 1 and 5', () => {
      const result = engine.analyze('الرحيم');
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(5);
    });

    it('analyzes a diacriticsed Quran word correctly', () => {
      const result = engine.analyze('الرَّحْمَٰنِ');
      expect(result.word).toBe('الرَّحْمَٰنِ');
      expect(result.letterCount).toBeGreaterThan(0);
    });
  });

  // ── analyzeText ───────────────────────────────────────────────────────────

  describe('analyzeText', () => {
    it('returns empty array for empty string', () => {
      expect(engine.analyzeText('')).toEqual([]);
    });

    it('returns one analysis per word', () => {
      const results = engine.analyzeText('بسم الله الرحمن الرحيم');
      expect(results).toHaveLength(4);
    });

    it('each item has correct word field', () => {
      const results = engine.analyzeText('بسم الله');
      expect(results[0].word).toBe('بسم');
      expect(results[1].word).toBe('الله');
    });

    it('trims and handles extra whitespace', () => {
      const results = engine.analyzeText('  بسم   الله  ');
      expect(results).toHaveLength(2);
    });
  });

  // ── estimateDifficulty ────────────────────────────────────────────────────

  describe('estimateDifficulty', () => {
    it('returns a value between 1 and 5 for any Arabic word', () => {
      const words = ['ب', 'الله', 'المستقيم', 'الصراط'];
      for (const w of words) {
        const d = engine.estimateDifficulty(w);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
      }
    });

    it('single letter returns 1 (lowest difficulty)', () => {
      expect(engine.estimateDifficulty('ب')).toBe(1);
    });

    it('accepts pre-computed letterCount and tajweedComplexity', () => {
      const d = engine.estimateDifficulty('الله', 4, 10);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
    });

    it('a word with emphatic letters has higher difficulty than simple letters', () => {
      const simple = engine.estimateDifficulty('بت');
      const emphatic = engine.estimateDifficulty('صضط');
      expect(emphatic).toBeGreaterThanOrEqual(simple);
    });
  });

  // ── estimateSyllables ─────────────────────────────────────────────────────

  describe('estimateSyllables', () => {
    it('returns at least 1 for any word', () => {
      expect(engine.estimateSyllables('الله')).toBeGreaterThanOrEqual(1);
    });

    it('returns at least 1 for a word with no vowel markers', () => {
      expect(engine.estimateSyllables('كتب')).toBeGreaterThanOrEqual(1);
    });

    it('counts short vowels (fathah/kasrah/dammah)', () => {
      // بَسَمَ — 3 fathah → 3 syllables
      expect(engine.estimateSyllables('بَسَمَ')).toBe(3);
    });

    it('contributes long vowel count to syllable total', () => {
      // word with long vowels via madd letters
      const withLong = engine.estimateSyllables('كَاتِبُ');
      expect(withLong).toBeGreaterThanOrEqual(2);
    });
  });

  // ── hasQalqala ────────────────────────────────────────────────────────────

  describe('hasQalqala', () => {
    it('returns true for a word containing ق', () => {
      expect(engine.hasQalqala('قرأ')).toBe(true);
    });

    it('returns true for a word containing ط', () => {
      expect(engine.hasQalqala('طريق')).toBe(true);
    });

    it('returns true for a word containing ب', () => {
      expect(engine.hasQalqala('بسم')).toBe(true);
    });

    it('returns true for a word containing ج', () => {
      expect(engine.hasQalqala('جاء')).toBe(true);
    });

    it('returns true for a word containing د', () => {
      expect(engine.hasQalqala('دين')).toBe(true);
    });

    it('returns false for a word with no qalqala letters', () => {
      expect(engine.hasQalqala('الرحمن')).toBe(false);
    });
  });

  // ── hasMadd ───────────────────────────────────────────────────────────────

  describe('hasMadd', () => {
    it('returns true when short vowel precedes alef (fathah + alef)', () => {
      // كَاتِب: fathah + ا
      expect(engine.hasMadd('كَاتِب')).toBe(true);
    });

    it('returns true when short vowel precedes waw (dammah + و)', () => {
      // نُور: dammah + و
      expect(engine.hasMadd('نُور')).toBe(true);
    });

    it('returns true when short vowel precedes yah (kasrah + ي)', () => {
      // رَحِيم: kasrah + ي
      expect(engine.hasMadd('رَحِيم')).toBe(true);
    });

    it('returns false when no short-vowel + madd-letter sequence', () => {
      expect(engine.hasMadd('كتب')).toBe(false);
    });
  });

  // ── hasGhunna ─────────────────────────────────────────────────────────────

  describe('hasGhunna', () => {
    it('returns true when noon has shadda (نّ)', () => {
      // نِعمة with noon-shadda
      expect(engine.hasGhunna('إِنَّ')).toBe(true);
    });

    it('returns true when meem has shadda (مّ)', () => {
      expect(engine.hasGhunna('ثُمَّ')).toBe(true);
    });

    it('returns false for a word with no noon/meem shadda', () => {
      expect(engine.hasGhunna('الله')).toBe(false);
    });
  });

  // ── hasShadda ─────────────────────────────────────────────────────────────

  describe('hasShadda', () => {
    it('returns true when word contains shadda (U+0651)', () => {
      expect(engine.hasShadda('اللَّه')).toBe(true);
    });

    it('returns false when word has no shadda', () => {
      expect(engine.hasShadda('الله')).toBe(false);
    });

    it('returns false for plain Arabic without diacritics', () => {
      expect(engine.hasShadda('كتاب')).toBe(false);
    });
  });

  // ── hasHamza ──────────────────────────────────────────────────────────────

  describe('hasHamza', () => {
    it('returns true for a word starting with hamza (أ)', () => {
      expect(engine.hasHamza('أحمد')).toBe(true);
    });

    it('returns true for a word with hamza-below (إ)', () => {
      expect(engine.hasHamza('إسلام')).toBe(true);
    });

    it('returns true for a word with standalone hamza (ء)', () => {
      expect(engine.hasHamza('شاء')).toBe(true);
    });

    it('returns true for alef-madda (آ)', () => {
      expect(engine.hasHamza('آمن')).toBe(true);
    });

    it('returns false for a word with no hamza', () => {
      expect(engine.hasHamza('الرحمن')).toBe(false);
    });
  });
});
