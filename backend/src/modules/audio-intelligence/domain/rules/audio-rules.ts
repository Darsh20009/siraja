/**
 * AudioRules — frozen constants that govern every threshold in the
 * audio intelligence pipeline.
 *
 * This is the single place educators or admins adjust calibration:
 *
 *   • Validation limits   → file size, duration, sample rate
 *   • VAD parameters      → silence gap, confidence threshold
 *   • Alignment matching  → edit-distance tolerance
 *   • Scoring weights     → composite formula coefficients
 *   • Score tiers         → band boundaries for excellent/good/…
 *   • Fluency targets     → ideal WPM for Quranic recitation
 *   • Madd durations      → expected beat-counts per madd type
 *   • Mistake thresholds  → when to escalate severity
 *   • Recommendation caps → max recs returned per session
 */
export const AudioRules = Object.freeze({
  // ── Audio Validation ────────────────────────────────────────────────────────
  /** Maximum accepted file size in bytes (50 MB). */
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,

  /** Minimum accepted file size in bytes (1 KB — guards against empty uploads). */
  MIN_FILE_SIZE_BYTES: 1024,

  /** Maximum accepted duration in seconds (30 minutes). */
  MAX_DURATION_SECONDS: 30 * 60,

  /** Minimum accepted duration in seconds (1 second). */
  MIN_DURATION_SECONDS: 1,

  /** Accepted audio MIME types keyed by file extension. */
  ACCEPTED_MIME_TYPES: {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
  } as Record<string, string>,

  // ── Noise Reduction ─────────────────────────────────────────────────────────
  /** Target sample rate after preprocessing (Hz). */
  TARGET_SAMPLE_RATE: 16000,

  // ── Voice Activity Detection ─────────────────────────────────────────────────
  /** Minimum silence gap (seconds) to trigger a segment boundary. */
  VAD_SILENCE_GAP_SECONDS: 0.4,

  /**
   * Segments with voiceActivityConfidence below this threshold are discarded
   * before alignment. Range: 0–1.
   */
  VAD_CONFIDENCE_THRESHOLD: 0.40,

  /**
   * Minimum segment duration in seconds. Shorter segments after split
   * are merged with their neighbour.
   */
  MIN_SEGMENT_DURATION_SECONDS: 0.3,

  /** Maximum segment duration in seconds; longer segments are split again. */
  MAX_SEGMENT_DURATION_SECONDS: 30.0,

  // ── Quran Alignment ─────────────────────────────────────────────────────────
  /**
   * Maximum Levenshtein edit distance for a recognised word to be
   * considered a match of the expected word.
   * Set conservatively to 2 to handle minor diacritic differences.
   */
  MATCH_EDIT_DISTANCE_THRESHOLD: 2,

  /**
   * Minimum per-word ASR confidence required to attempt alignment.
   * Words below this are treated as noise and skipped.
   */
  MIN_WORD_ASR_CONFIDENCE: 0.20,

  // ── Scoring Weights ──────────────────────────────────────────────────────────
  /**
   * Composite score formula:
   *   composite = accuracy×W_ACCURACY + tajweed×W_TAJWEED +
   *               fluency×W_FLUENCY + consistency×W_CONSISTENCY
   * Must sum to 1.0.
   */
  W_ACCURACY: 0.35,
  W_TAJWEED: 0.30,
  W_FLUENCY: 0.20,
  W_CONSISTENCY: 0.15,

  // ── Score Tiers ──────────────────────────────────────────────────────────────
  TIER_EXCELLENT: 85,
  TIER_GOOD: 70,
  TIER_SATISFACTORY: 50,
  // < TIER_SATISFACTORY → needs_improvement

  // ── Fluency / Pace ───────────────────────────────────────────────────────────
  /**
   * Ideal recitation pace for Hadr (fastest) style in words per minute.
   * Fluency score is 100 when WPM is within [WPM_IDEAL_MIN, WPM_IDEAL_MAX].
   */
  WPM_IDEAL_MIN: 80,
  WPM_IDEAL_MAX: 160,

  /** Penalty applied to fluency score for each second of unexpected silence. */
  FLUENCY_PAUSE_PENALTY_PER_SECOND: 2,

  /** Penalty applied to fluency score for each repeated word. */
  FLUENCY_REPEAT_PENALTY: 5,

  // ── Madd (Elongation) Counts ────────────────────────────────────────────────
  /** Expected beat-counts for each madd type. */
  MADD_TABII_COUNTS: 2,
  MADD_MUTTASIL_COUNTS: 4,
  MADD_MUNFASIL_COUNTS: 4,
  MADD_LAZIM_COUNTS: 6,
  GHUNNA_COUNTS: 2,

  /**
   * Tolerance: a madd is 'correct' if measuredCounts is within ±MADD_TOLERANCE
   * of the expected count.
   */
  MADD_TOLERANCE: 0.5,

  // ── Mistake Severity Thresholds ──────────────────────────────────────────────
  /**
   * Mistake types that are always 'critical' regardless of frequency.
   */
  CRITICAL_MISTAKE_TYPES: [
    'skipped_ayah',
    'wrong_ayah_order',
  ] as readonly string[],

  /**
   * Mistake types that are 'major' by default (become critical if recurring).
   */
  MAJOR_MISTAKE_TYPES: [
    'skipped_word',
    'madd_error',
    'iqlab_error',
    'idgham_error',
  ] as readonly string[],

  /**
   * Number of occurrences of the same type required to mark isRecurring.
   */
  RECURRENCE_THRESHOLD: 2,

  /**
   * Number of consecutive critical mistakes that trigger a 'high' priority
   * recommendation regardless of overall score.
   */
  CRITICAL_MISTAKE_HIGH_PRIORITY_THRESHOLD: 1,

  // ── Recommendations ──────────────────────────────────────────────────────────
  /** Maximum number of recommendations returned per session. */
  MAX_RECOMMENDATIONS: 5,

  /**
   * Minimum compositeScore below which a 'fluency' recommendation is added.
   */
  LOW_FLUENCY_THRESHOLD: 60,

  /**
   * Minimum tajweedScore below which a 'tajweed_practice' recommendation
   * is added at high priority.
   */
  LOW_TAJWEED_HIGH_THRESHOLD: 50,

  /**
   * Minimum tajweedScore below which a 'tajweed_practice' recommendation
   * is added at medium priority.
   */
  LOW_TAJWEED_MEDIUM_THRESHOLD: 70,

  /**
   * Minimum accuracyScore below which a 'memorization_gap' recommendation
   * is added.
   */
  LOW_ACCURACY_THRESHOLD: 70,

  /**
   * compositeScore above which a 'positive_feedback' recommendation is added.
   */
  POSITIVE_FEEDBACK_THRESHOLD: 85,

  /**
   * Minimum consistencyScore below which a 'consistency' recommendation
   * is added.
   */
  LOW_CONSISTENCY_THRESHOLD: 60,
});
