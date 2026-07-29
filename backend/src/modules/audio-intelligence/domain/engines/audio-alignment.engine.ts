import { AudioRules } from '../rules/audio-rules';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type { TranscriptionWord } from '../../infrastructure/providers/interfaces/speech-recognition.provider.interface';

export interface AyahWordData {
  surahNumber: number;
  ayahNumber: number;
  wordIndex: number;
  arabicText: string;
}

export interface AlignmentResult {
  wordAlignments: WordAlignment[];
  /** Total words in the expected corpus range */
  totalExpectedWords: number;
  /** Words with isMatch = true */
  correctWords: number;
  /** Expected words absent from ASR output */
  deletedWords: number;
  /** Recognised words absent from expected corpus */
  insertedWords: number;
}

/**
 * AudioAlignmentEngine — maps ASR-recognised Arabic words to their expected
 * positions in the Quran corpus using global sequence alignment.
 *
 * Algorithm: Needleman-Wunsch global alignment with Arabic-aware edit
 * distance as the mismatch penalty. This tolerates minor diacritic
 * differences (e.g. shadda dropped or added) without treating them as
 * wrong words.
 *
 * No NestJS dependencies — instantiated with `new AudioAlignmentEngine()`
 * inside use cases and pipeline stages.
 */
export class AudioAlignmentEngine {
  // ── Alignment scoring constants ────────────────────────────────────────────
  private static readonly MATCH_SCORE = 2;
  private static readonly MISMATCH_SCORE = -1;
  private static readonly GAP_PENALTY = -2;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Align ASR-recognised words against the expected Quran word sequence.
   *
   * @param recognisedWords  Words returned by the ASR provider.
   * @param expectedWords    Words from the Quran corpus for the recited range.
   * @param segmentId        ID of the AudioSegment this alignment belongs to.
   * @returns                Structured alignment with per-word match results.
   */
  align(
    recognisedWords: TranscriptionWord[],
    expectedWords: AyahWordData[],
    segmentId: string,
  ): AlignmentResult {
    if (expectedWords.length === 0) {
      return {
        wordAlignments: [],
        totalExpectedWords: 0,
        correctWords: 0,
        deletedWords: 0,
        insertedWords: recognisedWords.length,
      };
    }

    // Filter out very low-confidence words before alignment
    const filteredRecognised = recognisedWords.filter(
      (w) => w.confidence >= AudioRules.MIN_WORD_ASR_CONFIDENCE,
    );

    if (filteredRecognised.length === 0) {
      // No usable recognised words → all expected words are deletions
      const alignments: WordAlignment[] = expectedWords.map((exp) => ({
        segmentId,
        recognisedText: '',
        expectedText: exp.arabicText,
        surahNumber: exp.surahNumber,
        ayahNumber: exp.ayahNumber,
        wordIndex: exp.wordIndex,
        startSeconds: 0,
        endSeconds: 0,
        confidence: 0,
        isMatch: false,
        editDistance: Number.MAX_SAFE_INTEGER,
      }));
      return {
        wordAlignments: alignments,
        totalExpectedWords: expectedWords.length,
        correctWords: 0,
        deletedWords: expectedWords.length,
        insertedWords: 0,
      };
    }

    const traceback = this.needlemanWunsch(
      filteredRecognised.map((w) => w.text),
      expectedWords.map((w) => w.arabicText),
    );

    return this.buildAlignmentResult(
      traceback,
      filteredRecognised,
      expectedWords,
      segmentId,
    );
  }

  // ── Needleman-Wunsch ───────────────────────────────────────────────────────

