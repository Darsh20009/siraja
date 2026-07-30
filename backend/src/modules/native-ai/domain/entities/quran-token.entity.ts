/**
 * QuranToken — the atomic unit produced by the TokenizerEngine.
 *
 * A token represents one whitespace-delimited word from Arabic Quran text,
 * enriched with position, normalization, and morpheme data.
 */

export type TokenType = 'word' | 'particle' | 'number' | 'punctuation';

/**
 * MorphemeBreakdown — prefix / stem / suffix split.
 *
 * Arabic words can carry cliticised prepositions, conjunctions and
 * pronouns that are not separable in the Uthmani script:
 *   وَفِي (wa + fi) = "and in"
 *   لِلنَّاسِ (li + al + naas) = "for the people"
 */
export interface MorphemeBreakdown {
  /** Proclitics: conjunction, preposition, definite article. */
  prefix?: string;
  /** The lexical core after stripping prefix and suffix. */
  stem: string;
  /** Enclitics: possessive/object pronouns, case endings. */
  suffix?: string;
}

export interface QuranToken {
  /** Original text including diacritics (tashkeel). */
  text: string;
  /** Stripped, normalised form used for comparison. */
  normalized: string;
  type: TokenType;
  /** 0-based sequential index in the token stream. */
  position: number;
  surahNumber?: number;
  ayahNumber?: number;
  /** 0-based word index within the ayah. */
  wordIndex?: number;
  morphemes: MorphemeBreakdown;
  letterCount: number;
}
