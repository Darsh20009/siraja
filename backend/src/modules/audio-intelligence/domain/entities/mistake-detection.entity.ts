/**
 * AudioMistakeType — the taxonomy of recitation errors the pipeline can
 * detect from audio evidence alone.
 *
 * Structural errors (wrong_word, skipped_word, wrong_ayah_order, skipped_ayah)
 * derive from word alignment. Tajweed-specific errors (madd_*, ghunna_*,
 * qalqala_*, …) are promoted from TajweedObservation when outcome = 'incorrect'.
 */
export type AudioMistakeType =
  | 'wrong_word'          // Said a different word than expected
  | 'skipped_word'        // Expected word absent from recognised stream
  | 'repeated_word'       // Same word repeated consecutively
  | 'wrong_ayah_order'    // Ayah sequence mismatch
  | 'skipped_ayah'        // Entire ayah missing from alignment
  | 'pronunciation_error' // Low-confidence match (word present but unclear)
  | 'madd_error'          // Incorrect elongation duration
  | 'ghunna_error'        // Missing or incorrect nasalisation
  | 'qalqala_error'       // Incorrect echoing consonant
  | 'waqf_error'          // Stop at an invalid position
  | 'idgham_error'        // Failed assimilation of nun-sakinah/tanwin
  | 'iqlab_error'         // Nun-sakinah not converted to meem before ba
  | 'ikhfa_error';        // Nun-sakinah not correctly concealed

/** Severity follows the same scale as QuranMistake for cross-module consistency. */
export type AudioMistakeSeverity = 'critical' | 'major' | 'minor';

/**
 * MistakeDetection — a single recitation error identified by the audio
 * pipeline.
 *
 * Domain entity: plain TypeScript interface. Stored in the
 * `audio_mistake_detections` collection, linked by sessionId so mistakes
 * can be queried independently of the full session document.
 */
export interface MistakeDetection {
  id: string;

  /** Parent session. */
  sessionId: string;

  /** The segment where the mistake occurred, if localised. */
  segmentId?: string;

  type: AudioMistakeType;
  severity: AudioMistakeSeverity;

  /** Quran position of the mistake. Absent for session-level errors. */
  surahNumber?: number;
  ayahNumber?: number;

  /**
   * Zero-based word position within the ayah.
   * Present for word-level errors (wrong_word, skipped_word, …).
   */
  wordIndex?: number;

  /** The text the student produced (from ASR). Absent on skipped words. */
  recognisedText?: string;

  /** The Quran text that was expected at this position. */
  expectedText?: string;

  /** Time offset within the audio where the mistake occurred. */
  startSeconds?: number;

  /** Human-readable description of the mistake for sheikh/parent display. */
  description: string;

  /**
   * Whether this same error type appeared in at least one other word in
   * this session. Recurring mistakes indicate a systematic gap rather
   * than an isolated slip.
   */
  isRecurring: boolean;

  createdAt: Date;
}