  /**
   * Global sequence alignment between two string sequences.
   * Returns aligned index pairs where -1 indicates a gap.
   * [recIdx, expIdx] — -1 on either side = gap.
   */
  private needlemanWunsch(
    recognised: string[],
    expected: string[],
  ): Array<[number, number]> {
    const R = recognised.length;
    const E = expected.length;

    // Build score matrix
    const score: number[][] = Array.from({ length: R + 1 }, () =>
      new Array(E + 1).fill(0),
    );

    for (let i = 0; i <= R; i++) score[i][0] = i * AudioAlignmentEngine.GAP_PENALTY;
    for (let j = 0; j <= E; j++) score[0][j] = j * AudioAlignmentEngine.GAP_PENALTY;

    for (let i = 1; i <= R; i++) {
      for (let j = 1; j <= E; j++) {
        const ed = this.levenshtein(recognised[i - 1], expected[j - 1]);
        const matchMismatch =
          ed <= AudioRules.MATCH_EDIT_DISTANCE_THRESHOLD
            ? AudioAlignmentEngine.MATCH_SCORE
            : AudioAlignmentEngine.MISMATCH_SCORE;

        score[i][j] = Math.max(
          score[i - 1][j - 1] + matchMismatch,
          score[i - 1][j] + AudioAlignmentEngine.GAP_PENALTY,
          score[i][j - 1] + AudioAlignmentEngine.GAP_PENALTY,
        );
      }
    }

    // Traceback
    const alignment: Array<[number, number]> = [];
    let i = R;
    let j = E;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const ed = this.levenshtein(recognised[i - 1], expected[j - 1]);
        const matchMismatch =
          ed <= AudioRules.MATCH_EDIT_DISTANCE_THRESHOLD
            ? AudioAlignmentEngine.MATCH_SCORE
            : AudioAlignmentEngine.MISMATCH_SCORE;
        if (score[i][j] === score[i - 1][j - 1] + matchMismatch) {
          alignment.unshift([i - 1, j - 1]);
          i--;
          j--;
          continue;
        }
      }
      if (i > 0 && score[i][j] === score[i - 1][j] + AudioAlignmentEngine.GAP_PENALTY) {
        alignment.unshift([i - 1, -1]); // insertion
        i--;
      } else {
        alignment.unshift([-1, j - 1]); // deletion
        j--;
      }
    }

    return alignment;
  }

  // ── Build WordAlignment objects ────────────────────────────────────────────

  private buildAlignmentResult(
    traceback: Array<[number, number]>,
    recognisedWords: TranscriptionWord[],
    expectedWords: AyahWordData[],
    segmentId: string,
  ): AlignmentResult {
    const alignments: WordAlignment[] = [];
    let correctWords = 0;
    let deletedWords = 0;
    let insertedWords = 0;

    for (const [rIdx, eIdx] of traceback) {
      if (rIdx === -1) {
        // Deletion — expected word absent from ASR
        const exp = expectedWords[eIdx];
        alignments.push({
          segmentId,
          recognisedText: '',
          expectedText: exp.arabicText,
          surahNumber: exp.surahNumber,
          ayahNumber: exp.ayahNumber,
          wordIndex: exp.wordIndex,
          startSeconds: 0,
          endSeconds: 0,
          confidence: 0,
          isMatch: false,
          editDistance: Number.MAX_SAFE_INTEGER,
        });
        deletedWords++;
      } else if (eIdx === -1) {
        // Insertion — extra recognised word
        const rec = recognisedWords[rIdx];
        alignments.push({
          segmentId,
          recognisedText: rec.text,
          expectedText: undefined,
          surahNumber: undefined,
          ayahNumber: undefined,
          wordIndex: undefined,
          startSeconds: rec.startSeconds,
          endSeconds: rec.endSeconds,
          confidence: rec.confidence,
          isMatch: false,
          editDistance: Number.MAX_SAFE_INTEGER,
        });
        insertedWords++;
      } else {
        // Match or substitution
        const rec = recognisedWords[rIdx];
        const exp = expectedWords[eIdx];
        const ed = this.levenshtein(rec.text, exp.arabicText);
        const isMatch = ed <= AudioRules.MATCH_EDIT_DISTANCE_THRESHOLD;

        alignments.push({
          segmentId,
          recognisedText: rec.text,
          expectedText: exp.arabicText,
          surahNumber: exp.surahNumber,
          ayahNumber: exp.ayahNumber,
          wordIndex: exp.wordIndex,
          startSeconds: rec.startSeconds,
          endSeconds: rec.endSeconds,
          confidence: rec.confidence,
          isMatch,
          editDistance: ed,
        });

        if (isMatch) correctWords++;
      }
    }

    return {
      wordAlignments: alignments,
      totalExpectedWords: expectedWords.length,
      correctWords,
      deletedWords,
      insertedWords,
    };
  }

  // ── Levenshtein distance ───────────────────────────────────────────────────

  /**
   * Character-level Levenshtein distance between two Arabic strings.
   * Works on Unicode code-points, correctly handling Arabic composite
   * characters and diacritics (each code-point is one character).
   */
  levenshtein(a: string, b: string): number {
    const la = [...a]; // spread to code-point array
    const lb = [...b];
    const m = la.length;
    const n = lb.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const prev = new Array<number>(n + 1);
    const curr = new Array<number>(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = la[i - 1] === lb[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,          // insertion
          prev[j] + 1,              // deletion
          prev[j - 1] + cost,       // substitution
        );
      }
      prev.splice(0, prev.length, ...curr);
    }

    return prev[n];
  }
}
