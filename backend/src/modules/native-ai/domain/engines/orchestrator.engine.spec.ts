import { NativeAiOrchestratorEngine } from './orchestrator.engine';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const FATIHA_1 = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';

describe('NativeAiOrchestratorEngine', () => {
  let engine: NativeAiOrchestratorEngine;

  beforeEach(() => {
    engine = new NativeAiOrchestratorEngine();
  });

  // ── analyzeText — output structure ────────────────────────────────────────

  describe('analyzeText — output structure', () => {
    it('returns all required TextAnalysisResult fields', () => {
      const result = engine.analyzeText(BISMILLAH);
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('wordAnalyses');
      expect(result).toHaveProperty('tajweedApplications');
      expect(result).toHaveProperty('tajweedSummary');
    });

    it('preserves original text', () => {
      const result = engine.analyzeText(BISMILLAH);
      expect(result.text).toBe(BISMILLAH);
    });

    it('tokens count matches word count', () => {
      const result = engine.analyzeText(BISMILLAH);
      const wordCount = BISMILLAH.trim().split(/\s+/).length;
      expect(result.tokens).toHaveLength(wordCount);
    });

    it('wordAnalyses count matches word count', () => {
      const result = engine.analyzeText(BISMILLAH);
      const wordCount = BISMILLAH.trim().split(/\s+/).length;
      expect(result.wordAnalyses).toHaveLength(wordCount);
    });

    it('tajweedSummary has complexityScore in [0, 100]', () => {
      const result = engine.analyzeText(BISMILLAH);
      expect(result.tajweedSummary.complexityScore).toBeGreaterThanOrEqual(0);
      expect(result.tajweedSummary.complexityScore).toBeLessThanOrEqual(100);
    });

    it('detects at least one tajweed application in bismillah', () => {
      const result = engine.analyzeText(BISMILLAH);
      expect(result.tajweedApplications.length).toBeGreaterThan(0);
    });
  });

  // ── analyzeText — empty input ─────────────────────────────────────────────

  describe('analyzeText — edge cases', () => {
    it('handles empty string gracefully', () => {
      const result = engine.analyzeText('');
      expect(result.tokens).toHaveLength(0);
      expect(result.wordAnalyses).toHaveLength(0);
    });

    it('handles single word', () => {
      const result = engine.analyzeText('الله');
      expect(result.tokens).toHaveLength(1);
    });
  });

  // ── analyzeVerse — output structure ───────────────────────────────────────

  describe('analyzeVerse — output structure', () => {
    it('returns all required VerseTextAnalysisResult fields', () => {
      const result = engine.analyzeVerse(FATIHA_1, 1, 2);
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('wordAnalyses');
      expect(result).toHaveProperty('tajweedApplications');
      expect(result).toHaveProperty('tajweedSummary');
      expect(result).toHaveProperty('verseAnalysis');
      expect(result).toHaveProperty('surahNumber');
      expect(result).toHaveProperty('ayahNumber');
    });

    it('surahNumber and ayahNumber are preserved', () => {
      const result = engine.analyzeVerse(FATIHA_1, 1, 2);
      expect(result.surahNumber).toBe(1);
      expect(result.ayahNumber).toBe(2);
    });

    it('verseAnalysis contains correct surahNumber and ayahNumber', () => {
      const result = engine.analyzeVerse(FATIHA_1, 1, 2);
      expect(result.verseAnalysis.surahNumber).toBe(1);
      expect(result.verseAnalysis.ayahNumber).toBe(2);
    });

    it('verseAnalysis wordCount matches actual word count', () => {
      const result = engine.analyzeVerse(FATIHA_1, 1, 2);
      const wordCount = FATIHA_1.trim().split(/\s+/).length;
      expect(result.verseAnalysis.wordCount).toBe(wordCount);
    });

    it('verseAnalysis difficulty is in [0, 100]', () => {
      const result = engine.analyzeVerse(BISMILLAH, 1, 1);
      expect(result.verseAnalysis.difficulty).toBeGreaterThanOrEqual(0);
      expect(result.verseAnalysis.difficulty).toBeLessThanOrEqual(100);
    });
  });

  // ── normalizeText ─────────────────────────────────────────────────────────

  describe('normalizeText', () => {
    it('strips diacritics from Arabic text', () => {
      const result = engine.normalizeText('بِسْمِ');
      expect(result).toBe('بسم');
    });

    it('returns empty string for empty input', () => {
      expect(engine.normalizeText('')).toBe('');
    });
  });

  // ── computeDifficulty ─────────────────────────────────────────────────────

  describe('computeDifficulty', () => {
    it('returns a number in [1, 5]', () => {
      const d = engine.computeDifficulty(BISMILLAH);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
    });

    it('returns 1 for empty text', () => {
      expect(engine.computeDifficulty('')).toBe(1);
    });

    it('single simple word has low difficulty', () => {
      const d = engine.computeDifficulty('من');
      expect(d).toBeLessThanOrEqual(3);
    });
  });

  // ── extractTokens ─────────────────────────────────────────────────────────

  describe('extractTokens', () => {
    it('returns correct number of tokens', () => {
      const tokens = engine.extractTokens(BISMILLAH);
      expect(tokens).toHaveLength(4);
    });

    it('returns empty for empty text', () => {
      expect(engine.extractTokens('')).toHaveLength(0);
    });

    it('each token has text, normalized, type, position', () => {
      const tokens = engine.extractTokens('الله');
      expect(tokens[0]).toHaveProperty('text');
      expect(tokens[0]).toHaveProperty('normalized');
      expect(tokens[0]).toHaveProperty('type');
      expect(tokens[0]).toHaveProperty('position');
    });
  });
});
