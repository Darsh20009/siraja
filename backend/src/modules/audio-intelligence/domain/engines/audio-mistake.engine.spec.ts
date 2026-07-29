import { AudioMistakeEngine } from './audio-mistake.engine';
import type { WordAlignment } from '../entities/word-alignment.entity';

describe('AudioMistakeEngine', () => {
  let engine: AudioMistakeEngine;
  const sessionId = 'session-abc';

  const makeWa = (
    recognisedText: string,
    expectedText: string | undefined,
    isMatch: boolean,
    options: Partial<WordAlignment> = {},
  ): WordAlignment => ({
    segmentId: 'seg-1',
    recognisedText,
    expectedText,
    surahNumber: 1,
    ayahNumber: 1,
    wordIndex: 0,
    startSeconds: 0,
    endSeconds: 0.5,
    confidence: 0.85,
    isMatch,
    editDistance: isMatch ? 0 : 10,
    ...options,
  });

  beforeEach(() => {
    engine = new AudioMistakeEngine();
  });

  describe('detect — no mistakes', () => {
    it('returns empty array when all words match', () => {
      const alignments: WordAlignment[] = [
        makeWa('بِسْمِ', 'بِسْمِ', true, { wordIndex: 0 }),
        makeWa('اللَّهِ', 'اللَّهِ', true, { wordIndex: 1 }),
        makeWa('الرَّحْمَٰنِ', 'الرَّحْمَٰنِ', true, { wordIndex: 2 }),
      ];
      expect(engine.detect(alignments, sessionId)).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      expect(engine.detect([], sessionId)).toHaveLength(0);
    });
  });

  describe('detect — wrong word', () => {
    it('detects a substituted word', () => {
      const alignments: WordAlignment[] = [
        makeWa('بِسْمِ', 'بِسْمِ', true, { wordIndex: 0 }),
        makeWa('WRONG', 'اللَّهِ', false, { wordIndex: 1 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      expect(mistakes.some((m) => m.type === 'wrong_word')).toBe(true);
    });
  });

  describe('detect — skipped word', () => {
    it('detects a deletion (empty recognisedText)', () => {
      const alignments: WordAlignment[] = [
        makeWa('', 'اللَّهِ', false, { wordIndex: 0 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      expect(mistakes.some((m) => m.type === 'skipped_word')).toBe(true);
    });
  });

  describe('detect — repeated word', () => {
    it('detects consecutive identical words', () => {
      const alignments: WordAlignment[] = [
        makeWa('بِسْمِ', 'بِسْمِ', true, { wordIndex: 0 }),
        makeWa('بِسْمِ', 'اللَّهِ', false, { wordIndex: 1 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      expect(mistakes.some((m) => m.type === 'repeated_word')).toBe(true);
    });
  });

  describe('detect — skipped ayah', () => {
    it('detects a skipped ayah when all its words are deletions', () => {
      const alignments: WordAlignment[] = [
        makeWa('', 'word1', false, { ayahNumber: 2, wordIndex: 0 }),
        makeWa('', 'word2', false, { ayahNumber: 2, wordIndex: 1 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      expect(mistakes.some((m) => m.type === 'skipped_ayah')).toBe(true);
      expect(mistakes.some((m) => m.severity === 'critical')).toBe(true);
    });
  });

  describe('detect — pronunciation error', () => {
    it('flags low confidence matches as pronunciation errors', () => {
      const alignments: WordAlignment[] = [
        makeWa('بِسْمِ', 'بِسْمِ', true, { confidence: 0.25, wordIndex: 0 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      expect(mistakes.some((m) => m.type === 'pronunciation_error')).toBe(true);
    });
  });

  describe('detect — recurrence flagging', () => {
    it('marks isRecurring when same type appears twice', () => {
      const alignments: WordAlignment[] = [
        makeWa('X', 'بِسْمِ', false, { wordIndex: 0 }),
        makeWa('Y', 'اللَّهِ', false, { wordIndex: 1 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      const wrongWords = mistakes.filter((m) => m.type === 'wrong_word');
      expect(wrongWords.length).toBeGreaterThanOrEqual(2);
      expect(wrongWords.every((m) => m.isRecurring)).toBe(true);
    });
  });

  describe('summarise', () => {
    it('returns zero counts for empty array', () => {
      const summary = engine.summarise([]);
      expect(summary.totalMistakes).toBe(0);
      expect(summary.hasCriticalMistakes).toBe(false);
      expect(summary.dominantType).toBeNull();
    });

    it('identifies dominant type correctly', () => {
      const alignments: WordAlignment[] = [
        makeWa('X', 'بِسْمِ', false, { wordIndex: 0 }),
        makeWa('Y', 'اللَّهِ', false, { wordIndex: 1 }),
        makeWa('', 'الرَّحْمَٰنِ', false, { wordIndex: 2 }),
      ];
      const mistakes = engine.detect(alignments, sessionId);
      const summary = engine.summarise(mistakes);
      expect(summary.dominantType).toBe('wrong_word');
    });
  });
});
