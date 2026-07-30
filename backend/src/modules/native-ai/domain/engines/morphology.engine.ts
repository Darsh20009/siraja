import { PREFIXES, SUFFIXES, PARTICLES } from '../rules/arabic.rules';
import { NormalizationEngine } from './normalization.engine';
import type { MorphemeBreakdown } from '../entities/quran-token.entity';

export type WordClass = 'verb' | 'noun' | 'particle' | 'unknown';

export interface MorphologicalAnalysis {
  original: string;
  normalized: string;
  root?: string;
  wordClass: WordClass;
  morphemes: MorphemeBreakdown;
  /** True when the word appears to be a verbal form. */
  isVerb: boolean;
  /** True when the word appears to be a nominal form. */
  isNoun: boolean;
  /** True when the word is a particle/preposition/conjunction. */
  isParticle: boolean;
  /** Number of root consonants extracted (3 or 4; 0 = unknown). */
  rootLength: number;
}

/**
 * MorphologyEngine — rule-based Arabic morphology utilities.
 *
 * Implements a simplified root-extraction and morpheme-breakdown
 * algorithm based on the classical Arabic verbal / nominal patterns
 * (وزن / أوزان).  Does NOT use a dictionary; accuracy is approximate
 * but sufficient for difficulty scoring and mistake classification.
 *
 * No NestJS dependencies — instantiate with `new MorphologyEngine()`.
 */
export class MorphologyEngine {
  private readonly normalizer = new NormalizationEngine();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Full morphological analysis of a single Arabic word.
   */
  analyze(word: string): MorphologicalAnalysis {
    const normalized = this.normalizer.toSearchForm(word);
    const rootForm = this.normalizer.toRootForm(word);

    if (PARTICLES.has(normalized)) {
      return {
        original: word,
        normalized,
        wordClass: 'particle',
        morphemes: { stem: normalized },
        isVerb: false,
        isNoun: false,
        isParticle: true,
        rootLength: 0,
      };
    }

    const morphemes = this.breakdownMorphemes(rootForm);
    const root = this.extractRoot(morphemes.stem);
    const wordClass = this.classifyWordClass(normalized, morphemes.stem);

    return {
      original: word,
      normalized,
      root: root ?? undefined,
      wordClass,
      morphemes,
      isVerb: wordClass === 'verb',
      isNoun: wordClass === 'noun',
      isParticle: wordClass === 'particle',
      rootLength: root ? root.length : 0,
    };
  }

  /** Extract the trilateral/quadrilateral root from a stemmed word. */
  extractRoot(stem: string): string | null {
    if (!stem || stem.length < 2) return null;

    // Already 3 or 4 letters → likely the root itself
    if (stem.length === 3 || stem.length === 4) return stem;

    // Apply pattern tables to extract root consonants
    return this.applyRootPatterns(stem);
  }

  /** Split a word into prefix / stem / suffix. */
  breakdownMorphemes(word: string): MorphemeBreakdown {
    if (PARTICLES.has(word)) return { stem: word };

    let remaining = word;
    let prefix: string | undefined;
    let suffix: string | undefined;

    for (const p of PREFIXES) {
      if (remaining.startsWith(p) && remaining.length > p.length + 1) {
        prefix = p;
        remaining = remaining.slice(p.length);
        break;
      }
    }

    for (const s of SUFFIXES) {
      if (remaining.endsWith(s) && remaining.length > s.length + 1) {
        suffix = s;
        remaining = remaining.slice(0, -s.length);
        break;
      }
    }

    return { prefix, stem: remaining, suffix };
  }

  /** Classify a word's grammatical class via pattern heuristics. */
  classifyWordClass(normalized: string, stem: string): WordClass {
    if (PARTICLES.has(normalized)) return 'particle';

    // Verbal patterns: past tense verbs (فعل / فعّل / أفعل)
    if (this.matchesVerbalPattern(stem)) return 'verb';

    // Nominal patterns
    if (this.matchesNominalPattern(stem)) return 'noun';

    return 'unknown';
  }

  isVerb(word: string): boolean {
    return this.matchesVerbalPattern(this.normalizer.toRootForm(word));
  }

  isNoun(word: string): boolean {
    const normalized = this.normalizer.toSearchForm(word);
    return this.matchesNominalPattern(normalized);
  }

  isParticle(word: string): boolean {
    return PARTICLES.has(this.normalizer.toSearchForm(word));
  }

  // ── Private: Pattern matching ──────────────────────────────────────────────

  /**
   * Attempt root extraction by matching common verbal/nominal patterns.
   * Pattern: strip augmented consonants (ا و ي م ت ن ه) and return
   * the remaining consonants as the root.
   */
  private applyRootPatterns(stem: string): string | null {
    // Augment consonants: ا و ي م ت ن ه ا ل (not part of the root in most words)
    const augments = new Set(['ا', 'و', 'ي', 'م', 'ت', 'ن', 'ه', 'ل']);
    const root = [...stem].filter((c) => !augments.has(c)).join('');

    if (root.length === 3 || root.length === 4) return root;

    // If stem is 5+ consonants, take first 3
    if (stem.length >= 5) return [...stem].slice(0, 3).join('');

    return stem.length >= 2 ? stem : null;
  }

  private matchesVerbalPattern(stem: string): boolean {
    const len = stem.length;
    // Past tense Form I: فعل (3 letters)
    if (len === 3) return true;
    // Form II (فعّل) and Form III (فاعل) — 4–5 letter stems
    if (len === 4 || len === 5) {
      // Contains a doubled letter (shadda in original) or hamza-alef prefix
      return stem.startsWith('أ') || stem.startsWith('ا');
    }
    return false;
  }

  private matchesNominalPattern(stem: string): boolean {
    // Ends in tah marbuta → feminine noun
    if (stem.endsWith('ة') || stem.endsWith('ه')) return true;
    // Broken plural patterns (5+ letters often)
    if (stem.length >= 4 && (stem.startsWith('م') || stem.startsWith('أ'))) return true;
    return false;
  }
}
