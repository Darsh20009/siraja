import { SHADDA, NOON, MEEM } from '../rules/arabic.rules';
import { NormalizationEngine } from './normalization.engine';
import { MorphologyEngine } from './morphology.engine';
import { LetterAnalyzerEngine } from './letter-analyzer.engine';
import type { WordAnalysis } from '../entities/word-analysis.entity';

/**
 * WordAnalyzerEngine — per-word linguistic and tajweed analysis.
 *
 * Aggregates letter-level properties and morphological data into a
 * `WordAnalysis` record that higher-level engines can consume without
 * re-doing the low-level analysis.
 *
 * No NestJS dependencies — instantiate with `new WordAnalyzerEngine()`.
 */
export class WordAnalyzerEngine {
  private readonly normalizer = new NormalizationEngine();
  private readonly morphology = new MorphologyEngine();
  private readonly letters = new LetterAnalyzerEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Full analysis of a single Arabic word. */
  analyze(word: string): WordAnalysis {
    const normalized = this.normalizer.toSearchForm(word);
    const morphAnalysis = this.morphology.analyze(word);
    const letterCount = this.countLetters(normalized);
    const syllableEstimate = this.estimateSyllables(word);
    const tajweedComplexity = this.letters.getTajweedComplexity(word);
    const difficulty = this.estimateDifficulty(word, letterCount, tajweedComplexity);

    return {
      word,
      normalized,
      root: morphAnalysis.root,
      letterCount,
      syllableEstimate,
      morphemes: morphAnalysis.morphemes,
      hasQalqala: this.hasQalqala(word),
      hasMadd: this.hasMadd(word),
      hasGhunna: this.hasGhunna(word),
      hasShadda: this.hasShadda(word),
      hasHamza: this.hasHamza(word),
      tajweedComplexity,
      difficulty,
    };
  }

  /**
   * Analyze all words in a space-separated Arabic text.
   */
  analyzeText(text: string): WordAnalysis[] {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => this.analyze(w));
  }

  /**
   * Estimate learner difficulty 1–5 for a single word.
   *
   * Formula:
   *   rawScore = (letterCount × 0.30) + (tajweedComplexity × 0.50) + (syllables × 0.20)
   *   Mapped: ≤20 → 1, ≤40 → 2, ≤60 → 3, ≤80 → 4, >80 → 5
   */
  estimateDifficulty(word: string, letterCount?: number, tajweedComplexity?: number): number {
    const lc = letterCount ?? this.countLetters(this.normalizer.toSearchForm(word));
    const tc = tajweedComplexity ?? this.letters.getTajweedComplexity(word);
    const syllables = this.estimateSyllables(word);

    // Normalise components to 0–100
    const lcScore = Math.min(lc / 10 * 100, 100);
    const syllableScore = Math.min(syllables / 6 * 100, 100);

    const raw = lcScore * 0.30 + tc * 0.50 + syllableScore * 0.20;

    if (raw <= 20) return 1;
    if (raw <= 40) return 2;
    if (raw <= 60) return 3;
    if (raw <= 80) return 4;
    return 5;
  }

  /**
   * Estimate syllable count from the diacritic structure.
   * Each vowel marker (fathah, kasrah, dammah, plus their tanwin variants)
   * corresponds to approximately one syllable.
   */
  estimateSyllables(word: string): number {
    // Count short vowels: fathah U+064E, kasrah U+0650, dammah U+064F
    const shortVowels = (word.match(/[\u064E\u0650\u064F]/g) ?? []).length;
    // Long vowels: madd letters after a short vowel
    const longVowels = (word.match(/[\u0622\u0627\u0648\u064A]/g) ?? []).length;
    const total = shortVowels + Math.ceil(longVowels * 0.5);
    return Math.max(1, total);
  }

  // ── Tajweed flag helpers ───────────────────────────────────────────────────

  hasQalqala(word: string): boolean {
    const bare = this.normalizer.stripDiacritics(word);
    return /[قطبجد]/.test(bare);
  }

  hasMadd(word: string): boolean {
    // Madd letter (ا و ي) after a short vowel diacritic
    return /[\u064E\u0650\u064F][\u0627\u0648\u064A]/.test(word);
  }

  hasGhunna(word: string): boolean {
    // Noon or meem followed by (optional diacritic +) shadda
    return new RegExp(`[${NOON}${MEEM}][\\u064B-\\u0652]?${SHADDA}`).test(word);
  }

  hasShadda(word: string): boolean {
    return word.includes(SHADDA);
  }

  hasHamza(word: string): boolean {
    return /[\u0621\u0623\u0625\u0624\u0626\u0622]/.test(word);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private countLetters(normalized: string): number {
    return [...normalized].filter((ch) => /[\u0621-\u064A\u0671]/.test(ch)).length;
  }
}
