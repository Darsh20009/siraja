import { TajweedRules } from '../rules/tajweed.rules';
import { NormalizationEngine } from './normalization.engine';
import { TajweedRuleEngine } from './tajweed-rule.engine';
import type {
  ClassifiedMistake,
  MistakeCategory,
  MistakePattern,
} from '../entities/mistake-classification.entity';
import type { TajweedRuleType } from '../entities/tajweed-rule-application.entity';

/**
 * MistakeClassificationEngine — classifies a recitation mistake by comparing
 * a student's raw output against the expected correct text.
 *
 * Detects: word substitution, omission, insertion, repetition, tajweed
 * violations, elongation errors, and nasalization errors.  Computes
 * severity, confidence score, and remediation guidance entirely in-memory.
 *
 * No NestJS dependencies — instantiate with `new MistakeClassificationEngine()`.
 */
export class MistakeClassificationEngine {
  private readonly normalizer = new NormalizationEngine();
  private readonly tajweedEngine = new TajweedRuleEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Classify a single mistake by comparing `raw` against `expected`.
   *
   * @param raw       The incorrect text produced by the student.
   * @param expected  The correct reference text.
   * @param wordIndex Optional 0-based word position in the session.
   * @throws When normalized raw equals normalized expected (no mistake to classify).
   */
  classify(raw: string, expected: string, wordIndex?: number): ClassifiedMistake {
    const normRaw = this.normalizer.toSearchForm(raw);
    const normExpected = this.normalizer.toSearchForm(expected);

    if (normRaw === normExpected) {
      throw new Error(
        'MistakeClassificationEngine.classify: raw and expected are identical after normalization.',
      );
    }

    const rawWords = this.splitWords(normRaw);
    const expWords = this.splitWords(normExpected);

    // ── Category detection in priority order ──────────────────────────────

    // 1. Word repetition — consecutive duplicate words in raw
    if (this.hasRepetition(rawWords)) {
      return this.buildMistake(raw, expected, 'word_repetition', 'consecutive_duplicate',
        'minor', undefined, 80,
        'Avoid repeating the same word. Focus on reciting each word exactly once.',
        ['word_repetition'],
        wordIndex);
    }

    // 2. Word omission — expected has more words than raw
    if (expWords.length > rawWords.length) {
      const omitted = expWords.filter((w) => !rawWords.includes(w));
      return this.buildMistake(raw, expected, 'word_omission', 'missing_word',
        'critical', undefined, 90,
        `Missing word(s): "${omitted.join(', ')}". Review the ayah carefully and ensure every word is recited.`,
        ['word_omission'],
        wordIndex);
    }

    // 3. Word insertion — raw has more words than expected
    if (rawWords.length > expWords.length) {
      const inserted = rawWords.filter((w) => !expWords.includes(w));
      return this.buildMistake(raw, expected, 'word_insertion', 'extra_word',
        'major', undefined, 85,
        `Extra word(s) inserted: "${inserted.join(', ')}". Recite only the words in the ayah.`,
        ['word_insertion'],
        wordIndex);
    }

    // 4. Elongation error — madd letter counts differ
    const rawMadd = this.countMaddOccurrences(raw);
    const expMadd = this.countMaddOccurrences(expected);
    if (rawMadd !== expMadd) {
      const isMaddLazim = this.hasMaddLazimInExpected(expected);
      const severity = isMaddLazim ? 'critical' : 'major';
      return this.buildMistake(raw, expected, 'elongation_error', 'madd_count_mismatch',
        severity, 'madd_lazim', 88,
        'Elongation (madd) duration is incorrect. Review the madd rules: tabii=2 counts, muttasil=4-5 counts, lazim=6 counts.',
        ['madd_tabii', 'madd_muttasil', 'madd_lazim', 'madd_arid'],
        wordIndex);
    }

    // 5. Nasalization error — ghunna presence differs
    const rawGhunna = this.countGhunnaOccurrences(raw);
    const expGhunna = this.countGhunnaOccurrences(expected);
    if (rawGhunna !== expGhunna) {
      return this.buildMistake(raw, expected, 'nasalization_error', 'ghunna_mismatch',
        'major', 'ghunna', 82,
        'Nasalization (ghunna) is missing or incorrect. Apply 2-count ghunna on noon/meem with shadda.',
        ['ghunna', 'idgham_bighunn'],
        wordIndex);
    }

    // 6. Word substitution — same word count but different normalized words.
    // Checked BEFORE phonetic rules: when a word is entirely different (not a
    // diacritic or madd variation) it is a substitution, not a tajweed violation.
    if (rawWords.length === expWords.length && !rawWords.every((w, i) => w === expWords[i])) {
      const substituted = expWords.filter((w, i) => rawWords[i] !== w);
      return this.buildMistake(raw, expected, 'word_substitution', 'wrong_word',
        'major', undefined, 85,
        `Wrong word(s) recited. Expected: "${substituted.join(', ')}". Memorize the exact wording of this ayah.`,
        ['word_substitution'],
        wordIndex);
    }

    // 7. Tajweed violation — words match at each position but a phonetic rule differs
    const tajweedRule = this.detectTajweedViolation(raw, expected);
    if (tajweedRule) {
      const isCriticalRule = (TajweedRules.CRITICAL_RULES as readonly string[]).includes(tajweedRule);
      const severity = isCriticalRule ? 'critical' : 'major';
      return this.buildMistake(raw, expected, 'tajweed_violation', `rule_${tajweedRule}`,
        severity, tajweedRule, 75,
        `Tajweed rule "${tajweedRule}" was not applied correctly. Review this rule and practice with similar words.`,
        [tajweedRule, ...this.relatedRulesFor(tajweedRule)],
        wordIndex);
    }

    // 8. Default: pronunciation (low confidence fallback)
    return this.buildMistake(raw, expected, 'pronunciation', 'unclear_articulation',
      'minor', undefined, 50,
      'Articulation was unclear. Focus on precise pronunciation of each letter from its correct makhraj.',
      ['pronunciation'],
      wordIndex);
  }

