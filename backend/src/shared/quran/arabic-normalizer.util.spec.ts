import { normalizeArabic, tokenizeArabic, wordLevenshtein, wordSimilarity } from './arabic-normalizer.util';

describe('ArabicNormalizerUtil', () => {
  // ── normalizeArabic ─────────────────────────────────────────────────────
  describe('normalizeArabic', () => {
    it('removes tashkeel (harakat)', () => {
      // بِسْمِ → بسم (diacritics stripped)
      expect(normalizeArabic('\u0628\u0650\u0633\u0652\u0645\u0650')).toBe('\u0628\u0633\u0645');
    });

    it('removes tatweel', () => {
      expect(normalizeArabic('ب\u0640سم')).toBe('بسم');
    });

    it('normalizes أ إ آ ٱ → ا', () => {
      expect(normalizeArabic('\u0623')).toBe('\u0627'); // أ → ا
      expect(normalizeArabic('\u0625')).toBe('\u0627'); // إ → ا
      expect(normalizeArabic('\u0622')).toBe('\u0627'); // آ → ا
      expect(normalizeArabic('\u0671')).toBe('\u0627'); // ٱ → ا
    });

    it('normalizes ى → ي', () => {
      expect(normalizeArabic('\u0649')).toBe('\u064A');
    });

    it('normalizes ة → ه', () => {
      expect(normalizeArabic('\u0629')).toBe('\u0647');
    });

    it('normalizes ؤ → و and ئ → ي', () => {
      expect(normalizeArabic('\u0624')).toBe('\u0648');
      expect(normalizeArabic('\u0626')).toBe('\u064A');
    });

    it('normalizes standalone ء → ا', () => {
      expect(normalizeArabic('\u0621')).toBe('\u0627');
    });

    it('removes non-Arabic characters', () => {
      expect(normalizeArabic('بسم الله 123 abc!')).toBe('بسم الله');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeArabic('بسم   الله')).toBe('بسم الله');
    });

    it('trims leading/trailing whitespace', () => {
      expect(normalizeArabic('  بسم  ')).toBe('بسم');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeArabic('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeArabic('   ')).toBe('');
    });

    it('is idempotent (applying twice = once)', () => {
      const text = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      expect(normalizeArabic(normalizeArabic(text))).toBe(normalizeArabic(text));
    });
  });

  // ── tokenizeArabic ─────────────────────────────────────────────────────
  describe('tokenizeArabic', () => {
    it('splits on spaces', () => {
      expect(tokenizeArabic('بسم الله')).toEqual(['بسم', 'الله']);
    });

    it('returns empty array for empty string', () => {
      expect(tokenizeArabic('')).toEqual([]);
    });

    it('applies normalization before splitting', () => {
      // إله (with hamza on alef) should become اله after normalization
      const tokens = tokenizeArabic('\u0625\u0644\u0647');
      expect(tokens[0]).toBe('\u0627\u0644\u0647');
    });
  });

  // ── wordLevenshtein ─────────────────────────────────────────────────────
  describe('wordLevenshtein', () => {
    it('returns 0 for identical arrays', () => {
      expect(wordLevenshtein(['بسم', 'الله'], ['بسم', 'الله'])).toBe(0);
    });

    it('returns array length for completely different arrays', () => {
      expect(wordLevenshtein(['a', 'b'], ['c', 'd'])).toBe(2);
    });

    it('returns 1 for one substitution', () => {
      expect(wordLevenshtein(['بسم', 'الله'], ['بسم', 'الرحمن'])).toBe(1);
    });

    it('returns length of b when a is empty', () => {
      expect(wordLevenshtein([], ['بسم', 'الله'])).toBe(2);
    });

    it('returns length of a when b is empty', () => {
      expect(wordLevenshtein(['بسم', 'الله'], [])).toBe(2);
    });

    it('handles insertion (a shorter than b)', () => {
      // ['بسم'] vs ['بسم', 'الله'] → 1 insertion
      expect(wordLevenshtein(['بسم'], ['بسم', 'الله'])).toBe(1);
    });

    it('handles deletion (a longer than b)', () => {
      expect(wordLevenshtein(['بسم', 'الله'], ['بسم'])).toBe(1);
    });
  });

  // ── wordSimilarity ──────────────────────────────────────────────────────
  describe('wordSimilarity', () => {
    it('returns 1.0 for identical arrays', () => {
      expect(wordSimilarity(['بسم', 'الله'], ['بسم', 'الله'])).toBe(1.0);
    });

    it('returns 1.0 for two empty arrays', () => {
      expect(wordSimilarity([], [])).toBe(1.0);
    });

    it('returns 0 when one array is empty and the other is not', () => {
      expect(wordSimilarity([], ['بسم'])).toBe(0);
      expect(wordSimilarity(['بسم'], [])).toBe(0);
    });

    it('returns 0.5 when half the words differ', () => {
      // ['a', 'b'] vs ['a', 'c'] → edit dist 1, max len 2 → similarity 0.5
      expect(wordSimilarity(['a', 'b'], ['a', 'c'])).toBe(0.5);
    });

    it('returns value in [0, 1]', () => {
      const sim = wordSimilarity(['بسم', 'الله', 'الرحمن'], ['بسم', 'الله']);
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);
    });
  });
});
