import { Injectable, Inject } from '@nestjs/common';
import { HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { AyahPerformanceStatus } from '@shared/enums/smart-mushaf.enum';
import { SimpleTtlCache } from '@shared/cache/simple-ttl.cache';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  AyahPerformanceRecord,
  IAyahPerformanceRepository,
} from '../../domain/repositories/ayah-performance.repository.interface';

export interface WeakAyah {
  surahNumber: number;
  ayahNumber: number;
  masteryScore: number;
  heatmapLevel: HeatmapLevel | null;
  mistakeCount: number;
  revisionCount: number;
  smNextReviewDue: Date | null;
  daysSinceLastActivity: number | null;
}

export interface SurahWeakness {
  surahNumber: number;
  totalTracked: number;
  weakCount: number;
  needsReviewCount: number;
  averageMasteryScore: number;
  overdueCount: number;
}

const WEAKNESS_CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const OVERDUE_CACHE_TTL_MS  = 1 * 60 * 1000;   // 1 minute

/**
 * WeaknessHeatmapService — Phase 12B.
 *
 * Identifies weak ayahs, overdue revisions, and surah-level weakness
 * summaries from the materialised `ayah_performance` collection.
 *
 * Caching: both weakness and overdue results are cached in-process with
 * short TTLs. The cache is invalidated by prefix when a new performance
 * event touches a student's record (call invalidateStudent from the repo).
 */
@Injectable()
export class WeaknessHeatmapService {
  private readonly weaknessCache = new SimpleTtlCache<WeakAyah[]>(WEAKNESS_CACHE_TTL_MS);
  private readonly summaryCache = new SimpleTtlCache<SurahWeakness[]>(WEAKNESS_CACHE_TTL_MS);
  private readonly overdueCache = new SimpleTtlCache<AyahPerformanceRecord[]>(OVERDUE_CACHE_TTL_MS);

  constructor(
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly repo: IAyahPerformanceRepository,
  ) {}

  /** Returns the top-N weakest ayahs for a student (lowest masteryScore). */
  async getWeakestAyahs(tenantId: string, studentId: string, limit = 20): Promise<WeakAyah[]> {
    const key = `weakness:${tenantId}:${studentId}:${limit}`;
    const cached = this.weaknessCache.get(key);
    if (cached) return cached;

    const records = await this.repo.findWeakest(tenantId, studentId, limit);
    const result = records.map(toWeakAyah);
    this.weaknessCache.set(key, result);
    return result;
  }

  /** Returns a per-surah weakness rollup for a student. */
  async getSurahWeaknessSummary(tenantId: string, studentId: string): Promise<SurahWeakness[]> {
    const key = `summary:${tenantId}:${studentId}`;
    const cached = this.summaryCache.get(key);
    if (cached) return cached;

    const records = await this.repo.findByStudent(tenantId, studentId);
    const now = Date.now();

    const bysurah = new Map<number, { total: number; weak: number; needsReview: number; scores: number[]; overdue: number }>();
    for (const r of records) {
      if (r.status === AyahPerformanceStatus.NOT_STARTED) continue;
      let bucket = bysurah.get(r.surahNumber);
      if (!bucket) {
        bucket = { total: 0, weak: 0, needsReview: 0, scores: [], overdue: 0 };
        bysurah.set(r.surahNumber, bucket);
      }
      bucket.total++;
      bucket.scores.push(r.masteryScore);
      if (r.heatmapLevel === HeatmapLevel.WEAK) bucket.weak++;
      if (r.heatmapLevel === HeatmapLevel.NEEDS_REVIEW) bucket.needsReview++;
      if (r.smNextReviewDue && r.smNextReviewDue.getTime() <= now) bucket.overdue++;
    }

    const result: SurahWeakness[] = [];
    for (const [surahNumber, b] of bysurah.entries()) {
      result.push({
        surahNumber,
        totalTracked: b.total,
        weakCount: b.weak,
        needsReviewCount: b.needsReview,
        averageMasteryScore: b.scores.length > 0
          ? Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length)
          : 0,
        overdueCount: b.overdue,
      });
    }

    // Sort by averageMasteryScore ascending (weakest surah first)
    result.sort((a, b) => a.averageMasteryScore - b.averageMasteryScore);
    this.summaryCache.set(key, result);
    return result;
  }

  /** Returns all ayahs where smNextReviewDue <= now (overdue revisions). */
  async getOverdueRevisions(tenantId: string, studentId: string): Promise<AyahPerformanceRecord[]> {
    const key = `overdue:${tenantId}:${studentId}`;
    const cached = this.overdueCache.get(key);
    if (cached) return cached;

    const records = await this.repo.findOverdueRevisions(tenantId, studentId);
    this.overdueCache.set(key, records);
    return records;
  }

  /** Invalidate all cached data for a student (call after any performance update). */
  invalidateStudent(tenantId: string, studentId: string): void {
    this.weaknessCache.invalidatePrefix(`weakness:${tenantId}:${studentId}`);
    this.summaryCache.invalidatePrefix(`summary:${tenantId}:${studentId}`);
    this.overdueCache.invalidatePrefix(`overdue:${tenantId}:${studentId}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toWeakAyah(r: AyahPerformanceRecord): WeakAyah {
  const lastActivity = r.lastMemorizedAt ?? r.lastRevisedAt;
  const daysSinceLastActivity = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / 86_400_000)
    : null;
  return {
    surahNumber: r.surahNumber,
    ayahNumber: r.ayahNumber,
    masteryScore: r.masteryScore,
    heatmapLevel: r.heatmapLevel,
    mistakeCount: r.mistakeCount,
    revisionCount: r.revisionCount,
    smNextReviewDue: r.smNextReviewDue,
    daysSinceLastActivity,
  };
}
