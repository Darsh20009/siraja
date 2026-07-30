import {
  IDHAR_LETTERS,
  IDGHAM_BIGHUNN_LETTERS,
  IDGHAM_BILAGHUNNA_LETTERS,
  IQLAB_LETTER,
  IKHFA_LETTERS,
  QALQALA_LETTERS,
  MADD_LETTERS,
  SHADDA,
  NOON,
  MEEM,
  SOLAR_LETTERS,
} from '../rules/arabic.rules';
import { TajweedRules } from '../rules/tajweed.rules';
import { NormalizationEngine } from './normalization.engine';
import type {
  TajweedRuleApplication,
  TajweedRuleType,
  TajweedCategory,
} from '../entities/tajweed-rule-application.entity';

export interface TajweedAnalysisSummary {
  totalApplications: number;
  byCategory: Map<TajweedCategory, number>;
  byDifficulty: { easy: number; medium: number; hard: number };
  /** Complexity score 0–100. */
  complexityScore: number;
  /** Most frequent rule type found. */
  dominantRule?: TajweedRuleType;
}

/**
 * TajweedRuleEngine — comprehensive rule-based tajweed analysis.
 *
 * Detects all primary tajweed rule applications in a normalised Arabic
 * word-stream using Unicode pattern matching.  Works entirely in-memory
 * with no external dependencies.
 *
 * Covers:
 *  Noon-sakinah / tanwin: idhar, idgham (bighunn / bilaghunna), iqlab, ikhfa
 *  Meem-sakinah: idgham shafawi, ikhfa shafawi, idhar shafawi
 *  Madd: tabii, muttasil, lazim (structural), lin
 *  Qalqala: sughra (medial sukun), kubra (pause)
 *  Ghunna: noon/meem + shadda
 *  Lam rules: shamsiyya, qamariyya
 *
 * No NestJS dependencies — instantiate with `new TajweedRuleEngine()`.
 */
export class TajweedRuleEngine {
  private readonly normalizer = new NormalizationEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Detect all tajweed rule applications in a space-separated word stream.
   *
   * @param text  Full diacriticsed Arabic text of one or more ayahs.
   */
  analyzeText(text: string): TajweedRuleApplication[] {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    const observations: TajweedRuleApplication[] = [];

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const nextWord = words[wi + 1] ?? '';

      // Within-word rules
      observations.push(...this.detectMaddRules(word, wi));
      observations.push(...this.detectQalqala(word, wi));
      observations.push(...this.detectGhunna(word, wi));
      observations.push(...this.detectTafkhim(word, wi));
      observations.push(...this.detectLamRules(word, wi));

      // Cross-word rules (noon/meem sakinah at word end + next word start)
      observations.push(...this.detectNoonRules(word, nextWord, wi));
      observations.push(...this.detectMeemRules(word, nextWord, wi));
    }

