---
name: Siraja Phase 9 Smart Mushaf Engine
description: Materialised ayah-performance strategy, ayah-notes vs quran-notes distinction, shared student-scope RBAC helper; read before touching Smart Mushaf/Ayah Performance/Ayah Notes/Mistakes Overlay/Heatmap modules.
---

# Phase 9 — Smart Mushaf Engine

## Materialised ayah performance, not computed on read
`ayah_performance` (one doc per student+ayah) is a materialised collection,
mirroring Phase 7's `student_progress`. It is NOT computed live from
`memorization_records`/`review_records` because those store ayah *ranges*
(surahFrom/ayahFrom/surahTo/ayahTo), so a live per-ayah view would need
expensive range-overlap joins for every ayah on a page. `heatmapLevel` is
derived from `confidenceScore`/`status` and stored at write time (recomputed
on every write via `computeHeatmapLevel`), never recalculated on read —
same precedent as `arabicTextNormalized` in the Quran module.

**Why:** avoids expensive per-ayah range-overlap aggregation on every Mushaf
page load; keeps read paths O(1) lookups by (student, surah, ayah).

**How to apply:** any new write path that touches ayah-level progress
(memorization approval, review/revision, mistake logging) must call the
matching `IAyahPerformanceRepository` method (`recordMemorization`/
`recordRevision`/`recordMistake`) via `resolveAyahsInRange`
(`shared/utils/quran-range.util.ts`) — do not try to derive per-ayah state
by querying `memorization_records`/`review_records` directly.

## Ayah Notes vs Quran Notes — two separate collections
`ayah_notes` (Phase 9) is staff-authored (Sheikh/Admin) about a specific
student's specific ayah, visible to that student + linked parents. `quran_notes`
(Phase 5) is self-owned — a user's private notes on their own reading. They
are intentionally separate collections/modules, not a shared one with an
`isPrivate` flag.

**Why:** ownership/visibility rules are fundamentally different (self-scoped
vs staff-writes/student-reads), and conflating them would complicate RBAC.

## Shared student-ownership RBAC helper introduced this phase
`shared/authorization/student-scope.util.ts` exports `assertCanAccessStudent`
— the four-branch check (TENANT_ADMIN/SUPERVISOR unrestricted, SHEIKH via
assigned/circle, PARENT via linked children, STUDENT via own profile) that
Phase 7's `GetStudentProgressUseCase`/`GetMistakeFrequencyUseCase` each
duplicated inline. Phase 9 factored it out since it introduced five new call
sites (Ayah Performance, Ayah Notes, Mistakes Overlay, Heatmap, Smart Mushaf
facade).

**Why:** avoids a sixth near-identical inline duplication of the same check.

**How to apply:** new Smart Mushaf (or future) use-cases needing this exact
ownership pattern should call the shared helper rather than re-inlining it.
Older Phase 7/8 call sites were left as-is (not refactored) to keep this
phase's diff scoped.

## Supervisor is unrestricted, not circle-scoped, in Phase 7+ read use-cases
Despite Reporting's circle-report having circle-scoped Sheikh checks,
Progress/Mistakes/Smart Mushaf use-cases treat SUPERVISOR the same as
TENANT_ADMIN (full tenant access), per established Phase 7 precedent — not
scoped to supervised circles. Followed for consistency in Phase 9 rather than
introducing a new, inconsistent supervisor-scoping rule.
