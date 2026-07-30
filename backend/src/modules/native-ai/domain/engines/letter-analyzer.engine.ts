import {
  SOLAR_LETTERS,
  LUNAR_LETTERS,
  QALQALA_LETTERS,
  MADD_LETTERS,
  IDHAR_LETTERS,
  TAFKHIM_LETTERS,
  LETTER_COMPLEXITY,
} from '../rules/arabic.rules';
import { NormalizationEngine } from './normalization.engine';
import type { LetterProperties, Makhraj } from '../entities/letter-properties.entity';

/**
 * LetterAnalyzerEngine — per-letter tajweed and phonological properties.
 *
 * Encodes the classical Arabic tajweed taxonomy in a lookup table and
 * exposes query methods used by higher-level engines.
 *
 * No NestJS dependencies — instantiate with `new LetterAnalyzerEngine()`.
 */
export class LetterAnalyzerEngine {
  private readonly normalizer = new NormalizationEngine();
  private readonly lookup: ReadonlyMap<string, LetterProperties>;

  constructor() {
    this.lookup = this.buildLookup();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Retrieve all static properties for a single Arabic letter.
   * Strips diacritics before lookup.
   */
  analyze(letter: string): LetterProperties | undefined {
    const bare = this.normalizer.stripDiacritics(letter).charAt(0);
    return this.lookup.get(bare);
  }

  /** True if the letter is solar (causes lam-assimilation). */
  isSolar(letter: string): boolean {
    return SOLAR_LETTERS.has(this.bare(letter));
  }

  /** True if the letter is lunar. */
  isLunar(letter: string): boolean {
    return LUNAR_LETTERS.has(this.bare(letter));
  }

  /** True if the letter is a qalqala letter (ق ط ب ج د). */
  isQalqala(letter: string): boolean {
    return QALQALA_LETTERS.has(this.bare(letter));
  }

  /** True if the letter is a madd (long-vowel carrier) letter. */
  isMadd(letter: string): boolean {
    return MADD_LETTERS.has(this.bare(letter));
  }

  /** True if the letter is one of the 6 idhar (throat) letters. */
  isIdhar(letter: string): boolean {
    return IDHAR_LETTERS.has(this.bare(letter));
  }

  /** True if the letter inherently has heavy (tafkhim) pronunciation. */
  isTafkhim(letter: string): boolean {
    return TAFKHIM_LETTERS.has(this.bare(letter));
  }

  /**
   * Tajweed complexity of a full word (1–5 scale, averaged over letters).
   * Returns 0 for empty strings.
   */
  getTajweedComplexity(text: string): number {
    const bare = this.normalizer.stripDiacritics(text);
    const scores: number[] = [];
    for (const ch of bare) {
      const score = LETTER_COMPLEXITY[ch];
      if (score !== undefined) scores.push(score);
    }
    if (scores.length === 0) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Scale from 1–5 to 0–100
    return Math.round(((mean - 1) / 4) * 100);
  }

  /**
   * Frequency map of each unique letter in a text.
   * Letters are normalised (diacritics stripped).
   */
  letterFrequency(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    const bare = this.normalizer.stripDiacritics(text);
    for (const ch of bare) {
      if (/[\u0621-\u064A\u0671]/.test(ch)) {
        freq.set(ch, (freq.get(ch) ?? 0) + 1);
      }
    }
    return freq;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private bare(letter: string): string {
    return this.normalizer.stripDiacritics(letter).charAt(0);
  }

  private buildLookup(): ReadonlyMap<string, LetterProperties> {
    const table: Array<[string, Omit<LetterProperties, 'codepoint'>]> = [
      ['ا', { name: 'Alef', arabicName: 'أَلِف', makhraj: 'throat_deep', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: true, isHamza: false, isIdharLetter: false, tafkhim: 'contextual', tajweedComplexityScore: 2 }],
      ['ب', { name: 'Ba', arabicName: 'بَاء', makhraj: 'both_lips', isSolar: false, isLunar: true, isQalqala: true, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 3 }],
      ['ت', { name: 'Ta', arabicName: 'تَاء', makhraj: 'tongue_tip_teeth', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 1 }],
      ['ث', { name: 'Tha', arabicName: 'ثَاء', makhraj: 'tongue_tip_upper', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ج', { name: 'Jim', arabicName: 'جِيم', makhraj: 'tongue_mid', isSolar: false, isLunar: true, isQalqala: true, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 3 }],
      ['ح', { name: 'Ha', arabicName: 'حَاء', makhraj: 'throat_upper', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: true, tafkhim: 'light', tajweedComplexityScore: 3 }],
      ['خ', { name: 'Kha', arabicName: 'خَاء', makhraj: 'throat_upper', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: true, tafkhim: 'heavy', tajweedComplexityScore: 3 }],
      ['د', { name: 'Dal', arabicName: 'دَال', makhraj: 'tongue_tip_teeth', isSolar: true, isLunar: false, isQalqala: true, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ذ', { name: 'Dhal', arabicName: 'ذَال', makhraj: 'tongue_tip_upper', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ر', { name: 'Ra', arabicName: 'رَاء', makhraj: 'tongue_tip_back', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'contextual', tajweedComplexityScore: 3 }],
      ['ز', { name: 'Zay', arabicName: 'زَاي', makhraj: 'tongue_tip_lower', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['س', { name: 'Sin', arabicName: 'سِين', makhraj: 'tongue_tip_lower', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ش', { name: 'Shin', arabicName: 'شِين', makhraj: 'tongue_mid', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ص', { name: 'Sad', arabicName: 'صَاد', makhraj: 'tongue_tip_lower', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ض', { name: 'Dad', arabicName: 'ضَاد', makhraj: 'tongue_side', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ط', { name: 'Ta (emphatic)', arabicName: 'طَاء', makhraj: 'tongue_tip_teeth', isSolar: true, isLunar: false, isQalqala: true, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ظ', { name: 'Dha', arabicName: 'ظَاء', makhraj: 'tongue_tip_upper', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ع', { name: 'Ayn', arabicName: 'عَين', makhraj: 'throat_mid', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: true, tafkhim: 'light', tajweedComplexityScore: 4 }],
      ['غ', { name: 'Ghayn', arabicName: 'غَين', makhraj: 'throat_mid', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: true, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ف', { name: 'Fa', arabicName: 'فَاء', makhraj: 'lower_lip_upper_teeth', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 1 }],
      ['ق', { name: 'Qaf', arabicName: 'قَاف', makhraj: 'tongue_back', isSolar: false, isLunar: true, isQalqala: true, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'heavy', tajweedComplexityScore: 4 }],
      ['ك', { name: 'Kaf', arabicName: 'كَاف', makhraj: 'tongue_back_roof', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 1 }],
      ['ل', { name: 'Lam', arabicName: 'لَام', makhraj: 'tongue_front_tip', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'contextual', tajweedComplexityScore: 2 }],
      ['م', { name: 'Meem', arabicName: 'مِيم', makhraj: 'both_lips', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: true, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ن', { name: 'Noon', arabicName: 'نُون', makhraj: 'tongue_tip_gum', isSolar: true, isLunar: false, isQalqala: false, hasNaturalGhunna: true, isMaddLetter: false, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 3 }],
      ['ه', { name: 'Ha (soft)', arabicName: 'هَاء', makhraj: 'throat_deep', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: false, isIdharLetter: true, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['و', { name: 'Waw', arabicName: 'وَاو', makhraj: 'both_lips', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: true, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ي', { name: 'Ya', arabicName: 'يَاء', makhraj: 'tongue_mid', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: true, isHamza: false, isIdharLetter: false, tafkhim: 'light', tajweedComplexityScore: 2 }],
      ['ء', { name: 'Hamza', arabicName: 'هَمزَة', makhraj: 'throat_deep', isSolar: false, isLunar: true, isQalqala: false, hasNaturalGhunna: false, isMaddLetter: false, isHamza: true, isIdharLetter: true, tafkhim: 'light', tajweedComplexityScore: 3 }],
    ];

    const map = new Map<string, LetterProperties>();
    for (const [letter, props] of table) {
      map.set(letter, {
        codepoint: letter.codePointAt(0)?.toString(16).padStart(4, '0').toUpperCase() ?? '',
        ...props,
      });
    }
    return map;
  }
}
