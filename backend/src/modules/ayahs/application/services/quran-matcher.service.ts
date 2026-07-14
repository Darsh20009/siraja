import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { AYAH_REPOSITORY, AyahRecord, IAyahRepository } from '../../domain/repositories/ayah.repository.interface';
import { normalizeArabic, tokenizeArabic, wordSimilarity } from '@shared/quran/arabic-normalizer.util';

export interface AyahMatch {
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  arabicText: string;
  /** Confidence score: 0.0–1.0 */
  confidence: number;
  matchTier: 'exact' | 'text-index' | 'fuzzy';
  /** Word-level edit distance (fuzzy tier only) */
  editDistance?: number;
}

export interface MatchOptions {
  /** Maximum number of results to return. Default: 5 */
  topN?: number;
  /** Minimum confidence threshold (0–1). Default: 0.4 */
  minConfidence?: number;
}

/**
 * QuranMatcherService — Phase 12B Priority 3.
 *
 * Deterministic, LLM-free Quran text matching. Given a free-form Arabic
 * text string (e.g. a recitation transcript or a search query), finds
 * the best matching ayah(s) from the Quran corpus.
 *
 * Three-tier strategy:
 *  Tier 1 — Exact normalized match (O(1) via in-process normalized map)
 *  Tier 2 — MongoDB text-index search (full-text recall, top-20)
 *  Tier 3 — Word-level Levenshtein re-ranking of Tier 2 candidates
 *
 * The normalized-text map (tier 1 index) is built lazily on first call
 * and cached permanently in-process for the lifetime of the service.
 * All 6,236 ayahs fit in < 2 MB of memory.
 *
 * No external dependencies — all computation is pure TypeScript.
 */
@Injectable()
export class QuranMatcherService {
  /** Lazy in-process cache: normalized text → ayah record */
  private normalizedIndex: Map<string, AyahRecord> | null = null;

  constructor(
    @Inject(AYAH_REPOSITORY)
    private readonly ayahRepo: IAyahRepository,
  ) {}

  async matchAyah(query: string, options: MatchOptions = {}): Promise<AyahMatch[]> {
    const { topN = 5, minConfidence = 0.4 } = options;
    if (!query?.trim()) return [];

    const normalizedQuery = normalizeArabic(query);
    if (!normalizedQuery) return [];

    // ── Tier 1: exact match ────────────────────────────────────────────
    const index = await this.getNormalizedIndex();
    const exactDoc = index.get(normalizedQuery);
    if (exactDoc) {
      return [toMatch(exactDoc, 1.0, 'exact')];
    }

    // ── Tier 2: text-index full-text search (recall phase) ────────────
    const candidates = await this.ayahRepo.searchByText(normalizedQuery);

    if (candidates.length === 0) {
      // No text-index results — fall back to brute-force Levenshtein on
      // a sample of ~200 ayahs near the query's surah estimate
      return this.bruteForceMatch(normalizedQuery, topN, minConfidence, index);
    }

    // ── Tier 3: Levenshtein re-ranking ────────────────────────────────
    const queryWords = tokenizeArabic(query);
    const scored: AyahMatch[] = candidates.slice(0, 20).map((ayah) => {
      const candidateWords = tokenizeArabic(ayah.arabicText);
      const sim = wordSimilarity(queryWords, candidateWords);

      // Blended score: 60% text-search relevance (normalized rank) + 40% Levenshtein
      const textScore = 1 - candidates.indexOf(ayah) / Math.max(candidates.length, 1);
      const confidence = Math.min(1, parseFloat((0.6 * textScore + 0.4 * sim).toFixed(4)));

      const editDist = Math.round((1 - sim) * Math.max(queryWords.length, candidateWords.length));
      return toMatch(ayah, confidence, 'fuzzy', editDist);
    });

    return scored
      .filter((m) => m.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topN);
  }

  /**
   * Invalidate the in-process normalized index (call after seeder runs
   * or after any ayah upsert — rare in production, common in tests).
   */
  invalidateIndex(): void {
    this.normalizedIndex = null;
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private async getNormalizedIndex(): Promise<Map<string, AyahRecord>> {
    if (this.normalizedIndex) return this.normalizedIndex;

    // Load all surahs 1–114. Done once at startup or on first query.
    const all: AyahRecord[] = [];
    for (let s = 1; s <= 114; s++) {
      const ayahs = await this.ayahRepo.findBySurah(s);
      all.push(...ayahs);
    }

    this.normalizedIndex = new Map<string, AyahRecord>();
    for (const ayah of all) {
      const key = normalizeArabic(ayah.arabicText);
      if (key) this.normalizedIndex.set(key, ayah);
    }

    return this.normalizedIndex;
  }

  /** Brute-force fallback when text-index returns nothing. */
  private bruteForceMatch(
    normalizedQuery: string,
    topN: number,
    minConfidence: number,
    index: Map<string, AyahRecord>,
  ): AyahMatch[] {
    const queryWords = normalizeArabic(normalizedQuery).split(' ').filter(Boolean);
    const results: AyahMatch[] = [];

    for (const [normalizedText, ayah] of index) {
      const candidateWords = normalizedText.split(' ').filter(Boolean);
      const sim = wordSimilarity(queryWords, candidateWords);
      if (sim >= minConfidence) {
        const editDist = Math.round((1 - sim) * Math.max(queryWords.length, candidateWords.length));
        results.push(toMatch(ayah, sim, 'fuzzy', editDist));
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topN);
  }
}

function toMatch(
  ayah: AyahRecord,
  confidence: number,
  tier: AyahMatch['matchTier'],
  editDistance?: number,
): AyahMatch {
  return {
    surahNumber: ayah.surahNumber,
    ayahNumber: ayah.ayahNumber,
    globalAyahNumber: ayah.globalAyahNumber,
    arabicText: ayah.arabicText,
    confidence,
    matchTier: tier,
    ...(editDistance !== undefined ? { editDistance } : {}),
  };
}
