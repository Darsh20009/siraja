/**
 * LetterProperties — tajweed and phonological properties of a single
 * Arabic letter.
 *
 * These are static properties encoded in the LetterAnalyzerEngine's
 * lookup table; they do not change with context.  Context-sensitive
 * properties (e.g. tafkhim of راء) are computed separately.
 */

/**
 * Makhraj (مَخرَج) — primary place of articulation.
 * Names follow the classical 17-makhraj taxonomy.
 */
export type Makhraj =
  | 'throat_deep'        // أ هـ — جوف / أقصى الحلق
  | 'throat_mid'         // ع غ — وسط الحلق
  | 'throat_upper'       // ح خ — أدنى الحلق
  | 'tongue_back'        // ق — أقصى اللسان
  | 'tongue_back_roof'   // ك — دون ق
  | 'tongue_mid'         // ج ش ي — وسط اللسان
  | 'tongue_side'        // ض — حافة اللسان
  | 'tongue_front_tip'   // ل — أدنى اللسان
  | 'tongue_tip_gum'     // ن — طرف اللسان
  | 'tongue_tip_back'    // ر — تكرار الطرف
  | 'tongue_tip_teeth'   // ط د ت — ظهر اللسان مع الثنايا
  | 'tongue_tip_upper'   // ظ ذ ث — طرف اللسان مع الثنايا
  | 'tongue_tip_lower'   // ز س ص — طرف اللسان مع الأسنان
  | 'lower_lip_upper_teeth' // ف
  | 'both_lips'          // ب م و
  | 'nasal_passage';     // غنة (ن م — nasal resonance)

export interface LetterProperties {
  /** Unicode code point, e.g. '\u0627' for ا. */
  codepoint: string;
  /** ISO transliteration name, e.g. 'Alef'. */
  name: string;
  /** Arabic name, e.g. 'أَلِف'. */
  arabicName: string;
  makhraj: Makhraj;

  // ── Tajweed categories ──────────────────────────────────────────────
  /** True for the 14 solar letters that cause lam-assimilation. */
  isSolar: boolean;
  /** True for the remaining lunar letters. */
  isLunar: boolean;
  /** Qalqala letters: ق ط ب ج د — produce an echo on sukun/waqf. */
  isQalqala: boolean;
  /** Natural ghunna carrier: ن or م. */
  hasNaturalGhunna: boolean;
  /** Long-vowel carrier: ا و ي. */
  isMaddLetter: boolean;
  /** Hamza variants: ء أ إ آ ؤ ئ. */
  isHamza: boolean;
  /** Throat letters used in idhar noon-sakinah rule: ء هـ ع غ ح خ. */
  isIdharLetter: boolean;
  /**
   * Inherent pronunciation weight.
   *   heavy = always tafkhim (e.g. ص ض ط ظ غ خ)
   *   light = always tarqiq (most letters)
   *   contextual = depends on haraka/position (ر، ل، ا)
   */
  tafkhim: 'heavy' | 'light' | 'contextual';
  /**
   * Relative tajweed complexity for learners (1 = trivial, 5 = expert).
   * Used to compute word and verse difficulty scores.
   */
  tajweedComplexityScore: number;
}
