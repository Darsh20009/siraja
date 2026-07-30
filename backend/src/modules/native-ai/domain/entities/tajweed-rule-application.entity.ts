/**
 * TajweedRuleApplication — a single tajweed rule instance detected in
 * a text, produced by the TajweedRuleEngine.
 */

export type TajweedRuleType =
  // ── Noon sakinah / Tanwin rules ─────────────────────────────────────
  | 'idhar'              // Clear pronunciation before throat letters
  | 'idgham_bighunn'     // Assimilation with nasalisation (ي ن م و)
  | 'idgham_bilaghunna'  // Assimilation without nasalisation (ل ر)
  | 'iqlab'              // Conversion to meem before ب
  | 'ikhfa'              // Concealment before 15 letters
  // ── Meem sakinah rules ──────────────────────────────────────────────
  | 'idgham_shafawi'     // Merging of meem before meem
  | 'ikhfa_shafawi'      // Concealment of meem before ب
  | 'idhar_shafawi'      // Clear meem before all other letters
  // ── Madd (elongation) rules ─────────────────────────────────────────
  | 'madd_tabii'         // Natural madd — 2 counts
  | 'madd_muttasil'      // Connected madd (hamza after madd, same word) — 4–5
  | 'madd_munfasil'      // Separated madd (hamza after madd, next word) — 2–5
  | 'madd_lazim'         // Obligatory madd (sukun/shadda after madd) — 6
  | 'madd_arid'          // Contingent madd on waqf — 2, 4, or 6
  | 'madd_badal'         // Replacement madd — 2
  | 'madd_lin'           // Softness madd on waqf — 2 or 4
  // ── Qalqala ─────────────────────────────────────────────────────────
  | 'qalqala_sughra'     // Minor qalqala (sukun in middle of word)
  | 'qalqala_kubra'      // Major qalqala (at pause/end of word)
  // ── Ghunna ──────────────────────────────────────────────────────────
  | 'ghunna'             // Nasalisation — 2 counts
  // ── Tafkhim / Tarqiq ────────────────────────────────────────────────
  | 'tafkhim'            // Heavy pronunciation
  | 'tarqiq'             // Light pronunciation
  // ── Lam rules ───────────────────────────────────────────────────────
  | 'lam_shamsiyya'      // Solar lam — assimilated
  | 'lam_qamariyya'      // Lunar lam — pronounced
  // ── Waqf (stopping) ─────────────────────────────────────────────────
  | 'waqf_tam'           // Complete stop at ayah end
  | 'waqf_kafi'          // Sufficient stop mid-ayah
  | 'waqf_hasan'         // Good stop (sense complete)
  | 'waqf_qabih';        // Ugly stop (sense incomplete)

export type TajweedCategory =
  | 'noon_rules'
  | 'meem_rules'
  | 'madd'
  | 'qalqala'
  | 'ghunna'
  | 'tafkhim_tarqiq'
  | 'lam_rules'
  | 'waqf';

export interface TajweedRuleApplication {
  rule: TajweedRuleType;
  category: TajweedCategory;
  /** 0-based word index within the analysed text. */
  wordIndex: number;
  /** 0-based letter index within the word (if applicable). */
  letterIndex?: number;
  /** Number of beat-counts required (madd/ghunna). */
  expectedCounts?: number;
  /** The letter(s) that triggered the rule. */
  triggerText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Human-readable description for sheikh/student display. */
  description: string;
}
