---
name: Siraja Phase 7 — Memorization & Review Engine
description: Durable architectural decisions and constraints for the learning engine modules (Memorization, Reviews, Mistakes, Progress, Forecast).
---

# Phase 7: Memorization & Review Engine

## Identity rule — user.sub is NOT a Student profile ID

`user.sub` (from `AccessTokenPayload`) is a **User ID** (`User._id`).
`student.id` is a **Student profile ID** (`Student._id`). These are always different ObjectIds.

For STUDENT role, always resolve: `studentRepo.findByUserId(tenantId, user.sub)` → use `profile.id`.
For evaluatedBy/reviewedBy fields (refs to `User._id`): `user.sub` is correct — no resolution needed.

**Why:** Every use-case that compares `user.sub` to a `student` field will silently return empty results or throw Forbidden for every STUDENT request.

**How to apply:** Before any new use-case that filters by student, check whether the schema field references `Student._id` (needs resolution) or `User._id` (use `user.sub` directly).

## RBAC scoping — all learning-engine use-cases must check ownership at the use-case layer

All list/get/compute and **mutate** use-cases follow the same four-branch pattern from `GetStudentUseCase`:

```
TENANT_ADMIN / SUPERVISOR → unrestricted within tenant
SHEIKH  → sheikhRepo.findByUserId → check student assignment/circle membership
STUDENT → studentRepo.findByUserId → verify profile.id matches requested studentId
PARENT  → parentRepo.findByUserId → verify parent.studentIds.includes(studentId)
```

Get-by-id AND mutate endpoints must enforce per-instance ownership **after fetch** (not only via controller permission decorators) to prevent IDOR.

**Why:** MEMORIZATION.READ is granted to Student, Parent, Sheikh, and Supervisor — they all pass the guard, so ownership must be enforced in the use-case layer.

## Permission decorator alignment with role matrix

| Endpoint | Permission | Notes |
|---|---|---|
| `GET /forecast/students/:id` | `MEMORIZATION.READ` | Sheikhs have this; they do NOT have `reports.read` |
| `PATCH /mistakes/:id/resolve` | `MEMORIZATION.APPROVE` | Supervisors have APPROVE; they do NOT have `memorization.update` |

**Why:** Mismatched decorators cause legitimate roles to receive 403 at the controller gate, before reaching use-case scoping logic.

## Cross-aggregate model injection avoids circular deps

`ProgressModule` registers `MemorizationRecord` and `ReviewRecord` Mongoose models directly via `MongooseModule.forFeature` instead of importing MemorizationModule or ReviewsModule. This breaks the cycle:
```
MemorizationModule → ProgressModule → MemorizationModule  ✗
MemorizationModule → ProgressModule (registers model itself) ✓
```

**How to apply:** When a module needs read-only data from another module's schema, register the model directly rather than importing the owning module.

## Streak algorithm — compare calendar days, not absolute deltas

The correct streak logic compares the previously stored `lastActivityDate` (from the `existing` progress doc) against the newly computed one:

- `diffDays === 0` → same calendar day → streak unchanged
- `diffDays === 1` → consecutive day → `currentStreak = prevStreak + 1`
- `diffDays >= 2` → gap → reset to 1
- No previous activity → start at 1

Strip time via `setUTCHours(0, 0, 0, 0)` before comparing, or results are timezone-dependent.

**Why:** Without this, streak can never increment — only preserve or reset — making it permanently stale.

## Ayah range estimation is approximate (known gap)

`estimateAyahsInRange` uses ~10 ayahs/surah for cross-surah spans. Accurate for same-surah ranges, approximate for cross-surah. Affects `memorizationPercentage` and `estimatedCompletionDate`. Tracked as a follow-up; do not treat as accurate until replaced with an exact Ayah collection count.

## MistakeType enum — structural, not Tajweed

`MistakeType` uses structural recitation error types: `MISSING_WORD`, `WRONG_WORD`, `REPEATED_WORD`, `SKIPPED_AYAH`, `ORDER_MISTAKE`, `OTHER`. Do not add Tajweed-rule categories here — they belong in a separate Tajweed domain.
