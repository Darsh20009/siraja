import { Injectable } from '@nestjs/common';
import { MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';
import { normalizeArabic, tokenizeArabic, wordLevenshtein } from './arabic-normalizer.util';

export interface MistakeDetectionInput {
  /** Raw recited text (may contain tashkeel). */
  recitedText: string;
  /** Canonical reference ayah text (may contain tashkeel). */
  referenceText: string;
}

export interface DetectedMistake {
  type: MistakeType;
  severity: MistakeSeverity;
  /** 0-based index in the reference word list. */
  wordIndex: number;
  /** What was said (for substitution mistakes). */
  recitedWord?: string;
  /** What should have been said. */
  referenceWord: string;
  /** Character-level edit distance between recitedWord and referenceWord. */
  editDistance?: number;
}

/**
 * MistakeDetectorService — Phase 12B.
 *
 * Deterministic, LLM-free mistake detection via word-level sequence
 * alignment (LCS) followed by gap classification.
 *
 * Algorithm:
 *  1. Normalize both strings.
 *  2. Tokenize into word arrays.
 *  3. Find LCS (longest common subsequence) to align reference to recited.
 *  4. Classify unmatched reference positions as MISSING_WORD / SKIPPED_AYAH.
 *  5. Classify unmatched recited positions as WRONG_WORD / REPEATED_WORD /
 *     ORDER_MISTAKE based on character-level edit distance and position.
 *
 * The service is stateless and pure — it never touches the database.
 * The caller (a sheikh using the recitation UI) confirms/discards before
 * submitting detected mistakes via the existing LogMistakeUseCase.
 */
@Injectable()
export class MistakeDetectorService {
  detect(input: MistakeDetectionInput): DetectedMistake[] {
    const refWords  = tokenizeArabic(input.referenceText);
    const recWords  = tokenizeArabic(input.recitedText);

    if (refWords.length === 0) return [];

    // Identical — no mistakes
    if (refWords.join(' ') === recWords.join(' ')) return [];

    // ── LCS alignment ──────────────────────────────────────────────────
    const lcs = computeLCS(refWords, recWords);

    // Build sets of matched indices
    const refMatched  = new Set<number>(lcs.map((p) => p[0]));
    const recMatched  = new Set<number>(lcs.map((p) => p[1]));

    const mistakes: DetectedMistake[] = [];

    // ── Classify unmatched reference positions ──────────────────────────
    // Group consecutive unmatched ref indices into runs for SKIPPED_AYAH detection
    const missedRefIndices = refWords
      .map((_, i) => i)
      .filter((i) => !refMatched.has(i));

    // Detect SKIPPED_AYAH: a consecutive run of >= 5 unmatched ref words
    const runs = groupConsecutive(missedRefIndices);
    for (const run of runs) {
      if (run.length >= 5) {
        // Classify the whole run as a single SKIPPED_AYAH at the first word
        mistakes.push({
          type: MistakeType.SKIPPED_AYAH,
          severity: MistakeSeverity.MAJOR,
          wordIndex: run[0],
          referenceWord: refWords[run[0]],
        });
      } else {
        // Individual MISSING_WORD entries
        for (const idx of run) {
          mistakes.push({
            type: MistakeType.MISSING_WORD,
            severity: run.length === 1 ? MistakeSeverity.MINOR : MistakeSeverity.MODERATE,
            wordIndex: idx,
            referenceWord: refWords[idx],
          });
        }
      }
    }

    // ── Classify unmatched recited positions ────────────────────────────
    const unmatchedRecited = recWords
      .map((w, i) => ({ word: w, recIdx: i }))
      .filter(({ recIdx }) => !recMatched.has(recIdx));

    for (const { word: recWord, recIdx } of unmatchedRecited) {
      // Find closest reference word by char-level edit distance
      let closestRefIdx = -1;
      let closestDist = Infinity;
      for (let ri = 0; ri < refWords.length; ri++) {
        const d = charLevenshtein(recWord, refWords[ri]);
        if (d < closestDist) {
          closestDist = d;
          closestRefIdx = ri;
        }
      }

      if (closestRefIdx === -1) continue;
      const refWord = refWords[closestRefIdx];

      // REPEATED_WORD: same word appears elsewhere in the recited stream (before or
      // after this position) and that other occurrence IS matched to reference.
      // Handles both "X X Y" (first X unmatched) and "X Y X" (second X unmatched).
      const seenEarlier = recWords.slice(0, recIdx).some((w) => w === recWord);
      const seenLaterMatched = recWords.some(
        (w, i) => i > recIdx && w === recWord && recMatched.has(i),
      );
      if ((seenEarlier || seenLaterMatched) && recWord === refWord) {
        mistakes.push({
          type: MistakeType.REPEATED_WORD,
          severity: MistakeSeverity.MINOR,
          wordIndex: closestRefIdx,
          recitedWord: recWord,
          referenceWord: refWord,
          editDistance: 0,
        });
        continue;
      }

      // ORDER_MISTAKE: ref word does exist elsewhere in recited, but out of order
      const appearsInRecited = recWords.some((w) => w === refWord);
      if (appearsInRecited && refWord !== recWord) {
        mistakes.push({
          type: MistakeType.ORDER_MISTAKE,
          severity: MistakeSeverity.MAJOR,
          wordIndex: closestRefIdx,
          recitedWord: recWord,
          referenceWord: refWord,
          editDistance: closestDist,
        });
        continue;
      }

      // WRONG_WORD: different word used
      mistakes.push({
        type: MistakeType.WRONG_WORD,
        severity: closestDist <= 2 ? MistakeSeverity.MINOR : MistakeSeverity.MODERATE,
        wordIndex: closestRefIdx,
        recitedWord: recWord,
        referenceWord: refWord,
        editDistance: closestDist,
      });
    }

    // Sort by wordIndex for a consistent presentation order
    mistakes.sort((a, b) => a.wordIndex - b.wordIndex);

    // Deduplicate: remove MISSING_WORD entries that share a wordIndex with a SKIPPED_AYAH
    const skippedIndices = new Set(
      mistakes.filter((m) => m.type === MistakeType.SKIPPED_AYAH).map((m) => m.wordIndex),
    );
    return mistakes.filter(
      (m) => m.type !== MistakeType.MISSING_WORD || !skippedIndices.has(m.wordIndex),
    );
  }

  /**
   * Convenience: return a plain summary suitable for logging.
   */
  summarize(mistakes: DetectedMistake[]): Record<MistakeType, number> {
    const counts: Record<MistakeType, number> = {
      [MistakeType.MISSING_WORD]: 0,
      [MistakeType.WRONG_WORD]: 0,
      [MistakeType.REPEATED_WORD]: 0,
      [MistakeType.SKIPPED_AYAH]: 0,
      [MistakeType.ORDER_MISTAKE]: 0,
      [MistakeType.OTHER]: 0,
    };
    for (const m of mistakes) counts[m.type]++;
    return counts;
  }
}

// ── Internal Helpers ──────────────────────────────────────────────────────

/**
 * Classic LCS (Longest Common Subsequence) via DP.
 * Returns an array of (refIndex, recIndex) pairs in the common subsequence.
 */
function computeLCS(ref: string[], rec: string[]): [number, number][] {
  const m = ref.length, n = rec.length;
  // Build DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = ref[i - 1] === rec[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Backtrack
  const pairs: [number, number][] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (ref[i - 1] === rec[j - 1]) {
      pairs.unshift([i - 1, j - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return pairs;
}

/** Character-level Levenshtein (Wagner-Fischer). O(m×n). */
function charLevenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++)
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    prev = curr;
  }
  return prev[n];
}

/** Group an array of integers into runs of consecutive values. */
function groupConsecutive(indices: number[]): number[][] {
  if (indices.length === 0) return [];
  const runs: number[][] = [[indices[0]]];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1] + 1) {
      runs[runs.length - 1].push(indices[i]);
    } else {
      runs.push([indices[i]]);
    }
  }
  return runs;
}

// Re-export normalizeArabic so the detect endpoint can include normalized text
export { normalizeArabic };
