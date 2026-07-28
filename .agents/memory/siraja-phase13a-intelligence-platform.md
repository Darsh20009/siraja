---
name: Siraja Phase 13A Intelligence Platform
description: Architecture decisions, engine inventory, test coverage, and known gaps for the local rule-based intelligence layer. Read before touching IntelligenceModule or adding new intelligence features.
---

# Phase 13A — Siraja Intelligence Platform

## Status: Complete (2026-07-28)
99 tests passing across 8 spec files. `tsc --noEmit` clean. App boots cleanly.

## Core constraint
**No external AI**. All computation is deterministic TypeScript in-process. All engines are plain classes instantiated with `new Engine()` inside use cases — NOT registered as NestJS providers. This keeps tests dependency-free and DI lean.

## Engine inventory
Located in `domain/engines/` inside `IntelligenceModule`:
- `MemorizationEngine` — score (grade×0.40 + pace×0.35 + consistency×0.25), trend, bestHour
- `RevisionEngine` — score (retention×0.45 + frequency×0.30 - overdue×0.25), SM-2 overdue count, forgettingRisk
- `MistakeEngine` — type/severity breakdown, recurring patterns, critical-open flag
- `DifficultyEngine` — index (grade×0.45 + ef×0.30 + mistake×0.25); efDifficulty = (2.5 - ef) / 1.2 × 100
- `ForecastEngine` — raw + burden-adjusted completion date; adjustedCapacity = pace × max(0.30, 1 - burden/200)
- `StudentProfileEngine` — single aggregation point combining all engine outputs into StudentIntelligenceProfile
- `RecommendationEngine` — 14 named rules, sorted high→medium→low, capped at 8
- `AnalyticsEngine` — class-level aggregation; combinedScore = mem×0.35 + rev×0.25 + att×0.20 + con×0.20

## Rule sets (tunable constants, no logic)
- `MemorizationRules` — TARGET=5 ayahs/session, EXCELLENT=10, INACTIVITY=14d
- `RevisionRules` — HIGH_BURDEN=60, CRITICAL_BURDEN=80, OVERDUE_RATIO_HIGH=0.20
- `AttendanceRules` — SCORE map: ≥80→100, ≥65→70, ≥50→40, <50→15
- `TajweedRules` — CRITICAL_TYPES=[SKIPPED_AYAH, ORDER_MISTAKE], RECURRENCE_THRESHOLD=3

## RBAC
Permission category: `INTELLIGENCE` with actions READ + EXPORT. READ granted to STUDENT/PARENT/SHEIKH/SUPERVISOR/TENANT_ADMIN; ownership enforced per-use-case (four-branch pattern), not only at controller level.

## Advisory-only boundary
IntelligenceModule imports only read repositories. No use case calls any write method. This is structurally enforced.

## Known gaps
1. `estimateAyahsInRange` uses ~10 ayahs/surah for cross-surah spans — approximate, not exact.
2. No caching: every call recomputes from MongoDB. Add SimpleTtlCache pattern when needed.
3. Sheikh insights computed sequentially per student — use Promise.all for large classes.

## Architecture doc
`docs/architecture/intelligence-core.md` — comprehensive reference including all engine formulas, rule tables, RBAC model, and API endpoint listing.
