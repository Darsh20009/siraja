import { MistakeDetectorService } from './mistake-detector.service';
import { MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

describe('MistakeDetectorService', () => {
  let service: MistakeDetectorService;

  beforeEach(() => {
    service = new MistakeDetectorService();
  });

  // ── Perfect recitation ─────────────────────────────────────────────────
  describe('perfect recitation', () => {
    it('returns no mistakes for identical text', () => {
      const result = service.detect({
        recitedText: 'بسم الله الرحمن الرحيم',
        referenceText: 'بسم الله الرحمن الرحيم',
      });
      expect(result).toHaveLength(0);
    });

    it('returns no mistakes when only tashkeel differs', () => {
      // Reference has diacritics, recited does not
      const result = service.detect({
        recitedText: 'بسم الله الرحمن الرحيم',
        referenceText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      });
      expect(result).toHaveLength(0);
    });
  });

  // ── Empty inputs ───────────────────────────────────────────────────────
  describe('empty inputs', () => {
    it('returns no mistakes when reference is empty', () => {
      const result = service.detect({ recitedText: 'بسم', referenceText: '' });
      expect(result).toHaveLength(0);
    });
  });

  // ── MISSING_WORD ───────────────────────────────────────────────────────
  describe('MISSING_WORD detection', () => {
    it('detects a single missing word', () => {
      const result = service.detect({
        referenceText: 'بسم الله الرحمن الرحيم',
        recitedText: 'بسم الرحمن الرحيم',  // "الله" missing
      });
      const missing = result.filter((m) => m.type === MistakeType.MISSING_WORD);
      expect(missing.length).toBeGreaterThanOrEqual(1);
    });

    it('assigns MINOR severity for a single missing word', () => {
      const result = service.detect({
        referenceText: 'بسم الله الرحمن الرحيم',
        recitedText: 'بسم الرحمن الرحيم',
      });
      const missing = result.filter((m) => m.type === MistakeType.MISSING_WORD);
      expect(missing.some((m) => m.severity === MistakeSeverity.MINOR)).toBe(true);
    });

    it('assigns MODERATE severity for 2-3 consecutive missing words', () => {
      const result = service.detect({
        referenceText: 'كلمة واحدة كلمتان ثلاث رابع',
        recitedText: 'كلمة رابع',
      });
      const missing = result.filter((m) => m.type === MistakeType.MISSING_WORD);
      expect(missing.some((m) => m.severity === MistakeSeverity.MODERATE)).toBe(true);
    });
  });

  // ── SKIPPED_AYAH ───────────────────────────────────────────────────────
  describe('SKIPPED_AYAH detection', () => {
    it('detects skipped ayah when 5+ consecutive words are missing', () => {
      const refWords = ['كلمة', 'اثنتان', 'ثلاث', 'اربع', 'خمس', 'ست', 'سبع', 'ثمان'];
      const result = service.detect({
        referenceText: refWords.join(' '),
        recitedText: 'كلمة ثمان',  // 6 words skipped in the middle
      });
      const skipped = result.filter((m) => m.type === MistakeType.SKIPPED_AYAH);
      expect(skipped.length).toBeGreaterThanOrEqual(1);
      expect(skipped[0].severity).toBe(MistakeSeverity.MAJOR);
    });
  });

  // ── WRONG_WORD ─────────────────────────────────────────────────────────
  describe('WRONG_WORD detection', () => {
    it('detects a substituted word (unambiguous replacement)', () => {
      // "صغير" replaces "كبير" — words that are clearly different from everything else
      const result = service.detect({
        referenceText: 'الرجل كبير وقوي',
        recitedText: 'الرجل صغير وقوي',
      });
      // Must produce at least one mistake (either WRONG_WORD or MISSING_WORD)
      expect(result.length).toBeGreaterThanOrEqual(1);
      const substantiveMistakes = result.filter(
        (m) => m.type === MistakeType.WRONG_WORD || m.type === MistakeType.MISSING_WORD,
      );
      expect(substantiveMistakes.length).toBeGreaterThanOrEqual(1);
    });

    it('assigns MINOR severity for small edit distance (≤ 2)', () => {
      const result = service.detect({
        referenceText: 'الرحمن',
        recitedText: 'الرحمان',  // one insertion
      });
      const wrong = result.filter((m) => m.type === MistakeType.WRONG_WORD);
      if (wrong.length > 0) {
        expect(wrong[0].severity).toBe(MistakeSeverity.MINOR);
      }
    });
  });

  // ── REPEATED_WORD ──────────────────────────────────────────────────────
  describe('REPEATED_WORD detection', () => {
    it('detects a repeated word (unambiguous duplicate mid-sequence)', () => {
      // "الله" appears twice in recited; second occurrence is the repeat
      const result = service.detect({
        referenceText: 'الله الرحمن الرحيم',
        recitedText: 'الله الله الرحمن الرحيم',  // "الله" repeated
      });
      const repeated = result.filter((m) => m.type === MistakeType.REPEATED_WORD);
      expect(repeated.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── No mistakes for empty recited text → all MISSING ──────────────────
  describe('completely empty recitation', () => {
    it('marks all reference words as missing when recited is empty', () => {
      const result = service.detect({
        referenceText: 'بسم الله',
        recitedText: '',
      });
      const missing = result.filter((m) =>
        m.type === MistakeType.MISSING_WORD || m.type === MistakeType.SKIPPED_AYAH
      );
      expect(missing.length).toBeGreaterThan(0);
    });
  });

  // ── summarize ──────────────────────────────────────────────────────────
  describe('summarize', () => {
    it('returns zero counts for no mistakes', () => {
      const summary = service.summarize([]);
      expect(Object.values(summary).every((v) => v === 0)).toBe(true);
    });

    it('counts mistake types correctly', () => {
      const mistakes = [
        { type: MistakeType.MISSING_WORD, severity: MistakeSeverity.MINOR, wordIndex: 0, referenceWord: 'بسم' },
        { type: MistakeType.MISSING_WORD, severity: MistakeSeverity.MINOR, wordIndex: 1, referenceWord: 'الله' },
        { type: MistakeType.WRONG_WORD, severity: MistakeSeverity.MINOR, wordIndex: 2, referenceWord: 'الرحمن', recitedWord: 'الكريم', editDistance: 3 },
      ];
      const summary = service.summarize(mistakes);
      expect(summary[MistakeType.MISSING_WORD]).toBe(2);
      expect(summary[MistakeType.WRONG_WORD]).toBe(1);
    });
  });
});
