import { AudioRules } from '../rules/audio-rules';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type {
  MistakeDetection,
  AudioMistakeType,
  AudioMistakeSeverity,
} from '../entities/mistake-detection.entity';

export interface MistakeAnalysisSummary {
  totalMistakes: number;
  criticalMistakes: number;
  majorMistakes: number;
  minorMistakes: number;
  hasCriticalMistakes: boolean;
  dominantType: AudioMistakeType | null;
}

/**
 * AudioMistakeEngine — detects recitation mistakes from word alignments.
 *
 * Mistake taxonomy detected:
 *   wrong_word         — recognised word does not match expected (substitution)
 *   skipped_word       — expected word absent from recognised stream (deletion)
 *   repeated_word      — same recognised text appears consecutively
 *   skipped_ayah       — entire ayah missing (all words in the ayah are deletions)
 *   pronunciation_error— recognised text matches but ASR confidence is very low
 *
 * Structural ordering errors (wrong_ayah_order) are detected by comparing
 * the ayah sequence in the alignment against the expected ascending order.
 *
 * Tajweed-specific errors (madd_error, ghunna_error, …) are produced by
 * TajweedAnalysisEngine and not repeated here.
 *
 * No NestJS dependencies — instantiated with `new AudioMistakeEngine()`.
 */
export class AudioMistakeEngine {
  /**
   * Analyse word alignments and produce a flat list of MistakeDetection
   * records.
   *
   * @param wordAlignments  All alignments from all segments in the session.
   * @param sessionId       ID of the parent AudioSession.
   * @returns               Detected mistakes with recurrence flags set.
   */
  detect(wordAlignments: WordAlignment[], sessionId: string): MistakeDetection[] {
    if (wordAlignments.length === 0) return [];

    const raw = this.detectRaw(wordAlignments, sessionId);
    return this.flagRecurrence(raw);
  }

  /**
   * Produce a summary of mistake counts from a list of MistakeDetection.
   */
  summarise(mistakes: MistakeDetection[]): MistakeAnalysisSummary {
    const critical = mistakes.filter((m) => m.severity === 'critical').length;
    const major = mistakes.filter((m) => m.severity === 'major').length;
    const minor = mistakes.filter((m) => m.severity === 'minor').length;

    const typeCounts = new Map<AudioMistakeType, number>();
    for (const m of mistakes) {
      typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
    }

    let dominantType: AudioMistakeType | null = null;
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return {
      totalMistakes: mistakes.length,
      criticalMistakes: critical,
      majorMistakes: major,
      minorMistakes: minor,
      hasCriticalMistakes: critical > 0,
      dominantType,
    };
  }

  // ── Private: raw detection ─────────────────────────────────────────────────

