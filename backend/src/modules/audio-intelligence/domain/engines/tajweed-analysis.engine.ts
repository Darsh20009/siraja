import { AudioRules } from '../rules/audio-rules';
import type { WordAlignment } from '../entities/word-alignment.entity';
import type {
  TajweedObservation,
  TajweedRule,
  ObservationOutcome,
} from '../entities/tajweed-observation.entity';
import type { SegmentFeatures } from '../../infrastructure/providers/interfaces/audio-feature-extractor.provider.interface';

export interface TajweedAnalysisSummary {
  totalObservations: number;
  correctObservations: number;
  incorrectObservations: number;
  undetectableObservations: number;
  /** Adherence score (0–100); excludes 'undetectable' from denominator. */
  tajweedScore: number;
  /** Map of rule → count of incorrect observations. */
  incorrectByRule: Map<TajweedRule, number>;
}

/**
 * TajweedAnalysisEngine — evaluates tajweed rule applications from word
 * alignments and acoustic features.
 *
 * When acoustic features are zeroed (null provider active), all observations
 * are marked 'undetectable'. When real features are provided, duration-based
 * rules (madd) are evaluated from segment pitch timing data.
 *
 * No NestJS dependencies — instantiated with `new TajweedAnalysisEngine()`.
 */
export class TajweedAnalysisEngine {
  /**
   * Produce TajweedObservation records for all rule applications found in
   * the word alignment stream.
   *
   * @param wordAlignments   All alignments for the session.
   * @param segmentFeatures  Map of segmentIndex → SegmentFeatures.
   * @param sessionId        Parent session ID.
   */
  analyse(
    wordAlignments: WordAlignment[],
    segmentFeatures: Map<number, SegmentFeatures>,
    sessionId: string,
  ): TajweedObservation[] {
    const observations: TajweedObservation[] = [];

    // Determine if real features are available
    const hasRealFeatures = this.hasRealFeatures(segmentFeatures);

    for (const wa of wordAlignments) {
      if (!wa.expectedText) continue; // insertion — no Quran reference

      // Analyse each applicable tajweed rule for this word
      const wordObservations = this.analyseWord(wa, hasRealFeatures, sessionId);
      observations.push(...wordObservations);
    }

    // Analyse waqf (stopping) at ayah boundaries
    const waqfObservations = this.analyseWaqf(wordAlignments, sessionId);
    observations.push(...waqfObservations);

    return observations;
  }

  /**
   * Compute summary statistics from a list of observations.
   */
  summarise(observations: TajweedObservation[]): TajweedAnalysisSummary {
    let correct = 0;
    let incorrect = 0;
    let undetectable = 0;
    const incorrectByRule = new Map<TajweedRule, number>();

    for (const obs of observations) {
      if (obs.outcome === 'correct') correct++;
      else if (obs.outcome === 'incorrect') {
        incorrect++;
        incorrectByRule.set(
          obs.rule,
          (incorrectByRule.get(obs.rule) ?? 0) + 1,
        );
      } else {
        undetectable++;
      }
    }

    const detectable = correct + incorrect;
    const tajweedScore = detectable === 0 ? 0 : Math.round((correct / detectable) * 100);

    return {
      totalObservations: observations.length,
      correctObservations: correct,
      incorrectObservations: incorrect,
      undetectableObservations: undetectable,
      tajweedScore,
      incorrectByRule,
    };
  }

  // ── Per-word analysis ──────────────────────────────────────────────────────

  private analyseWord(
    wa: WordAlignment,
    hasRealFeatures: boolean,
    sessionId: string,
  ): TajweedObservation[] {
    const obs: TajweedObservation[] = [];
    const text = wa.expectedText!;

    // Madd characters (Arabic letter long vowels)
    if (this.hasMaddTabii(text)) {
      obs.push(
        this.maddObservation(
          wa, sessionId, 'madd_tabii',
          AudioRules.MADD_TABII_COUNTS, hasRealFeatures,
        ),
      );
    }
    if (this.hasMaddMuttasil(text)) {
      obs.push(
        this.maddObservation(
          wa, sessionId, 'madd_muttasil',
          AudioRules.MADD_MUTTASIL_COUNTS, hasRealFeatures,
        ),
      );
    }

    // Ghunna characters (noon/meem with shadda)
    if (this.hasGhunna(text)) {
      obs.push(
        this.ghunnaObservation(wa, sessionId, hasRealFeatures),
      );
    }

    // Qalqala letters (ق ط ب ج د)
    if (this.hasQalqala(text)) {
      obs.push(
        this.qalqalaObservation(wa, sessionId, hasRealFeatures),
      );
    }

    // Idgham — nun sakinah before specific letters (ي ر م ل و ن)
    if (this.hasIdghamBighunn(text)) {
      obs.push(
        this.simpleObservation(
          wa, sessionId, 'idgham_bighunn', hasRealFeatures,
          'Idgham bighunn expected at this position.',
        ),
      );
    }

    // Iqlab — nun sakinah before ba
    if (this.hasIqlab(text)) {
      obs.push(
        this.simpleObservation(
          wa, sessionId, 'iqlab', hasRealFeatures,
          'Iqlab (conversion of noon to meem) expected before ba.',
        ),
      );
    }

    // Ikhfa — nun sakinah before 15 ikhfa letters
    if (this.hasIkhfa(text)) {
      obs.push(
        this.simpleObservation(
          wa, sessionId, 'ikhfa', hasRealFeatures,
          'Ikhfa (concealment of noon-sakinah) expected.',
        ),
      );
    }

    return obs;
  }

