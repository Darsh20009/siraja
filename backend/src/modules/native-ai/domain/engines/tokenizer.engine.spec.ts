import { TokenizerEngine } from './tokenizer.engine';

describe('TokenizerEngine', () => {
  let engine: TokenizerEngine;

  beforeEach(() => {
    engine = new TokenizerEngine();
  });

  // ── splitWords ────────────────────────────────────────────────────────────

  describe('splitWords', () => {
    it('returns empty array for empty string', () => {
      expect(engine.splitWords('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(engine.splitWords('   ')).toEqual([]);
    });

    it('splits a single word', () => {
      expect(engine.splitWords('الله')).toEqual(['الله']);
    });

    it('splits multiple words on single spaces', () => {
      expect(engine.splitWords('بسم الله الرحمن')).toEqual(['بسم', 'الله', 'الرحمن']);
    });

    it('collapses multiple whitespace characters', () => {
      expect(engine.splitWords('بسم  الله')).toEqual(['بسم', 'الله']);
    });

    it('trims leading/trailing whitespace', () => {
      expect(engine.splitWords('  الرحيم  ')).toEqual(['الرحيم']);
    });

    it('splits the Bismillah correctly into 4 words', () => {
      const result = engine.splitWords('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      expect(result).toHaveLength(4);
    });
  });

  // ── tokenize ──────────────────────────────────────────────────────────────

  describe('tokenize', () => {
    it('returns empty array for empty string', () => {
      expect(engine.tokenize('')).toEqual([]);
    });

    it('tokenizes a single Arabic word', () => {
      const tokens = engine.tokenize('الله');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].text).toBe('الله');
      expect(tokens[0].position).toBe(0);
    });

    it('preserves original text with diacritics', () => {
      const tokens = engine.tokenize('بِسْمِ');
      expect(tokens[0].text).toBe('بِسْمِ');
    });

    it('produces normalized form without diacritics', () => {
      const tokens = engine.tokenize('بِسْمِ');
      expect(tokens[0].normalized).toBe('بسم');
    });

    it('assigns sequential position indices', () => {
      const tokens = engine.tokenize('بسم الله الرحمن الرحيم');
      expect(tokens.map((t) => t.position)).toEqual([0, 1, 2, 3]);
    });

    it('tokenizes the full Bismillah into 4 tokens', () => {
      const tokens = engine.tokenize('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      expect(tokens).toHaveLength(4);
    });

    it('each token has a morphemes object with at least a stem', () => {
      const tokens = engine.tokenize('الرحمن');
      expect(tokens[0].morphemes).toBeDefined();
      expect(tokens[0].morphemes.stem).toBeTruthy();
    });

    it('letterCount is positive for normal Arabic words', () => {
      const tokens = engine.tokenize('الرحيم');
      expect(tokens[0].letterCount).toBeGreaterThan(0);
    });
  });

  // ── tokenizeAyah ──────────────────────────────────────────────────────────

  describe('tokenizeAyah', () => {
    it('enriches tokens with surahNumber, ayahNumber, wordIndex', () => {
      const tokens = engine.tokenizeAyah('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 1, 1);
      expect(tokens).toHaveLength(4);
      tokens.forEach((t, i) => {
        expect(t.surahNumber).toBe(1);
        expect(t.ayahNumber).toBe(1);
        expect(t.wordIndex).toBe(i);
      });
    });

    it('assigns different surah coordinates correctly', () => {
      const tokens = engine.tokenizeAyah('الحمد لله', 2, 5);
      expect(tokens[0].surahNumber).toBe(2);
      expect(tokens[0].ayahNumber).toBe(5);
    });

    it('wordIndex matches position for single word', () => {
      const tokens = engine.tokenizeAyah('الله', 114, 1);
      expect(tokens[0].wordIndex).toBe(0);
    });

    it('still returns text and normalized fields', () => {
      const tokens = engine.tokenizeAyah('اللَّهِ', 1, 2);
      expect(tokens[0].text).toBe('اللَّهِ');
      expect(tokens[0].normalized).toBeTruthy();
    });
  });

  // ── splitMorphemes ────────────────────────────────────────────────────────

  describe('splitMorphemes', () => {
    it('returns only stem for a particle', () => {
      // 'في' is in PARTICLES
      const result = engine.splitMorphemes('في');
      expect(result.stem).toBe('في');
      expect(result.prefix).toBeUndefined();
      expect(result.suffix).toBeUndefined();
    });

    it('returns only stem for a short particle', () => {
      const result = engine.splitMorphemes('من');
      expect(result.stem).toBeDefined();
      expect(result.prefix).toBeUndefined();
      expect(result.suffix).toBeUndefined();
    });

    it('strips known prefix "ال" from الرحمن', () => {
      const result = engine.splitMorphemes('الرحمن');
      expect(result.prefix).toBe('ال');
      expect(result.stem).toBe('رحمن');
    });

    it('strips known suffix "هم" from wordهم', () => {
      // construct a long enough word with a suffix
      const result = engine.splitMorphemes('كتابهم');
      expect(result.suffix).toBe('هم');
    });

    it('returns stem only when no prefix/suffix match', () => {
      const result = engine.splitMorphemes('قرأ');
      expect(result.stem).toBeTruthy();
      // For a 3-letter word with no matching prefix/suffix
    });

    it('handles word with diacritics by normalising first', () => {
      const result = engine.splitMorphemes('اَلرَّحْمَنِ');
      expect(result.stem).toBeTruthy();
    });
  });

  // ── Token type classification ─────────────────────────────────────────────

  describe('token type classification', () => {
    it('classifies a normal multi-letter word as "word"', () => {
      const tokens = engine.tokenize('الرحمن');
      expect(tokens[0].type).toBe('word');
    });

    it('classifies a particle (في) as "particle"', () => {
      const tokens = engine.tokenize('في');
      expect(tokens[0].type).toBe('particle');
    });

    it('classifies a very short word (1–2 letters) as "particle"', () => {
      const tokens = engine.tokenize('من');
      expect(tokens[0].type).toBe('particle');
    });

    it('classifies Arabic-Indic digits as "number"', () => {
      // Arabic-Indic digit ٣
      const tokens = engine.tokenize('\u0663');
      expect(tokens[0].type).toBe('number');
    });

    it('classifies ASCII digits as "number"', () => {
      const tokens = engine.tokenize('123');
      expect(tokens[0].type).toBe('number');
    });
  });

  // ── normalise (public-accessible via splitMorphemes) ──────────────────────

  describe('normalise (internal via tokenize output)', () => {
    it('strips diacritics from normalized field', () => {
      const tokens = engine.tokenize('بِسْمِ');
      // Should not contain harakat
      expect(tokens[0].normalized).not.toMatch(/[\u064B-\u065F]/);
    });

    it('normalises alef variants to bare alef', () => {
      // أ → ا
      const tokens = engine.tokenize('أَصْحَاب');
      expect(tokens[0].normalized).toMatch(/^ا/);
    });

    it('removes tatweel (kashida)', () => {
      // word with kashida \u0640
      const tokens = engine.tokenize('الله\u0640');
      expect(tokens[0].normalized).not.toContain('\u0640');
    });
  });
});
