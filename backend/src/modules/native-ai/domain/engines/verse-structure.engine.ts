import { NormalizationEngine } from './normalization.engine';
import { WordAnalyzerEngine } from './word-analyzer.engine';
import type { VerseAnalysis } from '../entities/verse-analysis.entity';

/**
 * VerseStructureAnalyzerEngine — structural analysis of a single ayah.
 *
 * Aggregates per-word analyses into verse-level metrics: difficulty,
 * tajweed complexity, rhyme pattern, and structural flags.
 *
 * No NestJS dependencies — instantiate with `new VerseStructureAnalyzerEngine()`.
 */
export class VerseStructureAnalyzerEngine {
  private readonly normalizer = new NormalizationEngine();
  private readonly wordEngine = new WordAnalyzerEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Full structural analysis of a single ayah.
   */
  analyze(
    arabicText: string,
    surahNumber: number,
    ayahNumber: number,
  ): VerseAnalysis {
    const words = arabicText.trim().split(/\s+/).filter((w) => w.length > 0);
    const wordAnalyses = words.map((w) => this.wordEngine.analyze(w));

    const uniqueWords = new Set(wordAnalyses.map((w) => w.normalized));
    const letterCount = wordAnalyses.reduce((sum, w) => sum + w.letterCount, 0);

    const tajweedComplexity = this.computeTajweedComplexity(wordAnalyses);
    const difficulty = this.computeDifficulty(wordAnalyses, words.length);
    const rhymeEnding = this.extractRhymeEnding(arabicText);

    const mostDifficult = wordAnalyses.reduce(
      (best, w) => (w.difficulty > (best?.difficulty ?? 0) ? w : best),
      undefined as typeof wordAnalyses[0] | undefined,
    );

    return {
      surahNumber,
      ayahNumber,
      arabicText,
      wordCount: words.length,
      letterCount,
      uniqueWordCount: uniqueWords.size,
      words: wordAnalyses,
      tajweedComplexity,
      difficulty,
      rhymeEnding,
      mostDifficultWord: mostDifficult?.normalized,
      hasQalqala: wordAnalyses.some((w) => w.hasQalqala),
      hasMadd: wordAnalyses.some((w) => w.hasMadd),
      hasGhunna: wordAnalyses.some((w) => w.hasGhunna),
      hasShadda: wordAnalyses.some((w) => w.hasShadda),
    };
  }

  /**
   * Analyze multiple ayahs and detect their shared rhyme pattern.
   * Returns the dominant rhyme ending (most common ending in the set).
   */
  analyzeRhymePattern(texts: string[]): string {
    const endings = texts.map((t) => this.extractRhymeEnding(t)).filter(Boolean) as string[];
    if (endings.length === 0) return '';

    const freq = new Map<string, number>();
    for (const e of endings) freq.set(e, (freq.get(e) ?? 0) + 1);

    let dominant = '';
    let max = 0;
    for (const [ending, count] of freq) {
      if (count > max) { max = count; dominant = ending; }
    }
    return dominant;
  }

  /**
   * Compute verse difficulty (0–100).
   * Combines word-level difficulty scores weighted by word count.
   */
  computeDifficulty(
    wordAnalyses: { difficulty: number }[],
    _wordCount?: number,
  ): number {
    if (wordAnalyses.length === 0) return 0;
    const meanDifficulty =
      wordAnalyses.reduce((sum, w) => sum + w.difficulty, 0) / wordAnalyses.length;
    // Map 1–5 difficulty scale to 0–100, applying length penalty
    const lengthPenalty = Math.min(wordAnalyses.length / 15, 1) * 20;
    return Math.min(Math.round(((meanDifficulty - 1) / 4) * 80 + lengthPenalty), 100);
  }

  /**
   * Compute verse tajweed complexity (0–100).
   * Mean of per-word tajweed complexity scores.
   */
  computeTajweedComplexity(wordAnalyses: { tajweedComplexity: number }[]): number {
    if (wordAnalyses.length === 0) return 0;
    const mean =
      wordAnalyses.reduce((sum, w) => sum + w.tajweedComplexity, 0) / wordAnalyses.length;
    return Math.round(mean);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Extract the rhyme-ending: last 1–2 bare consonants of the final word.
   * Used to group surahs/ayahs by rhyme pattern.
   */
  extractRhymeEnding(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const lastWord = trimmed.split(/\s+/).pop() ?? '';
    const bare = this.normalizer.toFlatForm(lastWord);

    // Take last 2 consonants (handles tah-marbuta and feminine endings)
    const consonants = [...bare].filter((ch) => /[\u0621-\u064A\u0671]/.test(ch));
    if (consonants.length === 0) return '';
    if (consonants.length === 1) return consonants[0];
    return consonants.slice(-2).join('');
  }
}