  private detectRaw(
    wordAlignments: WordAlignment[],
    sessionId: string,
  ): Omit<MistakeDetection, 'id' | 'createdAt'>[] {
    const mistakes: Omit<MistakeDetection, 'id' | 'createdAt'>[] = [];

    // Group by ayah to detect skipped ayahs
    const ayahWordMap = new Map<string, WordAlignment[]>();
    for (const wa of wordAlignments) {
      if (wa.surahNumber !== undefined && wa.ayahNumber !== undefined) {
        const key = `${wa.surahNumber}:${wa.ayahNumber}`;
        const group = ayahWordMap.get(key) ?? [];
        group.push(wa);
        ayahWordMap.set(key, group);
      }
    }

    // Detect skipped ayahs (all words in the ayah are deletions)
    for (const [key, ayahWords] of ayahWordMap) {
      const allDeleted = ayahWords.every((wa) => wa.recognisedText === '');
      if (allDeleted && ayahWords.length > 0) {
        const [surah, ayah] = key.split(':').map(Number);
        mistakes.push({
          sessionId,
          segmentId: ayahWords[0].segmentId,
          type: 'skipped_ayah',
          severity: 'critical',
          surahNumber: surah,
          ayahNumber: ayah,
          description: `Entire ayah ${surah}:${ayah} was missing from the recitation.`,
          isRecurring: false,
        });
        continue; // Don't also flag individual words within the skipped ayah
      }

      // Check ayah ordering — ayah numbers in recognised stream should ascend
      const expectedAyah = ayahWords[0].ayahNumber!;
      for (const wa of ayahWords) {
        if (wa.ayahNumber !== undefined && wa.ayahNumber < expectedAyah) {
          mistakes.push({
            sessionId,
            segmentId: wa.segmentId,
            type: 'wrong_ayah_order',
            severity: 'critical',
            surahNumber: wa.surahNumber,
            ayahNumber: wa.ayahNumber,
            description: `Ayah order error: ayah ${wa.ayahNumber} appeared out of sequence.`,
            isRecurring: false,
          });
          break;
        }
      }
    }

    const skippedAyahs = new Set(
      mistakes
        .filter((m) => m.type === 'skipped_ayah')
        .map((m) => `${m.surahNumber}:${m.ayahNumber}`),
    );

    // Word-level detection
    for (let idx = 0; idx < wordAlignments.length; idx++) {
      const wa = wordAlignments[idx];

      // Skip words in already-detected skipped ayahs
      if (
        wa.surahNumber !== undefined &&
        wa.ayahNumber !== undefined &&
        skippedAyahs.has(`${wa.surahNumber}:${wa.ayahNumber}`)
      ) {
        continue;
      }

      // Skipped word (deletion)
      if (wa.recognisedText === '' && wa.expectedText) {
        mistakes.push({
          sessionId,
          segmentId: wa.segmentId,
          type: 'skipped_word',
          severity: 'major',
          surahNumber: wa.surahNumber,
          ayahNumber: wa.ayahNumber,
          wordIndex: wa.wordIndex,
          expectedText: wa.expectedText,
          startSeconds: wa.startSeconds,
          description: `Word "${wa.expectedText}" was skipped in the recitation.`,
          isRecurring: false,
        });
        continue;
      }

      // Repeated word (consecutive identical recognised text)
      if (idx > 0) {
        const prev = wordAlignments[idx - 1];
        if (
          wa.recognisedText &&
          wa.recognisedText === prev.recognisedText &&
          wa.recognisedText !== ''
        ) {
          mistakes.push({
            sessionId,
            segmentId: wa.segmentId,
            type: 'repeated_word',
            severity: 'minor',
            surahNumber: wa.surahNumber,
            ayahNumber: wa.ayahNumber,
            wordIndex: wa.wordIndex,
            recognisedText: wa.recognisedText,
            expectedText: wa.expectedText,
            startSeconds: wa.startSeconds,
            description: `Word "${wa.recognisedText}" was repeated consecutively.`,
            isRecurring: false,
          });
          continue;
        }
      }

      // Wrong word (substitution)
      if (wa.recognisedText && wa.expectedText && !wa.isMatch) {
        mistakes.push({
          sessionId,
          segmentId: wa.segmentId,
          type: 'wrong_word',
          severity: 'minor',
          surahNumber: wa.surahNumber,
          ayahNumber: wa.ayahNumber,
          wordIndex: wa.wordIndex,
          recognisedText: wa.recognisedText,
          expectedText: wa.expectedText,
          startSeconds: wa.startSeconds,
          description: `Said "${wa.recognisedText}" but expected "${wa.expectedText}".`,
          isRecurring: false,
        });
        continue;
      }

      // Pronunciation error — matched by edit distance but low ASR confidence
      if (wa.isMatch && wa.confidence < 0.40 && wa.recognisedText) {
        mistakes.push({
          sessionId,
          segmentId: wa.segmentId,
          type: 'pronunciation_error',
          severity: 'minor',
          surahNumber: wa.surahNumber,
          ayahNumber: wa.ayahNumber,
          wordIndex: wa.wordIndex,
          recognisedText: wa.recognisedText,
          expectedText: wa.expectedText,
          startSeconds: wa.startSeconds,
          description: `"${wa.recognisedText}" was unclear — ASR confidence was ${Math.round(wa.confidence * 100)}%.`,
          isRecurring: false,
        });
      }
    }

    return mistakes;
  }

  // ── Severity escalation for critical types ─────────────────────────────────

  private escalateSeverity(type: AudioMistakeType): AudioMistakeSeverity {
    if ((AudioRules.CRITICAL_MISTAKE_TYPES as readonly string[]).includes(type))
      return 'critical';
    if ((AudioRules.MAJOR_MISTAKE_TYPES as readonly string[]).includes(type))
      return 'major';
    return 'minor';
  }

  // ── Recurrence flagging ────────────────────────────────────────────────────

  private flagRecurrence<T extends { type: AudioMistakeType; isRecurring: boolean }>(
    mistakes: T[],
  ): T[] {
    const typeCounts = new Map<AudioMistakeType, number>();
    for (const m of mistakes) {
      typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
    }

    return mistakes.map((m) => ({
      ...m,
      isRecurring: (typeCounts.get(m.type) ?? 0) >= AudioRules.RECURRENCE_THRESHOLD,
      // Escalate severity if recurring for major-type mistakes
      severity: this.computeFinalSeverity(m.type, m.isRecurring, typeCounts.get(m.type) ?? 1),
    }));
  }

  private computeFinalSeverity(
    type: AudioMistakeType,
    _wasRecurring: boolean,
    count: number,
  ): AudioMistakeSeverity {
    const base = this.escalateSeverity(type);
    // Promote major → critical when recurring
    if (base === 'major' && count >= AudioRules.RECURRENCE_THRESHOLD) {
      return 'critical';
    }
    return base;
  }
}
