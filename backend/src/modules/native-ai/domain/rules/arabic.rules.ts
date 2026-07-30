/**
 * ArabicRules — immutable lookup tables for Arabic text analysis.
 *
 * All data is encoded as frozen constants; no runtime computation.
 * Engines import only what they need.
 */

// ── Unicode ranges / character sets ─────────────────────────────────────────

/** Diacritic / tashkeel characters (harakat, shadda, sukun, etc.) */
export const DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/** Tatweel / kashida (elongation mark). */
export const TATWEEL_REGEX = /\u0640/g;

/** Alef variants that should normalise to bare alef (ا). */
export const ALEF_VARIANTS_REGEX = /[\u0622\u0623\u0625\u0671]/g;
export const ALEF = '\u0627';

/** Tah marbuta → Hah (for root-extraction contexts). */
export const TAH_MARBUTA = '\u0629';
export const HAH = '\u0647';

/** Alef maqsura → Yah (search normalisation). */
export const ALEF_MAQSURA = '\u0649';
export const YAH = '\u064A';

/** Hamza on its own (no chair). */
export const HAMZA = '\u0621';

/** Shadda diacritic. */
export const SHADDA = '\u0651';

/** Sukun diacritic. */
export const SUKUN = '\u0652';

/** Noon. */
export const NOON = '\u0646';

/** Meem. */
export const MEEM = '\u0645';

/** Arabic alphabet in order (28 letters). */
export const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

// ── Tajweed letter sets ───────────────────────────────────────────────────────

/**
 * Solar letters (شمسية) — the 14 letters that cause lam-assimilation
 * when preceded by the definite article ال.
 */
export const SOLAR_LETTERS = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']);

/**
 * Lunar letters (قمرية) — pronounced with a clear lam after ال.
 */
export const LUNAR_LETTERS = new Set(['ا', 'ب', 'ج', 'ح', 'خ', 'ع', 'غ', 'ف', 'ق', 'ك', 'م', 'ه', 'و', 'ي']);

/** Qalqala letters — produce an echoing rebound on sukun or pause. */
export const QALQALA_LETTERS = new Set(['ق', 'ط', 'ب', 'ج', 'د']);

/** Long-vowel madd carrier letters (alef, waw, yah). */
export const MADD_LETTERS = new Set(['ا', 'و', 'ي']);

/**
 * Throat letters for idhar noon-sakinah rule:
 *   ء هـ ع غ ح خ
 */
export const IDHAR_LETTERS = new Set(['ء', 'ه', 'ع', 'غ', 'ح', 'خ']);

/**
 * Idgham-bighunn letters (assimilation with nasalisation):
 *   ي ن م و
 */
export const IDGHAM_BIGHUNN_LETTERS = new Set(['ي', 'ن', 'م', 'و']);

/**
 * Idgham-bilaghunna letters (assimilation without nasalisation):
 *   ل ر
 */
export const IDGHAM_BILAGHUNNA_LETTERS = new Set(['ل', 'ر']);

/** Iqlab trigger letter: ب */
export const IQLAB_LETTER = 'ب';

/**
 * Ikhfa letters (15 letters where noon-sakinah/tanwin is concealed):
 *   ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ
 */
export const IKHFA_LETTERS = new Set(['ص', 'ذ', 'ث', 'ك', 'ج', 'ش', 'ق', 'س', 'د', 'ط', 'ز', 'ف', 'ت', 'ض', 'ظ']);

/**
 * Tafkhim (heavy) letters — always pronounced with full-mouth resonance.
 *   ص ض ط ظ غ خ ق
 */
export const TAFKHIM_LETTERS = new Set(['ص', 'ض', 'ط', 'ظ', 'غ', 'خ', 'ق']);

// ── Morphology ───────────────────────────────────────────────────────────────

/** Common Arabic proclitics (prefix clitics). */
export const PREFIXES = ['وال', 'بال', 'لل', 'كال', 'فال', 'وَ', 'فَ', 'بِ', 'كَ', 'لِ', 'وِ', 'ال'] as const;

/** Common Arabic enclitics (suffix clitics) ordered longest-first. */
export const SUFFIXES = ['كم', 'كن', 'هم', 'هن', 'ها', 'نا', 'تم', 'تن', 'ون', 'ين', 'ان', 'ات', 'ية', 'ة', 'ي', 'ه', 'ك'] as const;

/** Particle words that should not be stemmed. */
export const PARTICLES = new Set([
  'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بعد', 'قبل', 'حتى', 'إن', 'أن',
  'لا', 'لم', 'لن', 'قد', 'كان', 'هو', 'هي', 'هم', 'هن', 'نحن', 'أنت',
  'ما', 'لما', 'إذا', 'إذ', 'ثم', 'بل', 'أو', 'أم', 'لكن',
]);

// ── Memorization / Spaced repetition ────────────────────────────────────────

/** SM-2 minimum ease factor. */
export const SM2_MIN_EASE = 1.3;

/** SM-2 default starting ease factor. */
export const SM2_DEFAULT_EASE = 2.5;

/** SM-2 ease adjustment step. */
export const SM2_EASE_STEP = 0.1;

/** Ebbinghaus stability coefficient for average learner. */
export const EBBINGHAUS_STABILITY = 1.84;

/** Forgetting rate above which "high burden" is flagged (per day). */
export const HIGH_FORGETTING_RATE = 0.08;

// ── Scoring ──────────────────────────────────────────────────────────────────

/** Letter tajweed complexity weights (1–5). */
export const LETTER_COMPLEXITY: Record<string, number> = {
  // Simple letters
  'ب': 1, 'ت': 1, 'ث': 1, 'ج': 2, 'د': 1, 'ذ': 2,
  'ر': 3, 'ز': 2, 'س': 2, 'ش': 2, 'ف': 1, 'ك': 1,
  'ل': 2, 'م': 1, 'ن': 2, 'ه': 1, 'و': 2, 'ي': 2,
  // Qalqala (moderate)
  'ق': 3, 'ط': 3, 'بق': 3,
  // Heavy / emphatic
  'ص': 4, 'ض': 4, 'ظ': 4,
  // Throat
  'ح': 3, 'خ': 3, 'ع': 4, 'غ': 4,
  // Hamza
  'ء': 3, 'أ': 3, 'إ': 3, 'آ': 3,
  // Madd
  'ا': 2, 'وـ': 2, 'يـ': 2,
};
