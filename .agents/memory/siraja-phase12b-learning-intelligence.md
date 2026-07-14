---
name: Siraja Phase 12B Learning Intelligence
description: Architecture decisions, algorithms, known gaps, and constraints for Phase 12B (MasteryScoreEngine, SM-2, WeaknessHeatmap, QuranMatcher, MistakeDetector, Forecast upgrade). Read before touching any learning-intelligence code.
---

# Phase 12B — Learning Intelligence Core

## Status: Complete (2026-07-14)
All P1/P2/P3 deliverables implemented. 100/100 tests passing. tsc --noEmit clean. App boots on port 5000.

## Key file locations
- `shared/learning/mastery-score.engine.ts` — pure mastery score computation
- `shared/learning/sm2.engine.ts` — pure SM-2 scheduling
- `shared/quran/arabic-normalizer.util.ts` — 9-step Arabic normalization pipeline
- `shared/quran/mistake-detector.service.ts` — LCS-based mistake classification
- `shared/cache/simple-ttl.cache.ts` — in-process TTL cache used by all read paths
- `ayah-performance/infrastructure/repositories/ayah-performance.repository.ts` — all write paths (recordMemorization/recordRevision/recordMistake)
- `ayah-performance/application/services/weakness-heatmap.service.ts` — surah rollup, overdue detection
- `ayahs/application/services/quran-matcher.service.ts` — 3-tier exact/text-index/fuzzy
- `forecast/application/use-cases/get-completion-forecast.use-case.ts` — upgraded with SM-2 signals

## Auto-update pipeline (fire-and-forget)
Three hooks wired to `ayahPerformanceRepo.record*` via `resolveAyahsInRange`:
- `ApproveMemorizationRecordUseCase` → `recordMemorization(grade)`
- `CreateReviewRecordUseCase` → `recordRevision(retentionGrade)`
- `LogMistakeUseCase` → `recordMistake()`

**Why fire-and-forget:** ayah performance is eventually consistent — a retry on the next event corrects any missed update. Errors are `.catch(() => {})` swallowed intentionally.

## MasteryScoreEngine weights
`0.40×base(grade) + 0.30×recency(τ=30d) + 0.20×mistakeFactor + 0.10×revisionBonus`
HeatmapLevel thresholds: 0–39→WEAK, 40–64→NEEDS_REVIEW, 65–84→GOOD, 85–100→EXCELLENT.
`confidenceScore` is kept as alias of `masteryScore` for backward compat with Phase 9 consumers.

## SM-2 state stored per ayah
Fields on `AyahPerformance`: `smEasinessFactor` (default 2.5, range [1.3,2.5]), `smInterval` (days), `smRepetitions`, `smNextReviewDue`. Overdue index: `{ tenantId, student, smNextReviewDue }`.
Grade q<2 (WEAK) → reset (rep=0, interval=1). q=2 (ACCEPTABLE) → partial credit (interval×1.2, rep unchanged). q≥3 → standard progression.

## REPEATED_WORD detection bug fixed
The LCS algorithm matches the *second* occurrence of a repeated word to the reference, leaving the *first* unmatched. The old check only looked at `recWords.slice(0, recIdx)` (empty for first occurrence). Fixed: also check `seenLaterMatched` — same word appears later AND is matched to reference.
**How to apply:** if extending MistakeDetectorService, maintain both `seenEarlier` and `seenLaterMatched` checks.

## QuranMatcherService — normalized index is lazy, permanent
Built on first `matchAyah` call: 114 `findBySurah` queries + 6,236 normalizations → `Map<normalizedText, AyahRecord>`. Permanently cached in-process thereafter. `invalidateIndex()` clears it (call after seeder runs). Tier 2 requires MongoDB `$text` index on `arabicTextNormalized` — needs Quran seeder to have run.

## Known gaps (non-blocking for Beta)
1. `bulkWrite` for large ranges — N serial `findOneAndUpdate` calls instead of batched; TODO comment in architecture doc.
2. `WeaknessHeatmapService` provided twice in `SmartMushafModule` (imported via `AyahPerformanceModule` AND listed in own providers) — two in-process cache instances; functionally correct but wastes memory.
3. `SimpleTtlCache` is single-process only; Redis swap is the documented scale-up path.
4. Quran text index and Tier 2 matching require the Quran seeder to have been run (`npm run seed:quran`).

## tsconfig.build.json was missing
`nest start` fell back to `tsconfig.json` which includes spec files → 6 TS2322 errors. Fixed by adding `backend/tsconfig.build.json` (standard NestJS build config, excludes `**/*spec.ts`).
**Why:** NestJS `nest start` uses `tsconfig.build.json` by default; without it, all files including specs are compiled.
