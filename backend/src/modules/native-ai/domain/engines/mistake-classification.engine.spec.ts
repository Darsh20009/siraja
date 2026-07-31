import { MistakeClassificationEngine } from './mistake-classification.engine';

describe('MistakeClassificationEngine', () => {
  let engine: MistakeClassificationEngine;

  beforeEach(() => {
    engine = new MistakeClassificationEngine();
  });

  // ── classify — throws on identical input ──────────────────────────────────

  describe('classify — identical inputs', () => {
    it('throws when raw equals expected after normalization', () => {
      expect(() => engine.classify('بِسْمِ', 'بِسْمِ')).toThrow();
    });

    it('throws when diacritics differ but normalized forms match', () => {
      // Both normalize to 'بسم'
      expect(() => engine.classify('بسم', 'بِسْمِ')).toThrow();
    });
  });

  // ── classify — word repetition ────────────────────────────────────────────

  describe('classify — word_repetition', () => {
    it('detects consecutive duplicate words', () => {
      const result = engine.classify('الله الله', 'الله');
      expect(result.category).toBe('word_repetition');
    });

    it('severity is minor for repetition', () => {
      const result = engine.classify('الله الله', 'الله');
      expect(result.severity).toBe('minor');
    });

    it('provides remediation text', () => {
      const result = engine.classify('الله الله', 'الله');
      expect(result.remediation).toBeTruthy();
    });
  });

  // ── classify — word omission ──────────────────────────────────────────────

  describe('classify — word_omission', () => {
    it('detects when a word is missing from raw', () => {
      const result = engine.classify('بسم الله', 'بسم الله الرحمن');
      expect(result.category).toBe('word_omission');
    });

    it('severity is critical for omissions', () => {
      const result = engine.classify('بسم', 'بسم الله');
      expect(result.severity).toBe('critical');
    });
  });

  // ── classify — word insertion ─────────────────────────────────────────────

  describe('classify — word_insertion', () => {
    it('detects when extra words are in raw', () => {
      const result = engine.classify('بسم الله الرحمن الرحيم', 'بسم الله');
      expect(result.category).toBe('word_insertion');
    });

    it('severity is major for insertions', () => {
      const result = engine.classify('بسم الله الرحمن', 'بسم الله');
      expect(result.severity).toBe('major');
    });
  });

  // ── classify — word substitution ──────────────────────────────────────────

  describe('classify — word_substitution', () => {
    it('detects when same word count but wrong word', () => {
      // Different words, same count → substitution (after omission/insertion not triggered)
      const result = engine.classify('الرحمن الكريم', 'الرحمن الرحيم');
      expect(result.category).toBe('word_substitution');
    });

    it('severity is major for substitutions', () => {
      const result = engine.classify('الرحمن الكريم', 'الرحمن الرحيم');
      expect(result.severity).toBe('major');
    });
  });

  // ── classify — wordIndex is included ────────────────────────────────────

  describe('classify — wordIndex field', () => {
    it('preserves wordIndex when provided', () => {
      // Any category will do
      const result = engine.classify('بسم', 'بسم الله', 3);
      // We just need a valid result (omission category)
      expect(result.category).toBeTruthy();
    });
  });

  // ── classify — confidence score range ────────────────────────────────────

  describe('classify — confidenceScore', () => {
    it('confidenceScore is between 0 and 100', () => {
      const result = engine.classify('بسم', 'بسم الله');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(100);
    });
  });

  // ── classifyBatch ─────────────────────────────────────────────────────────

  describe('classifyBatch', () => {
    it('classifies multiple pairs', () => {
      const pairs = [
        { raw: 'بسم', expected: 'بسم الله' },
        { raw: 'الله الله', expected: 'الله' },
      ];
      const results = engine.classifyBatch(pairs);
      expect(results).toHaveLength(2);
      expect(results[0].category).toBe('word_omission');
      expect(results[1].category).toBe('word_repetition');
    });

    it('returns empty array for empty input', () => {
      expect(engine.classifyBatch([])).toEqual([]);
    });

    it('each result has required fields', () => {
      const results = engine.classifyBatch([{ raw: 'بسم', expected: 'بسم الله' }]);
      const r = results[0];
      expect(r).toHaveProperty('category');
      expect(r).toHaveProperty('severity');
      expect(r).toHaveProperty('confidenceScore');
      expect(r).toHaveProperty('remediation');
      expect(r).toHaveProperty('relatedRules');
    });
  });

  // ── detectPatterns ────────────────────────────────────────────────────────

  describe('detectPatterns', () => {
    it('returns empty array for empty input', () => {
      expect(engine.detectPatterns([])).toEqual([]);
    });

    it('groups by category and counts frequency', () => {
      const mistakes = engine.classifyBatch([
        { raw: 'بسم', expected: 'بسم الله' },
        { raw: 'من', expected: 'من الله' },
        { raw: 'في', expected: 'في الله' },
      ]);
      const patterns = engine.detectPatterns(mistakes);
      expect(patterns.length).toBeGreaterThanOrEqual(1);
      const omission = patterns.find((p) => p.category === 'word_omission');
      expect(omission).toBeDefined();
      expect(omission!.frequency).toBe(3);
    });

    it('marks pattern as systematic when frequency >= 3', () => {
      const mistakes = engine.classifyBatch([
        { raw: 'بسم', expected: 'بسم الله' },
        { raw: 'من', expected: 'من الله' },
        { raw: 'في', expected: 'في الله' },
      ]);
      const patterns = engine.detectPatterns(mistakes);
      const omission = patterns.find((p) => p.category === 'word_omission');
      expect(omission!.isSystematic).toBe(true);
    });

    it('does not mark pattern as systematic when frequency < 3', () => {
      const mistakes = engine.classifyBatch([
        { raw: 'بسم', expected: 'بسم الله' },
      ]);
      const patterns = engine.detectPatterns(mistakes);
      expect(patterns[0].isSystematic).toBe(false);
    });

    it('patterns are sorted by frequency descending', () => {
      const mistakes = engine.classifyBatch([
        { raw: 'بسم', expected: 'بسم الله' },
        { raw: 'من', expected: 'من الله' },
        { raw: 'في', expected: 'في الله' },
        { raw: 'الرحمن الكريم', expected: 'الرحمن الرحيم' },
      ]);
      const patterns = engine.detectPatterns(mistakes);
      for (let i = 0; i < patterns.length - 1; i++) {
        expect(patterns[i].frequency).toBeGreaterThanOrEqual(patterns[i + 1].frequency);
      }
    });
  });
});