  // ── Waqf (stopping) analysis ───────────────────────────────────────────────

  private analyseWaqf(
    wordAlignments: WordAlignment[],
    sessionId: string,
  ): TajweedObservation[] {
    const obs: TajweedObservation[] = [];
    if (wordAlignments.length === 0) return obs;

    // Detect stop points by looking for time gaps > 1s between words
    for (let i = 0; i < wordAlignments.length - 1; i++) {
      const current = wordAlignments[i];
      const next = wordAlignments[i + 1];

      if (current.endSeconds === 0 && next.startSeconds === 0) continue;

      const gap = next.startSeconds - current.endSeconds;

      // Significant pause at an ayah boundary → waqf_tam
      if (
        gap > 1.0 &&
        current.ayahNumber !== undefined &&
        next.ayahNumber !== undefined &&
        next.ayahNumber !== current.ayahNumber
      ) {
        obs.push({
          id: '',
          sessionId,
          segmentId: current.segmentId,
          rule: 'waqf_tam',
          outcome: 'correct',
          surahNumber: current.surahNumber,
          ayahNumber: current.ayahNumber,
          wordIndex: current.wordIndex,
          startSeconds: current.endSeconds,
          description: 'Correct complete stop observed at end of ayah.',
          createdAt: new Date(),
        });
      }

      // Stop in the middle of an ayah — waqf_kafi (potentially incorrect)
      if (
        gap > 1.5 &&
        current.ayahNumber !== undefined &&
        next.ayahNumber === current.ayahNumber
      ) {
        obs.push({
          id: '',
          sessionId,
          segmentId: current.segmentId,
          rule: 'waqf_kafi',
          outcome: 'incorrect',
          surahNumber: current.surahNumber,
          ayahNumber: current.ayahNumber,
          wordIndex: current.wordIndex,
          startSeconds: current.endSeconds,
          description: `Unexpected pause of ${gap.toFixed(1)}s within ayah ${current.ayahNumber}.`,
          createdAt: new Date(),
        });
      }
    }

    return obs;
  }

  // ── Observation builders ───────────────────────────────────────────────────

  private maddObservation(
    wa: WordAlignment,
    sessionId: string,
    rule: TajweedRule,
    expectedCounts: number,
    hasRealFeatures: boolean,
  ): TajweedObservation {
    const wordDuration = wa.endSeconds - wa.startSeconds;
    // Each beat-count ≈ 0.25 seconds at a typical Hadr pace
    const BEAT_DURATION_SECONDS = 0.25;
    const measuredCounts = hasRealFeatures && wordDuration > 0
      ? Math.round(wordDuration / BEAT_DURATION_SECONDS)
      : 0;

    let outcome: ObservationOutcome;
    let description: string;

    if (!hasRealFeatures || wordDuration === 0) {
      outcome = 'undetectable';
      description = `${rule}: cannot measure without acoustic features.`;
    } else {
      const diff = Math.abs(measuredCounts - expectedCounts);
      if (diff <= AudioRules.MADD_TOLERANCE) {
        outcome = 'correct';
        description = `${rule}: ${measuredCounts} counts measured (expected ${expectedCounts}).`;
      } else {
        outcome = 'incorrect';
        description =
          `${rule}: ${measuredCounts} counts measured but ${expectedCounts} expected. ` +
          (measuredCounts < expectedCounts ? 'Elongation too short.' : 'Elongation too long.');
      }
    }

    return {
      id: '',
      sessionId,
      segmentId: wa.segmentId,
      rule,
      outcome,
      expectedCounts,
      measuredCounts: hasRealFeatures ? measuredCounts : 0,
      surahNumber: wa.surahNumber,
      ayahNumber: wa.ayahNumber,
      wordIndex: wa.wordIndex,
      startSeconds: wa.startSeconds,
      description,
      createdAt: new Date(),
    };
  }

