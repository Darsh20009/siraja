/**
 * Phase 9 — Smart Mushaf Engine enums.
 *
 * `AyahPerformanceStatus` tracks the lifecycle of a single ayah for a
 * single student; `HeatmapLevel` is the derived, display-ready bucket
 * computed from `confidenceScore` (see `computeHeatmapLevel` in
 * `ayah-performance.repository.ts`) — computed once at write time and
 * stored, not recalculated on every read, mirroring the
 * `arabicTextNormalized` precedent in the Quran Foundation Engine.
 */
export enum AyahPerformanceStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  MEMORIZED = 'memorized',
  WEAK = 'weak',
  NEEDS_REVIEW = 'needs_review',
}

export enum HeatmapLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  NEEDS_REVIEW = 'needs_review',
  WEAK = 'weak',
}
