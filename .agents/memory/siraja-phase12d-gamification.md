---
name: Siraja Phase 12D Gamification Engine
description: Architecture decisions, known gaps, and gotchas for the gamification module (GamificationModule).
---

## Key decisions

**Circular-dep avoidance**
`AchievementEngineService.checkAndAward()` is called from the event listener after `awardPoints()`. Achievements call `awardBonusPoints()` (not `awardPoints()`) to prevent infinite recursion between PointsEngine ↔ AchievementEngine.
**Why:** `awardPoints()` triggers achievement checks; if achievement bonus re-called `awardPoints()`, it would loop.
**How to apply:** Any future path from achievements/rules back to the points engine must use `awardBonusPoints()`, never `awardPoints()`.

**EventDispatcherService — typed methods**
The project uses named typed methods (`pointsAwarded`, `achievementUnlocked`, `badgeAwarded`, `examCompleted`) on `EventDispatcherService`, not a generic `.emit()`. Never call `.emit()` directly from application services.
**Why:** Consistent with the existing project pattern; `.emit()` is private/internal.

**AchievementCategory enum**
Added to `gamification.enum.ts` alongside the other gamification enums. Used by `badge.schema.ts` for display grouping. Separate from `AchievementType` (type = unique identity, category = display group).

**Leaderboard snapshot pattern**
`LeaderboardEntry` rows are snapshots refreshed async after activity events. No live aggregation at read time. Refresh is fire-and-forget; errors are logged not re-thrown.

## Known Phase 13 gaps

- **Attendance points**: `ATTENDANCE_MARKED` event carries only absent student IDs; present-student awarding needs `CircleRepository` injection.
- **FIRST_KHATMAH**: Uses `totalPoints >= 10000` as proxy. Replace with `KhatmahCompletedEvent` in Phase 13.
- **Achievement seeder**: `seedDefaultAchievements()` must be wired to tenant-creation flow.
- **countByStudentAndActivity / breakdownByActivity** on `PointTransactionRepository` are declared in the interface and called by the event listener — must be implemented before live use.

## Test mock pattern

Tests mock `EventDispatcherService` as:
```ts
const mockEvents = { pointsAwarded: jest.fn(), achievementUnlocked: jest.fn(), badgeAwarded: jest.fn() };
```
Not `{ emit: jest.fn() }`.