    return observations;
  }

  /**
   * Produce summary statistics from a list of applications.
   */
  summarize(applications: TajweedRuleApplication[]): TajweedAnalysisSummary {
    const byCategory = new Map<TajweedCategory, number>();
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    const ruleCounts = new Map<TajweedRuleType, number>();

    for (const app of applications) {
      byCategory.set(app.category, (byCategory.get(app.category) ?? 0) + 1);
      byDifficulty[app.difficulty]++;
      ruleCounts.set(app.rule, (ruleCounts.get(app.rule) ?? 0) + 1);
    }

    let dominantRule: TajweedRuleType | undefined;
    let maxCount = 0;
    for (const [rule, count] of ruleCounts) {
      if (count > maxCount) { maxCount = count; dominantRule = rule; }
    }

    // Complexity: hard×3 + medium×2 + easy×1, normalised to 0–100
    const rawComplexity =
      byDifficulty.hard * 3 + byDifficulty.medium * 2 + byDifficulty.easy;
    const complexityScore = applications.length === 0
      ? 0
      : Math.min(Math.round((rawComplexity / (applications.length * 3)) * 100), 100);

    return {
      totalApplications: applications.length,
      byCategory,
      byDifficulty,
      complexityScore,
      dominantRule,
    };
  }

  // ── Noon-sakinah / Tanwin rules ────────────────────────────────────────────

  detectNoonRules(
    word: string,
    nextWord: string,
    wordIndex: number,
  ): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];
    const bare = this.normalizer.stripDiacritics(word);
    const nextBare = this.normalizer.stripDiacritics(nextWord);

    // Noon sakinah at word-end (ن + sukun) or tanwin (ـًـٍـٌ on last letter)
    const hasNoonSakinah = bare.endsWith(NOON);
    const hasTanwin = /[\u064B\u064C\u064D]$/.test(word);

    if (!hasNoonSakinah && !hasTanwin) return obs;

    const nextFirst = nextBare.charAt(0);
    if (!nextFirst) return obs;

    let rule: TajweedRuleType;
    let difficulty: 'easy' | 'medium' | 'hard';
    let description: string;

    if (IDHAR_LETTERS.has(nextFirst)) {
      rule = 'idhar';
      difficulty = 'easy';
      description = `Idhar: noon-sakinah/tanwin must be pronounced clearly before throat letter "${nextFirst}".`;
    } else if (IDGHAM_BIGHUNN_LETTERS.has(nextFirst)) {
      rule = 'idgham_bighunn';
      difficulty = 'hard';
      description = `Idgham bighunn: noon-sakinah/tanwin assimilates with nasalisation before "${nextFirst}".`;
    } else if (IDGHAM_BILAGHUNNA_LETTERS.has(nextFirst)) {
      rule = 'idgham_bilaghunna';
      difficulty = 'medium';
      description = `Idgham bilaghunna: noon-sakinah assimilates without nasalisation before "${nextFirst}".`;
    } else if (nextFirst === IQLAB_LETTER) {
      rule = 'iqlab';
      difficulty = 'hard';
      description = 'Iqlab: noon-sakinah converts to meem sound before ba.';
    } else if (IKHFA_LETTERS.has(nextFirst)) {
      rule = 'ikhfa';
      difficulty = 'hard';
      description = `Ikhfa: noon-sakinah must be concealed (not fully pronounced) before "${nextFirst}".`;
    } else {
      return obs;
    }

    obs.push({
      rule,
      category: 'noon_rules',
      wordIndex,
      triggerText: hasNoonSakinah ? NOON : word.slice(-1),
      expectedCounts: rule === 'idgham_bighunn' || rule === 'iqlab' || rule === 'ikhfa'
        ? TajweedRules.GHUNNA_COUNTS
        : undefined,
      difficulty,
      description,
    });

    return obs;
  }

  // ── Meem-sakinah rules ─────────────────────────────────────────────────────

  detectMeemRules(
    word: string,
    nextWord: string,
    wordIndex: number,
  ): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];
    const bare = this.normalizer.stripDiacritics(word);

    if (!bare.endsWith(MEEM)) return obs;

    const nextBare = this.normalizer.stripDiacritics(nextWord);
    const nextFirst = nextBare.charAt(0);
    if (!nextFirst) return obs;

    if (nextFirst === MEEM) {
      obs.push({
        rule: 'idgham_shafawi',
        category: 'meem_rules',
        wordIndex,
        triggerText: MEEM,
        expectedCounts: TajweedRules.GHUNNA_COUNTS,
        difficulty: 'hard',
        description: 'Idgham shafawi: meem sakinah merges with following meem (with ghunna).',
      });
    } else if (nextFirst === 'ب') {
      obs.push({
        rule: 'ikhfa_shafawi',
        category: 'meem_rules',
        wordIndex,
        triggerText: MEEM,
        expectedCounts: TajweedRules.GHUNNA_COUNTS,
        difficulty: 'medium',
        description: 'Ikhfa shafawi: meem sakinah is concealed before ba (with ghunna).',
      });
    } else {
      obs.push({
        rule: 'idhar_shafawi',
        category: 'meem_rules',
        wordIndex,
        triggerText: MEEM,
        difficulty: 'easy',
        description: `Idhar shafawi: meem sakinah is pronounced clearly before "${nextFirst}".`,
      });
    }

    return obs;
  }

  // ── Madd (elongation) rules ────────────────────────────────────────────────

  detectMaddRules(word: string, wordIndex: number): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];

    // Detect madd letters followed by hamza (muttasil) or sukun/shadda (lazim)
    for (let i = 0; i < word.length - 1; i++) {
      const ch = word[i];
      const next = word[i + 1];

      if (!MADD_LETTERS.has(this.normalizer.stripDiacritics(ch))) continue;

      // Madd muttasil: madd letter followed by hamza in same word
      if (/[\u0621\u0623\u0625\u0624\u0626]/.test(next)) {
        obs.push({
          rule: 'madd_muttasil',
          category: 'madd',
          wordIndex,
          letterIndex: i,
          triggerText: ch + next,
          expectedCounts: TajweedRules.MADD_MUTTASIL_MIN_COUNTS,
          difficulty: 'hard',
          description: `Madd muttasil: elongate "${ch}" for 4–5 counts before hamza "${next}".`,
        });
        continue;
      }

      // Madd lazim: madd letter followed by sukun or shadda
      const nextCp = next.codePointAt(0) ?? 0;
      if (nextCp === 0x0652 /* sukun */ || next === SHADDA) {
        obs.push({
          rule: 'madd_lazim',
          category: 'madd',
          wordIndex,
          letterIndex: i,
          triggerText: ch + next,
          expectedCounts: TajweedRules.MADD_LAZIM_COUNTS,
          difficulty: 'hard',
          description: `Madd lazim: elongate "${ch}" for exactly 6 counts before sukun/shadda.`,
        });
        continue;
      }

      // Natural madd tabii (madd letter not followed by hamza or sukun)
      obs.push({
        rule: 'madd_tabii',
        category: 'madd',
        wordIndex,
        letterIndex: i,
        triggerText: ch,
        expectedCounts: TajweedRules.MADD_TABII_COUNTS,
        difficulty: 'easy',
        description: `Madd tabii: elongate "${ch}" for 2 counts (natural madd).`,
      });
    }

    return obs;
  }

  // ── Qalqala ────────────────────────────────────────────────────────────────

  detectQalqala(word: string, wordIndex: number): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];
    const bare = this.normalizer.stripDiacritics(word);

    for (let i = 0; i < bare.length; i++) {
      if (!QALQALA_LETTERS.has(bare[i])) continue;

      // Qalqala kubra: qalqala letter at end of word (pause)
      const isEnd = i === bare.length - 1;
      obs.push({
        rule: isEnd ? 'qalqala_kubra' : 'qalqala_sughra',
        category: 'qalqala',
        wordIndex,
        letterIndex: i,
        triggerText: bare[i],
        difficulty: isEnd ? 'hard' : 'medium',
        description: isEnd
          ? `Qalqala kubra: strong echo on "${bare[i]}" at word/pause end.`
          : `Qalqala sughra: slight echo on "${bare[i]}" in the middle of the word.`,
      });
    }

    return obs;
  }

  // ── Ghunna ─────────────────────────────────────────────────────────────────

  detectGhunna(word: string, wordIndex: number): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];

    // Noon or meem with shadda (optional vowel diacritic between letter and shadda)
    const ghunnaRegex = new RegExp(`([${NOON}${MEEM}])[\\u064B-\\u0652]?${SHADDA}`, 'g');
    let match: RegExpExecArray | null;

    while ((match = ghunnaRegex.exec(word)) !== null) {
      obs.push({
        rule: 'ghunna',
        category: 'ghunna',
        wordIndex,
        letterIndex: match.index,
        triggerText: match[0],
        expectedCounts: TajweedRules.GHUNNA_COUNTS,
        difficulty: 'medium',
        description: `Ghunna: nasalise "${match[1]}" with shadda for 2 counts.`,
      });
    }

    return obs;
  }

  // ── Tafkhim / Tarqiq ───────────────────────────────────────────────────────

  detectTafkhim(word: string, wordIndex: number): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];
    const bare = this.normalizer.stripDiacritics(word);

    for (let i = 0; i < bare.length; i++) {
      if (/[صضطظغخق]/.test(bare[i])) {
        obs.push({
          rule: 'tafkhim',
          category: 'tafkhim_tarqiq',
          wordIndex,
          letterIndex: i,
          triggerText: bare[i],
          difficulty: 'medium',
          description: `Tafkhim: pronounce "${bare[i]}" with heavy resonance (full-mouth sound).`,
        });
      }
    }

    return obs;
  }

  // ── Lam rules ──────────────────────────────────────────────────────────────

  detectLamRules(word: string, wordIndex: number): TajweedRuleApplication[] {
    const obs: TajweedRuleApplication[] = [];
    const bare = this.normalizer.stripDiacritics(word);

    // Definite article lam: starts with ال
    if (!bare.startsWith('ال')) return obs;

    const afterLam = bare[2] ?? '';
    if (!afterLam) return obs;

    const isSolar = SOLAR_LETTERS.has(afterLam);

    obs.push({
      rule: isSolar ? 'lam_shamsiyya' : 'lam_qamariyya',
      category: 'lam_rules',
      wordIndex,
      letterIndex: 1,
      triggerText: 'ال' + afterLam,
      difficulty: isSolar ? 'medium' : 'easy',
      description: isSolar
        ? `Lam shamsiyya: the lam in "ال" merges with "${afterLam}" (solar letter).`
        : `Lam qamariyya: pronounce the lam in "ال" clearly before "${afterLam}" (lunar letter).`,
    });

    return obs;
  }
}
