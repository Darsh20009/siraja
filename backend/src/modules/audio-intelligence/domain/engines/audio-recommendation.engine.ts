import { AudioRules } from '../rules/audio-rules';
import type { AudioScore } from '../entities/audio-score.entity';
import type { MistakeDetection, AudioMistakeType } from '../entities/mistake-detection.entity';
import type { TajweedObservation, TajweedRule } from '../entities/tajweed-observation.entity';
import type {
  AudioRecommendation,
  AudioRecommendationType,
  AudioRecommendationPriority,
} from '../entities/audio-recommendation.entity';

/**
 * AudioRecommendationEngine — produces ordered, actionable recommendations
 * from the audio analysis results.
 *
 * Rules evaluated (in priority order):
 *   R1 Critical mistakes exist              → high   (memorization_gap / pronunciation)
 *   R2 Tajweed score < 50                   → high   (tajweed_practice)
 *   R3 Accuracy < 70                        → high   (memorization_gap)
 *   R4 Dominant incorrect tajweed rule      → medium (tajweed_practice specific rule)
 *   R5 Tajweed score 50–70                  → medium (tajweed_practice)
 *   R6 Fluency score < 60                   → medium (fluency)
 *   R7 Consistency score < 60               → low    (consistency)
 *   R8 Pronunciation errors present         → low    (pronunciation)
 *   R9 Composite score ≥ 85                 → low    (positive_feedback)
 *
 * Output is sorted high → medium → low and capped at MAX_RECOMMENDATIONS.
 *
 * No NestJS dependencies — instantiated with `new AudioRecommendationEngine()`.
 */
