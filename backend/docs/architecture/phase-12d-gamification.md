# Phase 12D — Gamification, Rewards & Engagement Architecture

## Overview

Phase 12D adds a complete gamification engine to the Siraja backend. The engine is fully multi-tenant, event-driven, RBAC-protected, and designed for extensibility without modifying core learning modules.

---

## Module graph

```
AppModule
  └── GamificationModule
        ├── GamificationController        (HTTP /gamification/*)
        ├── GamificationEventListener     (@OnEvent handlers)
        ├── PointsEngineService
        ├── StreakService
        ├── AchievementEngineService
        ├── BadgeEngineService
        ├── RewardRulesEngineService
        ├── LeaderboardService
        ├── GamificationStatsService
        ├── AgeAdaptiveService
        └── 10× Mongoose repository pairs (interface + implementation)
```

---

## Domain model

### 1. Points ledger — append-only

| Schema | Role |
|--------|------|
| `PointTransaction` | Append-only event record per activity |
| `StudentPoints` | Materialised totals: total / daily / weekly / monthly / yearly + per-activity breakdown |

`awardPoints()` in `PointsEngineService` always writes a `PointTransaction` row first, then calls `$inc` on `StudentPoints`. The materialised row is used for leaderboards and fast stat queries.

### 2. Streak tracking

`Streak` tracks three independent counters: daily / weekly / monthly. `StreakService.recordActivity(tenantId, studentId, date)` is idempotent for the same date.

Milestone points are awarded per level boundary:
- `dailyStreakHit` — non-zero when a new day is recorded
- `weeklyStreakHit` — when a new ISO week is recorded
- `monthlyStreakHit` — when a new month is recorded

`activeDatesThisYear` is a sorted string array (`YYYY-MM-DD`) used by the perfect-attendance achievement check.

### 3. Achievement system

`AchievementDefinition` rows are seeded per-tenant via `seedDefaultAchievements()`. 9 predefined types cover the full learner journey:

| Type | Condition |
|------|-----------|
| FIRST_MEMORIZATION | memorizationTransactionCount ≥ 1 |
| FIRST_KHATMAH | totalPoints ≥ 10 000 (Phase 13: replace with khatmah flag) |
| STREAK_7_DAYS | currentDailyStreak ≥ 7 |
| STREAK_30_DAYS | currentDailyStreak ≥ 30 |
| STREAK_100_DAYS | currentDailyStreak ≥ 100 |
| PERFECT_ATTENDANCE | activeDatesThisYear.length ≥ 365 |
| REVISION_CHAMPION | revisionTransactionCount ≥ 500 |
| MEMORIZATION_CHAMPION | memorizationTransactionCount ≥ 100 |
| TEACHER_CHOICE_AWARD | manual only — never auto-awarded |

`isRepeatable = false` ensures non-repeatable achievements are awarded once. Idempotency checked via `hasAchievement()` before insert.

**Circular-dep boundary:** bonus points from achievements call `PointsEngineService.awardBonusPoints()` (not `awardPoints()`). `awardBonusPoints` intentionally skips calling `AchievementEngineService` to prevent infinite recursion.

### 4. Badge system

`BadgeDefinition` rows are tenant-owned. Four types: `AUTOMATIC`, `MANUAL`, `SEASONAL`, `EVENT_BASED`. Five tiers: bronze → silver → gold → platinum → diamond.

`BadgeEngineService.awardBadge()` is idempotent: `AUTOMATIC` badges check `hasBadge()` before insert; `MANUAL` badges skip the check (same badge can be awarded multiple times manually, e.g. for different events).

### 5. Leaderboard

`LeaderboardEntry` rows are **snapshots**, not live queries. `refreshStudentLeaderboard()` recomputes rankings from `StudentPoints` and upserts snapshot rows.

Periods: `daily | weekly | monthly | yearly | all_time`. `periodKey` encodes the period window (e.g. `2026-W28` for weekly).

The listener triggers an async `refreshStudentLeaderboard()` after every activity event (fire-and-forget, errors are logged not re-thrown).

### 6. Reward rules engine

Tenant admins can create IF/THEN rules via the API:

```
IF  totalPoints        >= 1000  THEN  AWARD_BADGE       "badge-id"
IF  streakDays         >= 30    THEN  AWARD_ACHIEVEMENT  "streak_30_days"
IF  attendanceDays     >= 30    THEN  AWARD_POINTS       "500"
```

Rules are evaluated after every activity pipeline run. `oncePerStudent = true` rules check existing badges/achievements before firing.

### 7. Age-adaptive profiles

`AgeAdaptiveService` returns frontend UX hints keyed by age group:

| Age group | leaderboard | animations | motivation |
|-----------|-------------|------------|------------|
| CHILD < 13 | hidden | high | reward |
| TEEN 13–17 | visible | medium | reward |
| ADULT 18–59 | visible | low | mastery |
| SENIOR 60+ | hidden | low | mastery |

---

## Event pipeline

Every learning event flows through a single sequential pipeline in `GamificationEventListener`:

```
@OnEvent(EVENTS.MEMORIZATION_RECORDED)
  → awardPoints(MEMORIZATION_COMPLETION)
  → recordActivity() → award streak milestone points
  → checkAndAward() → achievements
  → evaluate() → reward rules
  → refreshStudentLeaderboard() [async, fire-and-forget]
```

Same pipeline for `REVIEW_RECORDED` and `EXAM_COMPLETED` (only passing exams).

`ATTENDANCE_MARKED` is a **gap** (see audit doc) — the event carries absent student IDs, not present ones. Full attendance point awarding requires `CircleRepository` access (Phase 13).

---

## RBAC

New permission category: `GAMIFICATION` with 5 actions.

| Endpoint pattern | Required permission |
|-----------------|---------------------|
| GET all reads | `GAMIFICATION.READ` |
| POST manual award | `GAMIFICATION.AWARD` (sheikhs + admins) |
| POST/PATCH reward-rules, badge defs | `GAMIFICATION.CREATE` / `UPDATE` |
| DELETE | `GAMIFICATION.DELETE` |
| PATCH config | `GAMIFICATION.UPDATE` |

`super_admin` inherits all via the existing bypass rule in `PermissionGuard`.

---

## Schemas (10 total)

All in `database/mongoose/schemas/` following the existing project pattern.

| Schema | Key indexes |
|--------|-------------|
| `GamificationConfig` | unique(tenantId) |
| `PointTransaction` | (tenantId, studentId, activityDate) |
| `StudentPoints` | unique(tenantId, studentId) |
| `Streak` | unique(tenantId, studentId) |
| `AchievementDefinition` | unique(tenantId, type) |
| `StudentAchievement` | (tenantId, studentId), (studentId, achievementId) |
| `BadgeDefinition` | (tenantId, tier), (tenantId, type), (tenantId, isActive) |
| `StudentBadge` | unique(tenantId, studentId, badgeDefinitionId) for AUTOMATIC; compound for MANUAL |
| `LeaderboardEntry` | unique(tenantId, entityId, entityType, period, periodKey) |
| `RewardRule` | (tenantId, isActive), (tenantId, conditionType) |

---

## Configuration

`config/configuration.ts` exposes a `gamification` block:

```typescript
gamification: {
  defaultPoints: {
    memorization_completion: process.env.POINTS_MEMORIZATION ?? 100,
    revision_completion:     process.env.POINTS_REVISION     ?? 50,
    attendance:              process.env.POINTS_ATTENDANCE   ?? 20,
    exam_success:            process.env.POINTS_EXAM         ?? 200,
    daily_streak:            process.env.POINTS_DAILY_STREAK ?? 10,
    weekly_streak:           process.env.POINTS_WEEKLY_STREAK ?? 50,
    monthly_streak:          process.env.POINTS_MONTHLY_STREAK ?? 200,
    ai_session:              process.env.POINTS_AI_SESSION   ?? 30,
    community_participation: process.env.POINTS_COMMUNITY    ?? 15,
  },
  leaderboardRefreshIntervalMs: process.env.LEADERBOARD_REFRESH_MS ?? 300000,
}
```

Tenants can override per-activity point values via `GamificationConfig` (stored in MongoDB), which takes precedence over the global config.

---

## Phase 13 gaps

See `docs/audits/phase-12d-audit.md` for the full list.
