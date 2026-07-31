import { NormalizationEngine } from './normalization.engine';

describe('NormalizationEngine', () => {
  let engine: NormalizationEngine;

  beforeEach(() => {
    engine = new NormalizationEngine();
  });

  // ── stripDiacritics ───────────────────────────────────────────────────────

  describe('stripDiacritics', () => {
    it('returns empty string unchanged', () => {
      expect(engine.stripDiacritics('')).toBe('');
    });

    it('removes fathah (U+064E)', () => {
      expect(engine.stripDiacritics('بَ')).toBe('ب');
    });

    it('removes kasrah (U+0650)', () => {
      expect(engine.stripDiacritics('بِ')).toBe('ب');
    });

    it('removes dammah (U+064F)', () => {
      expect(engine.stripDiacritics('بُ')).toBe('ب');
    });

    it('removes shadda (U+0651)', () => {
      expect(engine.stripDiacritics('ٱللَّه')).not.toContain('\u0651');
    });

    it('strips all diacritics from Bismillah', () => {
      const result = engine.stripDiacritics('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      expect(result).not.toMatch(/[\u064B-\u065F\u0670]/);
    });

    it('keeps letter characters intact', () => {
      const result = engine.stripDiacritics('بِسْمِ');
      expect(result).toBe('بسم');
    });

    it('strips tanwin (double fathah U+064B)', () => {
      // كِتَابٍ — tanwin kasra (no trailing alef)
      expect(engine.stripDiacritics('كِتَابٍ')).toBe('كتاب');
    });
  });

  // ── stripTatweel ──────────────────────────────────────────────────────────

  describe('stripTatweel', () => {
    it('removes kashida/tatweel character (U+0640)', () => {
      expect(engine.stripTatweel('الله\u0640')).toBe('الله');
    });

    it('removes multiple kashidas', () => {
      expect(engine.stripTatweel('ال\u0640\u0640ه')).toBe('اله');
    });

    it('leaves non-tatweel text unchanged', () => {
      expect(engine.stripTatweel('الله')).toBe('الله');
    });
  });

  // ── normalizeAlef ─────────────────────────────────────────────────────────

  describe('normalizeAlef', () => {
    it('converts alef with hamza above (أ U+0623) to bare alef (ا)', () => {
      expect(engine.normalizeAlef('أحمد')).toBe('احمد');
    });

    it('converts alef with hamza below (إ U+0625) to bare alef', () => {
      expect(engine.normalizeAlef('إسلام')).toBe('اسلام');
    });

    it('converts alef with madda (آ U+0622) to bare alef', () => {
      expect(engine.normalizeAlef('آمن')).toBe('امن');
    });

    it('converts alef wasla (ٱ U+0671) to bare alef', () => {
      expect(engine.normalizeAlef('ٱللَّهِ')).toBe('اللَّهِ');
    });

    it('leaves bare alef unchanged', () => {
      expect(engine.normalizeAlef('الله')).toBe('الله');
    });
  });

  // ── normalizeTaMarbutah ───────────────────────────────────────────────────

  describe('normalizeTaMarbutah', () => {
    it('converts tah marbuta (ة U+0629) to hah (ه U+0647)', () => {
      expect(engine.normalizeTaMarbutah('رحمة')).toBe('رحمه');
    });

    it('converts multiple tah marbuta occurrences', () => {
      expect(engine.normalizeTaMarbutah('نعمة رحمة')).toBe('نعمه رحمه');
    });

    it('leaves text without tah marbuta unchanged', () => {
      expect(engine.normalizeTaMarbutah('الرحمن')).toBe('الرحمن');
    });
  });

  // ── normalizeAlefMaqsura ──────────────────────────────────────────────────

  describe('normalizeAlefMaqsura', () => {
    it('converts alef maqsura (ى U+0649) to yah (ي U+064A)', () => {
      expect(engine.normalizeAlefMaqsura('على')).toBe('علي');
    });

    it('handles multiple occurrences', () => {
      expect(engine.normalizeAlefMaqsura('مصطفى وعيسى')).toBe('مصطفي وعيسي');
    });

    it('leaves text without alef maqsura unchanged', () => {
      expect(engine.normalizeAlefMaqsura('الله')).toBe('الله');
    });
  });

  // ── toSearchForm ──────────────────────────────────────────────────────────

  describe('toSearchForm', () => {
    it('strips diacritics', () => {
      const result = engine.toSearchForm('بِسْمِ');
      expect(result).not.toMatch(/[\u064B-\u065F]/);
    });

    it('normalizes alef variants to bare alef', () => {
      const result = engine.toSearchForm('أَصْحَاب');
      expect(result.charAt(0)).toBe('ا');
    });

    it('normalizes alef maqsura to yah', () => {
      const result = engine.toSearchForm('على');
      expect(result).toBe('علي');
    });

    it('removes tatweel', () => {
      const result = engine.toSearchForm('الله\u0640');
      expect(result).not.toContain('\u0640');
    });

    it('trims leading/trailing whitespace', () => {
      expect(engine.toSearchForm('  الله  ')).toBe('الله');
    });

    it('transforms Bismillah to bare consonants only', () => {
      const result = engine.toSearchForm('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      expect(result).not.toMatch(/[\u064B-\u065F\u0670]/);
      expect(result).toContain('بسم');
    });
  });

  // ── toRootForm ────────────────────────────────────────────────────────────

  describe('toRootForm', () => {
    it('converts tah marbuta to hah in addition to search-form normalisation', () => {
      const result = engine.toRootForm('رحمة');
      expect(result).toBe('رحمه');
    });

    it('also strips diacritics and normalises alef', () => {
      const result = engine.toRootForm('إِسْلَام');
      expect(result).not.toMatch(/[\u064B-\u065F]/);
      expect(result.charAt(0)).toBe('ا');
    });

    it('leaves words without tah marbuta unchanged vs searchForm', () => {
      expect(engine.toRootForm('الله')).toBe(engine.toSearchForm('الله'));
    });
  });

  // ── toFlatForm ────────────────────────────────────────────────────────────

  describe('toFlatForm', () => {
    it('strips hamza (ء U+0621) to bare alef', () => {
      const result = engine.toFlatForm('ءامن');
      expect(result.charAt(0)).toBe('ا');
    });

    it('strips hamza with chair (أ) to bare alef', () => {
      const result = engine.toFlatForm('أمر');
      expect(result.charAt(0)).toBe('ا');
    });

    it('applies all root-form transformations plus hamza strip', () => {
      const result = engine.toFlatForm('رَحْمَةً');
      // diacritics stripped, tah marbuta → hah, hamza normalised
      expect(result).not.toMatch(/[\u064B-\u065F]/);
    });

    it('does not change text that already has no special chars', () => {
      expect(engine.toFlatForm('كتب')).toBe('كتب');
    });
  });

  // ── expandShadda ──────────────────────────────────────────────────────────

  describe('expandShadda', () => {
    it('doubles the consonant before shadda (bare text)', () => {
      // شدّة (no other diacritics): د + shadda → دد
      const result = engine.expandShadda('شد\u0651ة');
      // The daal should appear twice in a row
      expect(result).toMatch(/دد/);
    });

    it('handles text with no shadda unchanged', () => {
      expect(engine.expandShadda('كتب')).toBe('كتب');
    });

    it('handles empty string', () => {
      expect(engine.expandShadda('')).toBe('');
    });

    it('handles word starting with shadda safely (no preceding letter)', () => {
      // Shadda at position 0 — should not crash
      expect(() => engine.expandShadda('\u0651ب')).not.toThrow();
    });
  });

  // ── diacriticInventory ────────────────────────────────────────────────────

  describe('diacriticInventory', () => {
    it('returns empty map for text with no diacritics', () => {
      expect(engine.diacriticInventory('الله').size).toBe(0);
    });

    it('counts fathah correctly', () => {
      // بَبَ — two fathah marks
      const inv = engine.diacriticInventory('بَبَ');
      expect(inv.get('\u064E')).toBe(2);
    });

    it('counts shadda correctly', () => {
      const inv = engine.diacriticInventory('اللَّه');
      expect(inv.get('\u0651')).toBe(1);
    });

    it('counts multiple diacritic types', () => {
      // فَتْحٌ: fathah × 2, sukun × 1, tanwin damm × 1
      const inv = engine.diacriticInventory('فَتْحٌ');
      expect(inv.size).toBeGreaterThan(1);
    });

    it('returns Map<string, number> with correct types', () => {
      const inv = engine.diacriticInventory('بِسْمِ');
      for (const [k, v] of inv) {
        expect(typeof k).toBe('string');
        expect(typeof v).toBe('number');
      }
    });
  });

  // ── normalizeAll ──────────────────────────────────────────────────────────

  describe('normalizeAll', () => {
    it('produces all five fields', () => {
      const result = engine.normalizeAll('رَحْمَةٌ');
      expect(result.original).toBe('رَحْمَةٌ');
      expect(result.diacriticsStripped).toBeTruthy();
      expect(result.searchForm).toBeTruthy();
      expect(result.rootForm).toBeTruthy();
      expect(result.flatForm).toBeTruthy();
    });

    it('original is preserved verbatim', () => {
      const text = 'بِسْمِ اللَّهِ';
      expect(engine.normalizeAll(text).original).toBe(text);
    });

    it('rootForm contains hah where tah marbuta was', () => {
      const result = engine.normalizeAll('رحمة');
      expect(result.rootForm).toContain('ه');
      expect(result.rootForm).not.toContain('ة');
    });

    it('flatForm has no hamza variants', () => {
      const result = engine.normalizeAll('أسماء');
      expect(result.flatForm).not.toMatch(/[\u0621\u0623\u0625\u0624\u0626]/);
    });

    it('diacriticsStripped still keeps non-diacritic characters', () => {
      const result = engine.normalizeAll('بِسْمِ');
      expect(result.diacriticsStripped).toContain('بسم');
    });
  });
});