export class AudioRecommendationEngine {
  /**
   * Generate recommendations from audio analysis.
   *
   * @param score         The computed AudioScore for the session.
   * @param mistakes      All detected MistakeDetection records.
   * @param observations  All TajweedObservation records.
   */
  generate(
    score: AudioScore,
    mistakes: MistakeDetection[],
    observations: TajweedObservation[],
  ): AudioRecommendation[] {
    const recs: AudioRecommendation[] = [];

    // R1 — Critical mistakes
    if (score.criticalMistakes >= AudioRules.CRITICAL_MISTAKE_HIGH_PRIORITY_THRESHOLD) {
      const criticals = mistakes.filter((m) => m.severity === 'critical');
      const dominantType = this.dominantMistakeType(criticals);
      recs.push({
        type: 'memorization_gap',
        priority: 'high',
        title: 'Critical recitation errors detected',
        description:
          `${score.criticalMistakes} critical error(s) found, including "${this.mistakeLabel(dominantType)}". ` +
          `Correct these with your sheikh before advancing to new portions.`,
        triggeredBy: 'audio.critical_mistakes',
        actionable: true,
        target: { unit: 'mistakes', value: score.criticalMistakes, period: 'session' },
      });
    }

    // R2 — Very low tajweed score
    if (score.breakdown.tajweedScore < AudioRules.LOW_TAJWEED_HIGH_THRESHOLD) {
      recs.push({
        type: 'tajweed_practice',
        priority: 'high',
        title: 'Tajweed needs significant improvement',
        description:
          `Your tajweed score is ${score.breakdown.tajweedScore}/100. ` +
          `Focus on the foundational rules — madd elongation, nun-sakinah rules, and waqf positions.`,
        triggeredBy: 'audio.low_tajweed_high',
        actionable: true,
        target: { unit: 'score', value: AudioRules.LOW_TAJWEED_HIGH_THRESHOLD, period: 'session' },
      });
    }

    // R3 — Low word accuracy
    if (score.breakdown.accuracyScore < AudioRules.LOW_ACCURACY_THRESHOLD) {
      recs.push({
        type: 'memorization_gap',
        priority: 'high',
        title: 'Word accuracy requires attention',
        description:
          `Only ${score.correctWords} of ${score.totalExpectedWords} expected words were correctly identified ` +
          `(${score.breakdown.accuracyScore}% accuracy). Revise this portion with close attention to word order.`,
        triggeredBy: 'audio.low_accuracy',
        actionable: true,
        target: { unit: 'words', value: score.totalExpectedWords - score.correctWords },
      });
    }

    // R4 — Dominant incorrect tajweed rule
    const dominantIncorrectRule = this.dominantIncorrectTajweedRule(observations);
    if (dominantIncorrectRule) {
      const alreadyHasHighTajweed = recs.some((r) => r.type === 'tajweed_practice' && r.priority === 'high');
      if (!alreadyHasHighTajweed) {
        recs.push({
          type: 'tajweed_practice',
          priority: 'medium',
          title: `Practise ${this.tajweedRuleLabel(dominantIncorrectRule)}`,
          description: `The rule "${this.tajweedRuleLabel(dominantIncorrectRule)}" was applied incorrectly most frequently in this session. Dedicate focused practice to this rule.`,
          triggeredBy: `audio.tajweed_rule.${dominantIncorrectRule}`,
          actionable: true,
          tajweedRule: dominantIncorrectRule,
        });
      }
    }

    // R5 — Moderate tajweed score (50–70)
    if (
      score.breakdown.tajweedScore >= AudioRules.LOW_TAJWEED_HIGH_THRESHOLD &&
      score.breakdown.tajweedScore < AudioRules.LOW_TAJWEED_MEDIUM_THRESHOLD
    ) {
      if (!recs.some((r) => r.type === 'tajweed_practice')) {
        recs.push({
          type: 'tajweed_practice',
          priority: 'medium',
          title: 'Continue improving tajweed',
          description:
            `Your tajweed score is ${score.breakdown.tajweedScore}/100. ` +
            `Review the rules you applied in this session with your sheikh for feedback.`,
          triggeredBy: 'audio.low_tajweed_medium',
          actionable: true,
        });
      }
    }

    // R6 — Low fluency
    if (score.breakdown.fluencyScore < AudioRules.LOW_FLUENCY_THRESHOLD) {
      recs.push({
        type: 'fluency',
        priority: 'medium',
        title: 'Work on recitation fluency',
        description:
          score.wordsPerMinute < AudioRules.WPM_IDEAL_MIN
            ? `Your pace is ${score.wordsPerMinute} words/minute, which is below the ideal range (${AudioRules.WPM_IDEAL_MIN}–${AudioRules.WPM_IDEAL_MAX}). Practise reciting smoothly without pauses.`
            : `Your pace (${score.wordsPerMinute} wpm) is above the ideal range. Slow down and focus on pronunciation quality.`,
        triggeredBy: 'audio.low_fluency',
        actionable: true,
        target: { unit: 'wpm', value: AudioRules.WPM_IDEAL_MIN, period: 'session' },
      });
    }

    // R7 — Low consistency
    if (score.breakdown.consistencyScore < AudioRules.LOW_CONSISTENCY_THRESHOLD) {
      recs.push({
        type: 'consistency',
        priority: 'low',
        title: 'Improve consistency across the recitation',
        description:
          `Your performance varied significantly across different parts of this portion (consistency: ${score.breakdown.consistencyScore}/100). ` +
          `Practise the weaker sections repeatedly until they match your strongest sections.`,
        triggeredBy: 'audio.low_consistency',
        actionable: true,
      });
    }

    // R8 — Pronunciation errors
    const pronunciationErrors = mistakes.filter((m) => m.type === 'pronunciation_error').length;
    if (pronunciationErrors > 0 && !recs.some((r) => r.type === 'pronunciation')) {
      recs.push({
        type: 'pronunciation',
        priority: 'low',
        title: 'Clarify pronunciation',
        description:
          `${pronunciationErrors} word(s) were unclear to the recognition system. ` +
          `Practise articulating each word clearly with proper makhraj (articulation point).`,
        triggeredBy: 'audio.pronunciation_errors',
        actionable: true,
        target: { unit: 'words', value: pronunciationErrors },
      });
    }

    // R9 — Positive feedback for excellent sessions
    if (score.compositeScore >= AudioRules.POSITIVE_FEEDBACK_THRESHOLD) {
      recs.push({
        type: 'positive_feedback',
        priority: 'low',
        title: 'Excellent recitation!',
        description:
          `MashaAllah — your composite score is ${score.compositeScore}/100 (${score.tier}). ` +
          `Keep up this standard and continue advancing to the next portion.`,
        triggeredBy: 'audio.excellent_session',
        actionable: false,
      });
    }

    return this.sortAndCap(recs);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private sortAndCap(recs: AudioRecommendation[]): AudioRecommendation[] {
    const order: Record<AudioRecommendationPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return recs
      .sort((a, b) => order[a.priority] - order[b.priority])
      .slice(0, AudioRules.MAX_RECOMMENDATIONS);
  }

  private dominantMistakeType(mistakes: MistakeDetection[]): AudioMistakeType | null {
    const counts = new Map<AudioMistakeType, number>();
    for (const m of mistakes) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
    let maxType: AudioMistakeType | null = null;
    let maxCount = 0;
    for (const [type, count] of counts) {
      if (count > maxCount) { maxCount = count; maxType = type; }
    }
    return maxType;
  }

  private dominantIncorrectTajweedRule(observations: TajweedObservation[]): TajweedRule | null {
    const counts = new Map<TajweedRule, number>();
    for (const obs of observations) {
      if (obs.outcome === 'incorrect') {
        counts.set(obs.rule, (counts.get(obs.rule) ?? 0) + 1);
      }
    }
    let maxRule: TajweedRule | null = null;
    let maxCount = 0;
    for (const [rule, count] of counts) {
      if (count > maxCount) { maxCount = count; maxRule = rule; }
    }
    return maxRule;
  }

  private mistakeLabel(type: AudioMistakeType | null): string {
    const labels: Record<AudioMistakeType, string> = {
      wrong_word: 'wrong word',
      skipped_word: 'skipped word',
      repeated_word: 'repeated word',
      wrong_ayah_order: 'wrong ayah order',
      skipped_ayah: 'skipped ayah',
      pronunciation_error: 'unclear pronunciation',
      madd_error: 'madd error',
      ghunna_error: 'ghunna error',
      qalqala_error: 'qalqala error',
      waqf_error: 'waqf error',
      idgham_error: 'idgham error',
      iqlab_error: 'iqlab error',
      ikhfa_error: 'ikhfa error',
    };
    return type ? (labels[type] ?? type) : 'unknown';
  }

  private tajweedRuleLabel(rule: TajweedRule): string {
    const labels: Record<TajweedRule, string> = {
      madd_tabii: 'Madd Tabii (natural elongation)',
      madd_muttasil: 'Madd Muttasil (connected elongation)',
      madd_munfasil: 'Madd Munfasil (separated elongation)',
      madd_lazim: 'Madd Lazim (obligatory elongation)',
      ghunna: 'Ghunna (nasalisation)',
      qalqala: 'Qalqala (echo sound)',
      idgham_bighunn: 'Idgham Bighunn (merging with nasalisation)',
      idgham_bilaghunn: 'Idgham Bilaghunn (merging without nasalisation)',
      iqlab: 'Iqlab (noon to meem conversion)',
      ikhfa: 'Ikhfa (concealment)',
      izhar: 'Izhar (clear pronunciation)',
      tafkhim: 'Tafkhim (heavy pronunciation)',
      tarqiq: 'Tarqiq (light pronunciation)',
      waqf_tam: 'Waqf Tam (complete stop)',
      waqf_kafi: 'Waqf Kafi (sufficient stop)',
    };
    return labels[rule] ?? rule;
  }
}
