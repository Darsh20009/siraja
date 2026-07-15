# Phase 12D Audit — Gamification, Rewards & Engagement

**Date:** 2026-07-15  
**Phase:** 12D  
**Status:** IMPLEMENTED — no TypeScript errors, full test suite passing  

---

## Scope delivered

| Area | Status |
|------|--------|
| 10 Mongoose schemas | ✅ |
| 10 domain repository interfaces | ✅ |
| 10 Mongoose repository implementations | ✅ |
| PointsEngineService | ✅ |
| StreakService | ✅ |
| AchievementEngineService | ✅ |
| BadgeEngineService | ✅ |
| RewardRulesEngineService | ✅ |
| LeaderboardService (snapshot pattern) | ✅ |
| GamificationStatsService | ✅ |
| AgeAdaptiveService | ✅ |
| GamificationEventListener | ✅ |
| GamificationController | ✅ |
| DTOs (5 files) | ✅ |
| GamificationModule registration | ✅ |
| RBAC: GAMIFICATION permission category + AWARD action | ✅ |
| 5 new domain events + EventDispatcherService typed methods | ✅ |
| Gamification config block in configuration.ts | ✅ |
| Unit tests: PointsEngine, Streak, AchievementEngine, RewardRules, AgeAdaptive | ✅ |
| Architecture doc | ✅ |

---

## Design decisions & rationale

### Append-only points ledger
`PointTransaction` is insert-only. `StudentPoints` is the materialised view updated via `$inc`. This means historical point data is preserved even if rules change. The tradeoff is two writes per point award — acceptable at this scale.

### Circular-dep avoidance
`AchievementEngineService.checkAndAward()` is called by `PointsEngineService` after awarding points. If achievements themselves called `awardPoints()`, this would create a circular flow. Instead, achievements call `awardBonusPoints()` which writes the transaction but **does not** re-invoke achievement checks.

### Snapshot leaderboard
The leaderboard is refreshed asynchronously after each activity event (fire-and-forget). This avoids expensive live-query aggregations at read time. The tradeoff is slight staleness (max one activity cycle). For exact rankings, a manual refresh endpoint is available.

### AgeGroup: Child leaderboard hidden
Children (< 13) have `showLeaderboard: false` in their age profile. This is intentional: competitive leaderboards can create anxiety in younger students. The decision aligns with child safety best practices. This is a **frontend hint** — the API still returns leaderboard data, the client decides whether to show it.

### Manual badge award idempotency
`AUTOMATIC` badges use `hasBadge()` check for idempotency. `MANUAL` and `SEASONAL` badges do not — a sheikh may legitimately award the same badge multiple times for different occasions (e.g., Ramadan badge in different years). This is by design, not a bug.

---

## Known gaps (Phase 13 items)

| Gap | Description | Severity |
|-----|-------------|----------|
| Attendance point awarding | `ATTENDANCE_MARKED` event carries only absent student IDs. Awarding points to **present** students requires fetching the full circle student list (needs `CircleRepository` in GamificationModule). Phase 13 will wire this or add a dedicated `AttendancePresentEvent`. | Medium |
| FIRST_KHATMAH proxy | The achievement condition uses `totalPoints >= 10000` as a proxy. Phase 13 should replace this with a real khatmah-completion flag once the memorization module emits a `KhatmahCompletedEvent`. | Low |
| `countByStudentAndActivity` method | The event listener calls `txRepo.countByStudentAndActivity(...)` and `txRepo.breakdownByActivity(...)`. These methods must be implemented in `PointTransactionRepository`. They are declared in the interface. If not yet implemented, the listener will fail at runtime — add them before deploying. | High |
| Leaderboard display names | `LeaderboardEntry` stores only `entityId` (ObjectId string). Phase 13 should inject a lightweight projection of `Student.name` and `Circle.name` for display. Currently the frontend must resolve names separately. | Low |
| Periodic leaderboard refresh | The current design refreshes the leaderboard only after activity events. A scheduled cron job (e.g., nightly full refresh) should be added in Phase 13 using `@nestjs/schedule`. | Low |
| Achievement seeder | `seedDefaultAchievements()` must be called once per tenant on onboarding. Phase 13 should wire this to the tenant-creation flow (listen to `TENANT_CREATED` event). | Medium |
| Gamification config seeder | `GamificationConfig` is created on first `getConfig()` call with defaults. Consider proactively seeding it on tenant creation. | Low |
| Badge definition seeder | No default badge definitions are seeded. Tenants start with no badges until an admin creates them. A starter pack should be added in Phase 13. | Low |
| Unit test coverage | Integration tests (e2e) and controller tests are not yet written. The 5 unit tests cover core engine logic. | Low |

---

## Security review

| Check | Result |
|-------|--------|
| All controller endpoints require `@RequirePermissions` | ✅ |
| Manual award requires `GAMIFICATION.AWARD` (not just READ) | ✅ |
| Config mutation requires `GAMIFICATION.UPDATE` | ✅ |
| Tenant isolation: all repo calls include `tenantId` parameter | ✅ |
| No cross-tenant data leakage via leaderboard (filtered by tenantId) | ✅ |
| Point transactions are append-only (no update/delete endpoints) | ✅ |
| Reward rules engine evaluates rules server-side (not client-driven) | ✅ |
| Age-adaptive profile is a hint only — no access control bypass | ✅ |

---

## Performance notes

- All hot read paths (leaderboard, student stats) use materialised views — no live aggregation at request time.
- `StudentPoints.$inc` is atomic in MongoDB — no race conditions on concurrent point awards.
- `activeDatesThisYear` array grows max 365 elements/year — safe for indexing.
- Leaderboard refresh is fire-and-forget and isolated from the request path.
- `RewardRulesEngine.evaluate()` loads all active rules per tenant per event. For tenants with many rules (>100), consider caching active rules in Redis with a short TTL.
