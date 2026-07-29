/**
 * TajweedRule — the set of classical tajweed rules the pipeline can
 * evaluate. Each rule maps to a specific acoustic feature or timing pattern
 * that can be measured without external AI (e.g., madd duration, ghunna
 * presence, qalqala echo).
 */
export type TajweedRule =
  | 'madd_tabii'        // Natural elongation — 2 counts (alif, waw, ya after matching vowel)
  | 'madd_muttasil'     // Connected elongation — 4-5 counts (madd letter + hamza, same word)
  | 'madd_munfasil'     // Separated elongation — 4-5 counts (madd letter + hamza, next word)
  | 'madd_lazim'        // Obligatory elongation — 6 counts
  | 'ghunna'            // Nasalisation — 2 counts (noon/meem with shadda)
  | 'qalqala'           // Echo/bouncing on qaf, ta, ba, jeem, dal
  | 'idgham_bighunn'    // Merging with nasalisation (noon-sakinah/tanwin + ya,ra,meem,lam,waw,nun)
  | 'idgham_bilaghunn'  // Merging without nasalisation (noon-sakinah + ra,lam)
  | 'iqlab'             // Noon-sakinah/tanwin → meem before ba
  | 'ikhfa'             // Concealment of noon-sakinah/tanwin before 15 letters
  | 'izhar'             // Clear pronunciation of noon-sakinah/tanwin before throat letters
  | 'tafkhim'           // Heavy/emphatic pronunciation
  | 'tarqiq'            // Light pronunciation
  | 'waqf_tam'          // Complete stop (end of ayah)
  | 'waqf_kafi';        // Sufficient stop (meaning complete, grammar continues)

/**
 * ObservationOutcome — the evaluation result for a single tajweed rule
 * application detected in the audio.
 *
 * 'undetectable' is returned by the null provider or when the audio
 * quality is insufficient to make a determination.
 */
export type ObservationOutcome = 'correct' | 'incorrect' | 'undetectable';

/**
 * TajweedObservation — a single application of a tajweed rule in the
 * audio stream, evaluated as correct, incorrect, or undetectable.
 *
 * Domain entity: plain TypeScript interface. Stored in the
 * `tajweed_observations` collection, linked by sessionId.
 *
 * Incorrect observations with severity-mapped rules are promoted to
 * MistakeDetection records by the MistakeDetection pipeline stage.
 */
export interface TajweedObservation {
  id: string;

  /** Parent session. */
  sessionId: string;

  /** The segment in which this rule application was observed. */
  segmentId?: string;

  rule: TajweedRule;
  outcome: ObservationOutcome;

  /**
   * For madd rules: the expected number of beat-counts (2, 4, 5, or 6).
   * For ghunna: expected 2 counts.
   */
  expectedCounts?: number;

  /**
   * For duration-based rules: the measured count-equivalent duration.
   * Derived from frame-level timing in the feature extraction stage.
   * 0 when the null provider is active.
   */
  measuredCounts?: number;

  /** Quran position of this rule application. */
  surahNumber?: number;
  ayahNumber?: number;
  wordIndex?: number;

  /** Time offset in audio. */
  startSeconds?: number;

  /** Human-readable description for UI display. */
  description: string;

  createdAt: Date;
}
