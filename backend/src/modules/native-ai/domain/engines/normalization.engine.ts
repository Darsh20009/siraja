import {
  DIACRITICS_REGEX,
  TATWEEL_REGEX,
  ALEF_VARIANTS_REGEX,
  ALEF,
  TAH_MARBUTA,
  HAH,
  ALEF_MAQSURA,
  YAH,
  SHADDA,
} from '../rules/arabic.rules';

/**
 * NormalizationResult — all normalisation forms in one shot.
 */
export interface NormalizationResult {
  /** Original text unchanged. */
  original: string;
  /** Diacritics removed, alef/ya unified, tatweel removed. */
  searchForm: string;
  /** searchForm + tah-marbuta→hah conversion (for root extraction). */
  rootForm: string;
  /** Fully flattened: searchForm + rootForm + hamza stripped. */
  flatForm: string;
  /** Diacritics only stripped, nothing else changed. */
  diacriticsStripped: string;
}

/**
 * NormalizationEngine — Arabic text normalisation utilities.
 *
 * Extends the minimal normalisation already done by TextNormalizerService
 * (QuranSearch module) with additional forms needed by the AI core.
 *
 * No NestJS dependencies — instantiate with `new NormalizationEngine()`.
 */
export class NormalizationEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Produce all normalisation forms in one call.
   */
  normalizeAll(text: string): NormalizationResult {
    const diacriticsStripped = this.stripDiacritics(text);
    const searchForm = this.toSearchForm(text);
    const rootForm = this.toRootForm(text);
    const flatForm = this.toFlatForm(text);
    return { original: text, diacriticsStripped, searchForm, rootForm, flatForm };
  }

  /**
   * Primary search-ready normalisation:
   *   1. Strip diacritics (harakat, shadda, sukun, etc.)
   *   2. Normalise alef variants → ا
   *   3. Normalise alef maqsura → ي
   *   4. Remove tatweel (kashida)
   */
  toSearchForm(text: string): string {
    return text
      .replace(DIACRITICS_REGEX, '')
      .replace(TATWEEL_REGEX, '')
      .replace(ALEF_VARIANTS_REGEX, ALEF)
      .replace(new RegExp(ALEF_MAQSURA, 'g'), YAH)
      .trim();
  }

  /**
   * Root-extraction form: searchForm + tah marbuta → hah.
   * Used by the MorphologyEngine before prefix/suffix stripping.
   */
  toRootForm(text: string): string {
    return this.toSearchForm(text).replace(new RegExp(TAH_MARBUTA, 'g'), HAH);
  }

  /**
   * Flat form: rootForm + strip all hamza variants → bare alef.
   * Maximally normalised for phonological similarity comparison.
   */
  toFlatForm(text: string): string {
    return this.toRootForm(text)
      .replace(/[\u0621\u0623\u0625\u0624\u0626]/g, ALEF); // hamza variants → ا
  }

  /** Strip only diacritics, keeping all letters intact. */
  stripDiacritics(text: string): string {
    return text.replace(DIACRITICS_REGEX, '');
  }

  /** Remove tatweel/kashida elongation marks. */
  stripTatweel(text: string): string {
    return text.replace(TATWEEL_REGEX, '');
  }

  /** Normalise alef variants (أ إ آ ٱ) to bare alef ا. */
  normalizeAlef(text: string): string {
    return text.replace(ALEF_VARIANTS_REGEX, ALEF);
  }

  /** Convert tah marbuta (ة) to hah (ه) for root analysis. */
  normalizeTaMarbutah(text: string): string {
    return text.replace(new RegExp(TAH_MARBUTA, 'g'), HAH);
  }

  /** Normalise alef maqsura (ى) to yah (ي). */
  normalizeAlefMaqsura(text: string): string {
    return text.replace(new RegExp(ALEF_MAQSURA, 'g'), YAH);
  }

  /**
   * Expand a shadda into a doubled consonant for display / TTS.
   * Example: بِسْمِ → ببسمي (illustrative; primarily used in analysis).
   */
  expandShadda(text: string): string {
    const letters = [...text];
    const result: string[] = [];
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === SHADDA && i > 0) {
        // Insert a copy of the preceding consonant
        result.push(result[result.length - 1]);
      } else {
        result.push(letters[i]);
      }
    }
    return result.join('');
  }

  /**
   * Count distinct diacritic types present in text.
   * Returns a map of diacritic codepoint → occurrence count.
   */
  diacriticInventory(text: string): Map<string, number> {
    const inventory = new Map<string, number>();
    for (const ch of text) {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp >= 0x064b && cp <= 0x065f) {
        inventory.set(ch, (inventory.get(ch) ?? 0) + 1);
      }
    }
    return inventory;
  }
}