  /**
   * Classify multiple mistake pairs in batch.
   *
   * @param pairs Array of `{ raw, expected, wordIndex? }` objects.
   * @returns Array of classified mistakes in the same order.
   */
  classifyBatch(
    pairs: Array<{ raw: string; expected: string; wordIndex?: number }>,
  ): ClassifiedMistake[] {
    return pairs.map((p) => this.classify(p.raw, p.expected, p.wordIndex));
  }

  /**
   * Detect recurring patterns from a set of classified mistakes.
   *
   * Groups by category, computes frequency, determines if systematic,
   * and returns the list sorted by frequency descending.
   *
   * @param classified Array of `ClassifiedMistake` objects from the session.
   * @returns Array of `MistakePattern` sorted by frequency descending.
   */
  detectPatterns(classified: ClassifiedMistake[]): MistakePattern[] {
    const groups = new Map<
      MistakeCategory,
      { positions: number[]; count: number }
    >();

    classified.forEach((m, idx) => {
      const existing = groups.get(m.category) ?? { positions: [], count: 0 };
      existing.count++;
      existing.positions.push(idx);
      groups.set(m.category, existing);
    });

    const patterns: MistakePattern[] = [];
    for (const [category, data] of groups) {
      const isSystematic = data.count >= TajweedRules.RECURRENCE_THRESHOLD;
      patterns.push({
        category,
        frequency: data.count,
        isSystematic,
        affectedPositions: data.positions,
        trend: isSystematic ? 'worsening' : 'stable',
      });
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build a `ClassifiedMistake` object with all required fields.
   */
  private buildMistake(
    raw: string,
    expected: string,
    category: MistakeCategory,
    subcategory: string,
    severity: 'critical' | 'major' | 'minor',
    tajweedRule: TajweedRuleType | undefined,
    confidenceScore: number,
    remediation: string,
    relatedRules: string[],
    _wordIndex?: number,
  ): ClassifiedMistake {
    return {
      raw,
      expected,
      category,
      subcategory,
      severity,
      tajweedRule,
      isSystematic: false,
      confidenceScore,
      remediation,
      relatedRules,
    };
  }

  /** Split normalized text into word array. */
  private splitWords(text: string): string[] {
    return text.trim().split(/\s+/).filter((w) => w.length > 0);
  }

  /** Check whether the raw word array has consecutive duplicate words. */
  private hasRepetition(words: string[]): boolean {
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1]) return true;
    }
    return false;
  }

  /** Count madd letter occurrences (ا و ي) in a text. */
  private countMaddOccurrences(text: string): number {
    const bare = this.normalizer.stripDiacritics(text);
    return (bare.match(/[اوي]/g) ?? []).length;
  }

  /** Count ghunna occurrences (noon/meem with shadda) in a text. */
  private countGhunnaOccurrences(text: string): number {
    return (text.match(/[نم][\u064B-\u0652]?\u0651/g) ?? []).length;
  }

  /** Check if the expected text contains a madd-lazim pattern. */
  private hasMaddLazimInExpected(expected: string): boolean {
    // Madd lazim: madd letter followed by sukun (U+0652) or shadda (U+0651)
    return /[اوي][\u0651\u0652]/.test(expected);
  }

  /**
   * Detect the most likely violated tajweed rule by comparing rule
   * applications in the raw vs expected texts.
   *
   * Returns the first rule found in expected but absent in raw, or null.
   */
  private detectTajweedViolation(raw: string, expected: string): TajweedRuleType | null {
    const rawApps = this.tajweedEngine.analyzeText(raw);
    const expApps = this.tajweedEngine.analyzeText(expected);

    const rawRuleCounts = new Map<TajweedRuleType, number>();
    for (const app of rawApps) {
      rawRuleCounts.set(app.rule, (rawRuleCounts.get(app.rule) ?? 0) + 1);
    }

    // Find a rule present in expected but missing/under-applied in raw
    const expRuleCounts = new Map<TajweedRuleType, number>();
    for (const app of expApps) {
      expRuleCounts.set(app.rule, (expRuleCounts.get(app.rule) ?? 0) + 1);
    }

    // Prioritise critical rules first
    const criticalRules = TajweedRules.CRITICAL_RULES as readonly TajweedRuleType[];
    for (const rule of criticalRules) {
      const expCount = expRuleCounts.get(rule) ?? 0;
      const rawCount = rawRuleCounts.get(rule) ?? 0;
      if (expCount > rawCount) return rule;
    }

    // Then major rules
    const majorRules = TajweedRules.MAJOR_RULES as readonly TajweedRuleType[];
    for (const rule of majorRules) {
      const expCount = expRuleCounts.get(rule) ?? 0;
      const rawCount = rawRuleCounts.get(rule) ?? 0;
      if (expCount > rawCount) return rule;
    }

    // Finally any rule
    for (const [rule, expCount] of expRuleCounts) {
      const rawCount = rawRuleCounts.get(rule) ?? 0;
      if (expCount > rawCount) return rule;
    }

    return null;
  }

  /** Return a short list of related rules to study alongside the violated rule. */
  private relatedRulesFor(rule: TajweedRuleType): string[] {
    const relations: Partial<Record<TajweedRuleType, string[]>> = {
      idhar: ['idgham_bighunn', 'idgham_bilaghunna', 'ikhfa', 'iqlab'],
      idgham_bighunn: ['idhar', 'idgham_bilaghunna'],
      idgham_bilaghunna: ['idhar', 'idgham_bighunn'],
      iqlab: ['ikhfa', 'idhar'],
      ikhfa: ['idhar', 'iqlab'],
      madd_lazim: ['madd_muttasil', 'madd_tabii'],
      madd_muttasil: ['madd_lazim', 'madd_tabii'],
      ghunna: ['idgham_bighunn', 'ikhfa'],
      qalqala_kubra: ['qalqala_sughra'],
      qalqala_sughra: ['qalqala_kubra'],
    };
    return relations[rule] ?? [];
  }
}
