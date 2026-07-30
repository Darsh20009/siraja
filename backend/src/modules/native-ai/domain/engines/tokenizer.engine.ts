import {
  DIACRITICS_REGEX,
  TATWEEL_REGEX,
  ALEF_VARIANTS_REGEX,
  ALEF,
  ALEF_MAQSURA,
  YAH,
  PREFIXES,
  SUFFIXES,
  PARTICLES,
} from '../rules/arabic.rules';
import type { QuranToken, MorphemeBreakdown, TokenType } from '../entities/quran-token.entity';

/**
 * TokenizerEngine — splits Arabic Quran text into structured tokens.
 *
 * Responsibilities:
 *  1. Split on whitespace to produce word-level tokens.
 *  2. Normalise each token (diacritic-strip, alef-unify).
 *  3. Attempt morpheme breakdown (prefix / stem / suffix).
 *  4. Classify the token type.
 *
 * No NestJS dependencies — instantiate with `new TokenizerEngine()`.
 */
export class TokenizerEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Tokenize a plain Arabic string.
   * Does not assign Quran coordinates; use `tokenizeAyah` for that.
   */
  tokenize(text: string): QuranToken[] {
    const words = this.splitWords(text);
    return words.map((w, idx) => this.buildToken(w, idx));
  }

  /**
   * Tokenize a single ayah, enriching each token with its Quran position.
   */
  tokenizeAyah(
    arabicText: string,
    surahNumber: number,
    ayahNumber: number,
  ): QuranToken[] {
    const words = this.splitWords(arabicText);
    return words.map((w, idx) => ({
      ...this.buildToken(w, idx),
      surahNumber,
      ayahNumber,
      wordIndex: idx,
    }));
  }

  /**
   * Split Arabic text into individual word strings.
   * Collapses multiple whitespace and removes empty entries.
   */
  splitWords(text: string): string[] {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  /**
   * Attempt a shallow morpheme breakdown for a single normalised Arabic word.
   *
   * The breakdown is rule-based (not dictionary-driven) and operates
   * on the normalised form.  Accuracy is sufficient for difficulty
   * estimation and pattern detection.
   */
  splitMorphemes(word: string): MorphemeBreakdown {
    const normalised = this.normalise(word);

    // Particles are not decomposed
    if (PARTICLES.has(normalised)) {
      return { stem: normalised };
    }

    let remaining = normalised;
    let prefix: string | undefined;
    let suffix: string | undefined;

    // Strip longest matching prefix first
    for (const p of PREFIXES) {
      if (remaining.startsWith(p) && remaining.length > p.length + 1) {
        prefix = p;
        remaining = remaining.slice(p.length);
        break;
      }
    }

    // Strip longest matching suffix
    for (const s of SUFFIXES) {
      if (remaining.endsWith(s) && remaining.length > s.length + 1) {
        suffix = s;
        remaining = remaining.slice(0, -s.length);
        break;
      }
    }

    return { prefix, stem: remaining, suffix };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildToken(word: string, position: number): QuranToken {
    const normalized = this.normalise(word);
    const morphemes = this.splitMorphemes(word);
    const letterCount = this.countLetters(normalized);
    const type = this.classifyToken(normalized);

    return {
      text: word,
      normalized,
      type,
      position,
      morphemes,
      letterCount,
    };
  }

  /** Strip diacritics, kashida, normalise alef/ya. */
  normalise(text: string): string {
    return text
      .replace(DIACRITICS_REGEX, '')
      .replace(TATWEEL_REGEX, '')
      .replace(ALEF_VARIANTS_REGEX, ALEF)
      .replace(new RegExp(ALEF_MAQSURA, 'g'), YAH)
      .trim();
  }

  /**
   * Count true Arabic letter characters (excludes diacritics, spaces).
   */
  private countLetters(normalised: string): number {
    // Arabic letter range U+0600–U+06FF (excluding control/diacritics)
    return [...normalised].filter((ch) => /[\u0621-\u064A\u0671-\u06D3]/.test(ch)).length;
  }

  private classifyToken(normalised: string): TokenType {
    // Arabic numeral (Hindi/Arabic-Indic digits)
    if (/^[\u0660-\u0669\u06F0-\u06F9\d]+$/.test(normalised)) return 'number';
    // Punctuation / Quran symbol
    if (/^[\u0600-\u0605\u060C\u060D\u061B-\u061F\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EB-\u06ED]/.test(normalised))
      return 'punctuation';
    // Particle — very short or in known set
    if (PARTICLES.has(normalised) || normalised.length <= 2) return 'particle';
    return 'word';
  }
}
