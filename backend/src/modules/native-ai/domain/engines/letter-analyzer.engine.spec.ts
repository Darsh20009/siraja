import { LetterAnalyzerEngine } from './letter-analyzer.engine';

describe('LetterAnalyzerEngine', () => {
  let engine: LetterAnalyzerEngine;

  beforeEach(() => {
    engine = new LetterAnalyzerEngine();
  });

  // ── analyze ───────────────────────────────────────────────────────────────

  describe('analyze', () => {
    it('returns undefined for an unknown/non-Arabic character', () => {
      expect(engine.analyze('X')).toBeUndefined();
    });

    it('returns correct properties for ب (Ba)', () => {
      const props = engine.analyze('ب');
      expect(props).toBeDefined();
      expect(props!.name).toBe('Ba');
      expect(props!.makhraj).toBe('both_lips');
      expect(props!.isQalqala).toBe(true);
      expect(props!.isSolar).toBe(false);
      expect(props!.isLunar).toBe(true);
    });

    it('returns correct properties for ت (Ta) — solar, not qalqala', () => {
      const props = engine.analyze('ت');
      expect(props).toBeDefined();
      expect(props!.isSolar).toBe(true);
      expect(props!.isQalqala).toBe(false);
    });

    it('returns correct properties for ن (Noon) — has natural ghunna', () => {
      const props = engine.analyze('ن');
      expect(props).toBeDefined();
      expect(props!.hasNaturalGhunna).toBe(true);
    });

    it('returns correct properties for م (Meem) — has natural ghunna', () => {
      const props = engine.analyze('م');
      expect(props!.hasNaturalGhunna).toBe(true);
    });

    it('returns correct properties for ء (Hamza) — isHamza=true', () => {
      const props = engine.analyze('ء');
      expect(props!.isHamza).toBe(true);
    });

    it('strips diacritics before lookup (بِ → ب)', () => {
      const propsWithDiacritic = engine.analyze('بِ');
      const propsWithout = engine.analyze('ب');
      expect(propsWithDiacritic).toEqual(propsWithout);
    });

    it('returns codepoint as uppercase hex string', () => {
      const props = engine.analyze('ب');
      expect(props!.codepoint).toMatch(/^[0-9A-F]{4}$/);
    });

    it('alef (ا) is a madd letter', () => {
      expect(engine.analyze('ا')!.isMaddLetter).toBe(true);
    });

    it('waw (و) is a madd letter', () => {
      expect(engine.analyze('و')!.isMaddLetter).toBe(true);
    });

    it('yah (ي) is a madd letter', () => {
      expect(engine.analyze('ي')!.isMaddLetter).toBe(true);
    });

    it('ح is an idhar letter', () => {
      expect(engine.analyze('ح')!.isIdharLetter).toBe(true);
    });

    it('ص has heavy (tafkhim) pronunciation', () => {
      expect(engine.analyze('ص')!.tafkhim).toBe('heavy');
    });

    it('ر has contextual tafkhim', () => {
      expect(engine.analyze('ر')!.tafkhim).toBe('contextual');
    });
  });

  // ── isSolar ───────────────────────────────────────────────────────────────

  describe('isSolar', () => {
    const solarLetters = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'];

    it.each(solarLetters)('"%s" is solar', (letter) => {
      expect(engine.isSolar(letter)).toBe(true);
    });

    it('ب is NOT solar', () => {
      expect(engine.isSolar('ب')).toBe(false);
    });

    it('ك is NOT solar', () => {
      expect(engine.isSolar('ك')).toBe(false);
    });

    it('strips diacritics before checking', () => {
      expect(engine.isSolar('نُ')).toBe(true);
    });
  });

  // ── isLunar ───────────────────────────────────────────────────────────────

  describe('isLunar', () => {
    const lunarLetters = ['ب', 'ج', 'ح', 'خ', 'ع', 'غ', 'ف', 'ق', 'ك', 'م', 'ه', 'و', 'ي'];

    it.each(lunarLetters)('"%s" is lunar', (letter) => {
      expect(engine.isLunar(letter)).toBe(true);
    });

    it('ن is NOT lunar', () => {
      expect(engine.isLunar('ن')).toBe(false);
    });

    it('ت is NOT lunar', () => {
      expect(engine.isLunar('ت')).toBe(false);
    });
  });

  // ── isQalqala ─────────────────────────────────────────────────────────────

  describe('isQalqala', () => {
    const qalqalaLetters = ['ق', 'ط', 'ب', 'ج', 'د'];

    it.each(qalqalaLetters)('"%s" is a qalqala letter', (letter) => {
      expect(engine.isQalqala(letter)).toBe(true);
    });

    it('ت is NOT a qalqala letter', () => {
      expect(engine.isQalqala('ت')).toBe(false);
    });

    it('ك is NOT a qalqala letter', () => {
      expect(engine.isQalqala('ك')).toBe(false);
    });

    it('strips diacritics before checking qalqala', () => {
      expect(engine.isQalqala('قُ')).toBe(true);
    });
  });

  // ── isMadd ────────────────────────────────────────────────────────────────

  describe('isMadd', () => {
    it('alef (ا) is a madd letter', () => {
      expect(engine.isMadd('ا')).toBe(true);
    });

    it('waw (و) is a madd letter', () => {
      expect(engine.isMadd('و')).toBe(true);
    });

    it('yah (ي) is a madd letter', () => {
      expect(engine.isMadd('ي')).toBe(true);
    });

    it('ب is NOT a madd letter', () => {
      expect(engine.isMadd('ب')).toBe(false);
    });
  });

  // ── isIdhar ───────────────────────────────────────────────────────────────

  describe('isIdhar', () => {
    const idharLetters = ['ء', 'ه', 'ع', 'غ', 'ح', 'خ'];

    it.each(idharLetters)('"%s" is an idhar letter', (letter) => {
      expect(engine.isIdhar(letter)).toBe(true);
    });

    it('ب is NOT an idhar letter', () => {
      expect(engine.isIdhar('ب')).toBe(false);
    });
  });

  // ── isTafkhim ─────────────────────────────────────────────────────────────

  describe('isTafkhim', () => {
    const tafkhimLetters = ['ص', 'ض', 'ط', 'ظ', 'غ', 'خ', 'ق'];

    it.each(tafkhimLetters)('"%s" is a tafkhim letter', (letter) => {
      expect(engine.isTafkhim(letter)).toBe(true);
    });

    it('ب is NOT a tafkhim letter', () => {
      expect(engine.isTafkhim('ب')).toBe(false);
    });

    it('ن is NOT a tafkhim letter', () => {
      expect(engine.isTafkhim('ن')).toBe(false);
    });
  });

  // ── getTajweedComplexity ──────────────────────────────────────────────────

  describe('getTajweedComplexity', () => {
    it('returns 0 for an empty string', () => {
      expect(engine.getTajweedComplexity('')).toBe(0);
    });

    it('returns 0 for a non-Arabic character', () => {
      expect(engine.getTajweedComplexity('XYZ')).toBe(0);
    });

    it('returns a number between 0 and 100 for a normal word', () => {
      const score = engine.getTajweedComplexity('الرحمن');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('simple letters produce a lower score than emphatic letters', () => {
      // ب ت (complexity 1) vs ص ض (complexity 4)
      const simple = engine.getTajweedComplexity('بت');
      const emphatic = engine.getTajweedComplexity('صض');
      expect(emphatic).toBeGreaterThan(simple);
    });

    it('strips diacritics before scoring', () => {
      const score1 = engine.getTajweedComplexity('الرحمن');
      const score2 = engine.getTajweedComplexity('الرَّحْمَنِ');
      expect(score1).toBe(score2);
    });
  });

  // ── letterFrequency ───────────────────────────────────────────────────────

  describe('letterFrequency', () => {
    it('returns empty map for empty string', () => {
      expect(engine.letterFrequency('').size).toBe(0);
    });

    it('counts single letter correctly', () => {
      const freq = engine.letterFrequency('ب');
      expect(freq.get('ب')).toBe(1);
    });

    it('counts repeated letters', () => {
      const freq = engine.letterFrequency('بب');
      expect(freq.get('ب')).toBe(2);
    });

    it('excludes diacritics from count', () => {
      const freq = engine.letterFrequency('بِسْمِ');
      // Only ب, س, م should be counted — no diacritic entries
      for (const key of freq.keys()) {
        const cp = key.codePointAt(0)!;
        expect(cp).toBeGreaterThanOrEqual(0x0621);
        expect(cp).toBeLessThanOrEqual(0x0671);
      }
    });

    it('counts letters across multiple words', () => {
      const freq = engine.letterFrequency('بب سس');
      expect(freq.get('ب')).toBe(2);
      expect(freq.get('س')).toBe(2);
    });

    it('excludes space characters', () => {
      const freq = engine.letterFrequency('ب س');
      expect(freq.has(' ')).toBe(false);
    });

    it('strips diacritics and counts bare letters', () => {
      const freq = engine.letterFrequency('بِبِ');
      expect(freq.get('ب')).toBe(2);
    });
  });
});
