import { TokenizerEngine } from './tokenizer.engine';
import { NormalizationEngine } from './normalization.engine';
import { MorphologyEngine } from './morphology.engine';
import { LetterAnalyzerEngine } from './letter-analyzer.engine';
import { WordAnalyzerEngine } from './word-analyzer.engine';
import { VerseStructureAnalyzerEngine } from './verse-structure.engine';
import { TajweedRuleEngine, TajweedAnalysisSummary } from './tajweed-rule.engine';
import type { QuranToken } from '../entities/quran-token.entity';
import type { WordAnalysis } from '../entities/word-analysis.entity';
import type { VerseAnalysis } from '../entities/verse-analysis.entity';
import type { TajweedRuleApplication } from '../entities/tajweed-rule-application.entity';

/**
 * TextAnalysisResult — the combined output of tokenization, word analysis,
 * and tajweed detection for an arbitrary Arabic text.
 */
export interface TextAnalysisResult {
  /** The original input text. */
  text: string;
  /** Tokenized representation of the text. */
  tokens: QuranToken[];
  /** Per-word linguistic and tajweed analyses. */
  wordAnalyses: WordAnalysis[];
  /** All tajweed rule applications detected in the text. */
  tajweedApplications: TajweedRuleApplication[];
  /** Aggregate tajweed summary statistics. */
  tajweedSummary: TajweedAnalysisSummary;
}

/**
 * VerseTextAnalysisResult — extends `TextAnalysisResult` with
 * full verse-structure analysis for a known ayah position.
 */
export interface VerseTextAnalysisResult extends TextAnalysisResult {
  /** Structural analysis of the ayah. */
  verseAnalysis: VerseAnalysis;
  /** Surah number (1–114). */
  surahNumber: number;
  /** Ayah number within the surah (1-based). */
  ayahNumber: number;
}

/**
 * NativeAiOrchestratorEngine — top-level facade that wires all domain
 * engines together and exposes a simplified API for controllers and
 * application services.
 *
 * Responsible for:
 *  - Tokenization, normalization, and word-level analysis
 *  - Verse-structure analysis
 *  - Tajweed rule detection and summarization
 *  - Overall text difficulty scoring
 *
 * No NestJS dependencies — instantiate with `new NativeAiOrchestratorEngine()`.
 */
export class NativeAiOrchestratorEngine {
  private readonly tokenizer: TokenizerEngine;
  private readonly normalizer: NormalizationEngine;
  private readonly morphology: MorphologyEngine;
  private readonly letterAnalyzer: LetterAnalyzerEngine;
  private readonly wordAnalyzer: WordAnalyzerEngine;
  private readonly verseAnalyzer: VerseStructureAnalyzerEngine;
  private readonly tajweedEngine: TajweedRuleEngine;

  constructor() {
    this.tokenizer = new TokenizerEngine();
    this.normalizer = new NormalizationEngine();
    this.morphology = new MorphologyEngine();
    this.letterAnalyzer = new LetterAnalyzerEngine();
    this.wordAnalyzer = new WordAnalyzerEngine();
    this.verseAnalyzer = new VerseStructureAnalyzerEngine();
    this.tajweedEngine = new TajweedRuleEngine();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Perform a full text analysis: tokenize, analyze each word, and detect
   * all tajweed rule applications.
   *
   * @param text Arabic text with or without diacritics.
   * @returns A `TextAnalysisResult` aggregating all engine outputs.
   */
  analyzeText(text: string): TextAnalysisResult {
    const tokens = this.tokenizer.tokenize(text);
    const wordAnalyses = this.wordAnalyzer.analyzeText(text);
    const tajweedApplications = this.tajweedEngine.analyzeText(text);
    const tajweedSummary = this.tajweedEngine.summarize(tajweedApplications);

    return {
      text,
      tokens,
      wordAnalyses,
      tajweedApplications,
      tajweedSummary,
    };
  }

  /**
   * Perform a full verse-level analysis for a specific ayah.
   *
   * Extends `analyzeText` with structural verse analysis including
   * rhyme ending, difficulty score, and tajweed flags.
   *
   * @param text        Arabic text of the ayah (with or without diacritics).
   * @param surahNumber Surah number 1–114.
   * @param ayahNumber  Ayah number within the surah (1-based).
   * @returns A `VerseTextAnalysisResult` with all analysis layers.
   */
  analyzeVerse(
    text: string,
    surahNumber: number,
    ayahNumber: number,
  ): VerseTextAnalysisResult {
    const base = this.analyzeText(text);
    const verseAnalysis = this.verseAnalyzer.analyze(text, surahNumber, ayahNumber);

    return {
      ...base,
      verseAnalysis,
      surahNumber,
      ayahNumber,
    };
  }

  /**
   * Normalize Arabic text to its search form (diacritics stripped,
   * alef/ya unified, tatweel removed).
   *
   * @param text Input Arabic text.
   * @returns Normalized string ready for comparison or indexing.
   */
  normalizeText(text: string): string {
    return this.normalizer.toSearchForm(text);
  }

  /**
   * Compute an overall difficulty score for a text (1–5 scale averaged
   * across all words, then mapped to 0–100).
   *
   * @param text Arabic text with or without diacritics.
   * @returns Difficulty score in the range [1, 5].
   */
  computeDifficulty(text: string): number {
    const analyses = this.wordAnalyzer.analyzeText(text);
    if (analyses.length === 0) return 1;
    const total = analyses.reduce((sum, w) => sum + w.difficulty, 0);
    return total / analyses.length;
  }

  /**
   * Tokenize an Arabic text into structured `QuranToken` objects.
   *
   * @param text Arabic text to tokenize.
   * @returns Array of `QuranToken` records with position and morpheme data.
   */
  extractTokens(text: string): QuranToken[] {
    return this.tokenizer.tokenize(text);
  }
}
