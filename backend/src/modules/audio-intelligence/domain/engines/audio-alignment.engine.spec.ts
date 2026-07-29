import { AudioAlignmentEngine, AyahWordData } from './audio-alignment.engine';
import type { TranscriptionWord } from '../../infrastructure/providers/interfaces/speech-recognition.provider.interface';

describe('AudioAlignmentEngine', () => {
  let engine: AudioAlignmentEngine;

  const segId = 'seg-1';

  const word = (text: string, start = 0, end = 0.5, conf = 0.9): TranscriptionWord => ({
    text,
    startSeconds: start,
    endSeconds: end,
    confidence: conf,
  });

  const expected = (arabic: string, ayah = 1, wordIdx = 0): AyahWordData => ({
    surahNumber: 1,
    ayahNumber: ayah,
    wordIndex: wordIdx,
    arabicText: arabic,
  });

  beforeEach(() => {
    engine = new AudioAlignmentEngine();
  });

  describe('levenshtein', () => {
    it('returns 0 for identical strings', () => {
      expect(engine.levenshtein('بِسْمِ', 'بِسْمِ')).toBe(0);
    });

    it('returns string length for empty vs non-empty', () => {
      expect(engine.levenshtein('', 'abc')).toBe(3);
      expect(engine.levenshtein('abc', '')).toBe(3);
    });

    it('returns 1 for one substitution', () => {
      expect(engine.levenshtein('abc', 'axc')).toBe(1);
    });

    it('handles Arabic strings correctly', () => {
      expect(engine.levenshtein('الله', 'اللّه')).toBeLessThanOrEqual(2);
    });
  });

  describe('align — empty inputs', () => {
    it('returns empty alignments when no expected words', () => {
      const result = engine.align([word('بِسْمِ')], [], segId);
      expect(result.wordAlignments).toHaveLength(0);
      expect(result.totalExpectedWords).toBe(0);
      expect(result.insertedWords).toBe(1);
    });

    it('models all expected words as deletions when transcript is empty', () => {
      const result = engine.align([], [expected('بِسْمِ'), expected('اللَّهِ', 1, 1)], segId);
      expect(result.wordAlignments).toHaveLength(2);
      expect(result.wordAlignments.every((wa) => !wa.isMatch)).toBe(true);
      expect(result.deletedWords).toBe(2);
      expect(result.correctWords).toBe(0);
    });

    it('models all expected words as deletions when confidence is too low', () => {
      const lowConfWords = [word('بِسْمِ', 0, 0.5, 0.1)]; // below MIN_WORD_ASR_CONFIDENCE
      const result = engine.align(lowConfWords, [expected('بِسْمِ')], segId);
      expect(result.deletedWords).toBe(1);
      expect(result.correctWords).toBe(0);
    });
  });

  describe('align — perfect match', () => {
    it('marks all words as matching when transcript equals expected', () => {
      const recognised = [
        word('بِسْمِ', 0.0, 0.4),
        word('اللَّهِ', 0.4, 0.9),
        word('الرَّحْمَٰنِ', 0.9, 1.5),
      ];
      const exp = [
        expected('بِسْمِ', 1, 0),
        expected('اللَّهِ', 1, 1),
        expected('الرَّحْمَٰنِ', 1, 2),
      ];

      const result = engine.align(recognised, exp, segId);
      expect(result.correctWords).toBe(3);
      expect(result.deletedWords).toBe(0);
      expect(result.insertedWords).toBe(0);
      expect(result.wordAlignments.every((wa) => wa.isMatch)).toBe(true);
    });

    it('attaches Quran coordinates from expected words', () => {
      const result = engine.align([word('بِسْمِ')], [expected('بِسْمِ', 1, 0)], segId);
      const wa = result.wordAlignments[0];
      expect(wa.surahNumber).toBe(1);
      expect(wa.ayahNumber).toBe(1);
      expect(wa.wordIndex).toBe(0);
    });
  });

  describe('align — single substitution', () => {
    it('marks the wrong word as not matching', () => {
      const recognised = [word('بِسْمِ'), word('XYZ')];
      const exp = [expected('بِسْمِ', 1, 0), expected('اللَّهِ', 1, 1)];
      const result = engine.align(recognised, exp, segId);
      const wrongWord = result.wordAlignments.find((wa) => wa.recognisedText === 'XYZ');
      expect(wrongWord?.isMatch).toBe(false);
    });
  });

  describe('align — skipped word (deletion)', () => {
    it('produces a deletion alignment with empty recognisedText', () => {
      const recognised = [word('بِسْمِ'), word('الرَّحْمَٰنِ')];
      const exp = [
        expected('بِسْمِ', 1, 0),
        expected('اللَّهِ', 1, 1),
        expected('الرَّحْمَٰنِ', 1, 2),
      ];
      const result = engine.align(recognised, exp, segId);
      const deletion = result.wordAlignments.find((wa) => wa.expectedText === 'اللَّهِ');
      expect(deletion?.recognisedText).toBe('');
      expect(result.deletedWords).toBeGreaterThan(0);
    });
  });

  describe('align — extra word (insertion)', () => {
    it('produces an insertion alignment with no expectedText', () => {
      const recognised = [word('بِسْمِ'), word('EXTRA'), word('اللَّهِ')];
      const exp = [expected('بِسْمِ', 1, 0), expected('اللَّهِ', 1, 1)];
      const result = engine.align(recognised, exp, segId);
      const insertion = result.wordAlignments.find((wa) => wa.recognisedText === 'EXTRA');
      expect(insertion?.expectedText).toBeUndefined();
      expect(result.insertedWords).toBeGreaterThan(0);
    });
  });

  describe('align — segmentId propagation', () => {
    it('sets segmentId on every word alignment', () => {
      const result = engine.align([word('بِسْمِ')], [expected('بِسْمِ')], 'my-seg');
      expect(result.wordAlignments.every((wa) => wa.segmentId === 'my-seg')).toBe(true);
    });
  });
});
