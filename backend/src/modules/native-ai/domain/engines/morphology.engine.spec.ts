import { MorphologyEngine } from './morphology.engine';

describe('MorphologyEngine', () => {
  let engine: MorphologyEngine;

  beforeEach(() => {
    engine = new MorphologyEngine();
  });

  // ── isParticle ────────────────────────────────────────────────────────────

  describe('isParticle', () => {
    it('returns true for "في" (in)', () => {
      expect(engine.isParticle('في')).toBe(true);
    });

    it('returns true for "من" (from)', () => {
      expect(engine.isParticle('من')).toBe(true);
    });

    it('returns true for "عن" (about)', () => {
      expect(engine.isParticle('عن')).toBe(true);
    });

    it('returns true for "مع" (with)', () => {
      expect(engine.isParticle('مع')).toBe(true);
    });

    it('returns false for a regular word', () => {
      expect(engine.isParticle('كتاب')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(engine.isParticle('')).toBe(false);
    });
  });

  // ── isVerb ────────────────────────────────────────────────────────────────

  describe('isVerb', () => {
    it('returns true for a simple 3-letter verb like "كتب"', () => {
      expect(engine.isVerb('كتب')).toBe(true);
    });

    it('returns true for a 3-letter verb with diacritics', () => {
      expect(engine.isVerb('قَرَأَ')).toBe(true);
    });

    it('returns false for a known particle', () => {
      expect(engine.isVerb('في')).toBe(false);
    });
  });

  // ── isNoun ────────────────────────────────────────────────────────────────

  describe('isNoun', () => {
    it('returns true for a word ending in tah marbuta (رحمة)', () => {
      expect(engine.isNoun('رحمة')).toBe(true);
    });

    it('returns true for a word starting with م (مكتبة)', () => {
      expect(engine.isNoun('مكتبة')).toBe(true);
    });

    it('returns true for a word starting with م (مكاتب — 5 letters)', () => {
      expect(engine.isNoun('مكاتب')).toBe(true);
    });

    it('returns false for a short 3-letter verb stem', () => {
      // 3-letter stems match verb pattern in matchesVerbalPattern
      expect(engine.isNoun('كتب')).toBe(false);
    });
  });

  // ── analyze — particle ────────────────────────────────────────────────────

  describe('analyze — particle', () => {
    it('returns isParticle=true for "في"', () => {
      const result = engine.analyze('في');
      expect(result.isParticle).toBe(true);
      expect(result.isVerb).toBe(false);
      expect(result.isNoun).toBe(false);
    });

    it('wordClass is "particle" for known particles', () => {
      const result = engine.analyze('من');
      expect(result.wordClass).toBe('particle');
    });

    it('morphemes contains only stem for a particle', () => {
      const result = engine.analyze('في');
      expect(result.morphemes.stem).toBe('في');
      expect(result.morphemes.prefix).toBeUndefined();
      expect(result.morphemes.suffix).toBeUndefined();
    });

    it('original is preserved', () => {
      const result = engine.analyze('فِي');
      expect(result.original).toBe('فِي');
    });

    it('rootLength is 0 for particles', () => {
      expect(engine.analyze('في').rootLength).toBe(0);
    });
  });

  // ── analyze — verb ────────────────────────────────────────────────────────

  describe('analyze — verb form', () => {
    it('returns isVerb=true for a 3-letter verb "كتب"', () => {
      const result = engine.analyze('كتب');
      expect(result.isVerb).toBe(true);
    });

    it('wordClass is "verb" for 3-letter stems', () => {
      expect(engine.analyze('قرأ').wordClass).toBe('verb');
    });

    it('rootLength is 3 for a plain 3-letter verb', () => {
      const result = engine.analyze('كتب');
      expect(result.rootLength).toBe(3);
    });

    it('original field matches input', () => {
      expect(engine.analyze('كَتَبَ').original).toBe('كَتَبَ');
    });
  });

  // ── analyze — noun ────────────────────────────────────────────────────────

  describe('analyze — noun form', () => {
    it('detects feminine noun ending in tah marbuta (مكتبة)', () => {
      // 'مكتبة' → stem 'مكتب' (4 letters, starts with م) → matchesNominalPattern → noun
      const result = engine.analyze('مكتبة');
      expect(result.isNoun).toBe(true);
    });

    it('wordClass is "noun" for مكتبة (م-prefix pattern)', () => {
      expect(engine.analyze('مكتبة').wordClass).toBe('noun');
    });

    it('detects مَفْعَل pattern (starts with م, ≥ 4 letters)', () => {
      const result = engine.analyze('مكتبة');
      expect(result.isNoun).toBe(true);
    });
  });

  // ── breakdownMorphemes ────────────────────────────────────────────────────

  describe('breakdownMorphemes', () => {
    it('strips "ال" prefix from "الرحمن"', () => {
      const result = engine.breakdownMorphemes('الرحمن');
      expect(result.prefix).toBe('ال');
      expect(result.stem).toBe('رحمن');
    });

    it('strips "هم" suffix from "كتابهم"', () => {
      const result = engine.breakdownMorphemes('كتابهم');
      expect(result.suffix).toBe('هم');
      expect(result.stem).not.toContain('هم');
    });

    it('returns only stem for particles', () => {
      const result = engine.breakdownMorphemes('في');
      expect(result.stem).toBe('في');
      expect(result.prefix).toBeUndefined();
      expect(result.suffix).toBeUndefined();
    });

    it('does not strip prefix if stem would be too short (≤ 1 char)', () => {
      // 'الب' is 3 chars; prefix 'ال' + 1 remaining — length check: remaining > prefix.length + 1 fails
      const result = engine.breakdownMorphemes('الب');
      // remaining after 'ال' would be 'ب' (1 char), not stripped
      expect(result.prefix).toBeUndefined();
    });
  });

  // ── extractRoot ───────────────────────────────────────────────────────────

  describe('extractRoot', () => {
    it('returns null for empty string', () => {
      expect(engine.extractRoot('')).toBeNull();
    });

    it('returns null for single-letter stem', () => {
      expect(engine.extractRoot('ك')).toBeNull();
    });

    it('returns the stem as-is when already 3 letters', () => {
      expect(engine.extractRoot('كتب')).toBe('كتب');
    });

    it('returns the stem as-is when already 4 letters', () => {
      expect(engine.extractRoot('دحرج')).toBe('دحرج');
    });

    it('extracts root from longer stem by stripping augments', () => {
      const root = engine.extractRoot('استغفر');
      expect(root).toBeTruthy();
      expect(root!.length).toBeGreaterThanOrEqual(2);
    });

    it('falls back to first 3 letters for 5-letter stems', () => {
      const root = engine.extractRoot('ينزلون');
      expect(root).toBeTruthy();
    });
  });

  // ── classifyWordClass ─────────────────────────────────────────────────────

  describe('classifyWordClass', () => {
    it('returns "particle" for known particles', () => {
      expect(engine.classifyWordClass('في', 'في')).toBe('particle');
    });

    it('returns "verb" for 3-letter stems', () => {
      expect(engine.classifyWordClass('كتب', 'كتب')).toBe('verb');
    });

    it('returns "noun" for stems ending in tah marbuta', () => {
      expect(engine.classifyWordClass('رحمة', 'رحمه')).toBe('noun');
    });

    it('returns "noun" for stems starting with م (4+ letters)', () => {
      expect(engine.classifyWordClass('مدرسة', 'مدرسه')).toBe('noun');
    });

    it('returns "unknown" for unrecognised patterns', () => {
      // A long word that doesn't match any heuristic
      expect(engine.classifyWordClass('كتبتكما', 'كتبتكما')).toBe('unknown');
    });
  });
});