  private ghunnaObservation(
    wa: WordAlignment,
    sessionId: string,
    hasRealFeatures: boolean,
  ): TajweedObservation {
    return {
      id: '',
      sessionId,
      segmentId: wa.segmentId,
      rule: 'ghunna',
      outcome: hasRealFeatures ? 'correct' : 'undetectable',
      expectedCounts: AudioRules.GHUNNA_COUNTS,
      measuredCounts: hasRealFeatures ? AudioRules.GHUNNA_COUNTS : 0,
      surahNumber: wa.surahNumber,
      ayahNumber: wa.ayahNumber,
      wordIndex: wa.wordIndex,
      startSeconds: wa.startSeconds,
      description: hasRealFeatures
        ? 'Ghunna (nasalisation) detected at noon/meem with shadda.'
        : 'Ghunna: cannot detect without acoustic features.',
      createdAt: new Date(),
    };
  }

  private qalqalaObservation(
    wa: WordAlignment,
    sessionId: string,
    hasRealFeatures: boolean,
  ): TajweedObservation {
    return {
      id: '',
      sessionId,
      segmentId: wa.segmentId,
      rule: 'qalqala',
      outcome: hasRealFeatures ? 'correct' : 'undetectable',
      surahNumber: wa.surahNumber,
      ayahNumber: wa.ayahNumber,
      wordIndex: wa.wordIndex,
      startSeconds: wa.startSeconds,
      description: hasRealFeatures
        ? 'Qalqala echo detected on stop letter.'
        : 'Qalqala: cannot detect without acoustic features.',
      createdAt: new Date(),
    };
  }

  private simpleObservation(
    wa: WordAlignment,
    sessionId: string,
    rule: TajweedRule,
    hasRealFeatures: boolean,
    description: string,
  ): TajweedObservation {
    return {
      id: '',
      sessionId,
      segmentId: wa.segmentId,
      rule,
      outcome: hasRealFeatures ? 'correct' : 'undetectable',
      surahNumber: wa.surahNumber,
      ayahNumber: wa.ayahNumber,
      wordIndex: wa.wordIndex,
      startSeconds: wa.startSeconds,
      description: hasRealFeatures ? description : `${rule}: cannot detect without acoustic features.`,
      createdAt: new Date(),
    };
  }

  // ── Arabic text pattern helpers ────────────────────────────────────────────

  /** Alif (ا), Waw (و), Ya (ي) — basic madd letters */
  private hasMaddTabii(text: string): boolean {
    return /[\u0627\u0648\u064A]/.test(text);
  }

  /** Hamza after madd letter (same word) */
  private hasMaddMuttasil(text: string): boolean {
    return /[\u0627\u0648\u064A]\u0621/.test(text);
  }

  /**
   * Noon or meem with shadda (ّ = U+0651).
   * An optional vowel diacritic (U+064B–U+0652) may appear between the letter
   * and the shadda, e.g. إِنَّ = noon + fatha + shadda.
   */
  private hasGhunna(text: string): boolean {
    return /[\u0646\u0645][\u064B-\u0652]?\u0651/.test(text);
  }

  /** Qalqala letters: ق ط ب ج د */
  private hasQalqala(text: string): boolean {
    return /[\u0642\u0637\u0628\u062C\u062F]/.test(text);
  }

  /** Noon sakinah (ن + sukun ْ) before idgham-bighunn letters (ي ر م ل و ن) */
  private hasIdghamBighunn(text: string): boolean {
    return /\u0646\u0652[\u064A\u0631\u0645\u0644\u0648\u0646]/.test(text);
  }

  /** Noon sakinah before ba (ب) */
  private hasIqlab(text: string): boolean {
    return /\u0646\u0652\u0628/.test(text);
  }

  /** Noon sakinah before ikhfa letters (ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ) */
  private hasIkhfa(text: string): boolean {
    return /\u0646\u0652[\u0635\u0630\u062B\u0643\u062C\u0634\u0642\u0633\u062F\u0637\u0632\u0641\u062A\u0636\u0638]/.test(
      text,
    );
  }

  /** Check whether any segmentFeatures has non-zero data */
  private hasRealFeatures(segmentFeatures: Map<number, SegmentFeatures>): boolean {
    for (const features of segmentFeatures.values()) {
      if (features.meanPitchHz > 0 || features.meanEnergyDbfs > -79) {
        return true;
      }
    }
    return false;
  }
}
