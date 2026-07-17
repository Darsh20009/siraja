# Siraja Backend — Production Readiness Final Audit

**Audit Date:** 2026-07-17  
**Auditor:** Source-code inspection (no prior reports consulted)  
**Scope:** Phases 12A–12D + all prior phases as registered in `app.module.ts`  
**Note:** Phase 12E does not exist in the codebase. No files, modules, or commits reference it.

---

## Audit Methodology

Every finding below is derived directly from source files in `backend/src/`. Status ratings:

| Rating | Meaning |
|--------|---------|
| ✅ COMPLETE | Fully implemented; real logic, wired into the module graph |
| ⚠️ PARTIAL | Implemented but with documented gaps or missing wiring |
| 🔶 STUB | Skeleton exists; core logic replaced with a log statement |
| ❌ MISSING | Referenced in architecture docs or memory; not present in codebase |
| 🚨 BUG | Implemented but broken due to wiring/config error |

---

## 1. Phase-by-Phase Implementation Status

### Phase 12A — Platform Foundation

| Area | Status | Evidence |
|------|--------|---------|
| **Users module** | ✅ COMPLETE | `modules/users/` — full Clean Architecture: `GetMeUseCase`, `UpdateMeUseCase`, `UserRepository` implementing `IUserRepository` via Mongoose. Routes: `GET /users/me`, `PATCH /users/me`. |
| **Tenants module** | ✅ COMPLETE | `modules/tenants/` — `CreateTenantUseCase`, `UpdateTenantUseCase`, `GetTenantUseCase`, repository, DTOs, RBAC specs. Full tenant CRUD including plan and settings management. |
| **SMTP / Email delivery** | ✅ COMPLETE | `shared/email/` — `SmtpEmailProvider` uses Nodemailer with full config (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`). Templates: Welcome, Verification, Password Reset, Notification, System Alert. `EmailTemplateService` renders and sends all five. |
| **Storage layer** | ⚠️ PARTIAL | `shared/storage/` — `S3StorageProvider` and `NoopStorageProvider` exist. Module selects provider via `STORAGE_DRIVER` env. Default is `noop` (dev mode). Required env vars for S3: `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`. None of these are in `env.validation.ts` — no boot-time validation. |
| **Quran seeder** | ⚠️ PARTIAL | `database/seeders/quran-foundation.seeder.ts` — logic is real but **fetches from `api.alquran.cloud` at runtime** via custom HTTPS helper. No local data file exists. Seeder will fail silently if the external API is unreachable. Permission seeder (`run-permission-seeder.ts`) exists separately. **Neither seeder has been run against the live Atlas database.** |

### Phase 12B — Learning Intelligence

| Area | Status | Evidence |
|------|--------|---------|
| **MasteryScoreEngine** | ✅ COMPLETE | `shared/learning/mastery-score.engine.ts` — weighted 0–100 score: base recency (40%), decay 30-day TAU (30%), mistakes penalty (20%), revision bonus (10%). Injected into `AyahPerformanceRepository`. |
| **Sm2Engine** | ✅ COMPLETE | `shared/learning/sm2.engine.ts` — full SM-2 algorithm: EF clamped to [1.3, 2.5], interval growth, `EvaluationGrade` → q-score mapping, `onSuccess`/`onMistake` state transitions. |
| **WeaknessHeatmapService** | ✅ COMPLETE | `modules/ayah-performance/application/services/weakness-heatmap.service.ts` — queries `IAyahPerformanceRepository` for real data. `getWeakestAyahs`, `getSurahWeaknessSummary`, `getOverdueRevisions`. Internal 5-min TTL cache with prefix-based invalidation. |
| **QuranMatcherService** | ❌ MISSING | Referenced in memory notes and architecture docs. No file exists in `backend/src/`. Functionality appears partially absorbed by `MistakeDetectorService`. |
| **MistakeDetectorService** | ✅ COMPLETE | `shared/quran/mistake-detector.service.ts` — rule-based (no LLM). LCS for ayah alignment + character-level Levenshtein for word classification. Detects: `SKIPPED_AYAH`, `MISSING_WORD`, `WRONG_WORD`, `REPEATED_WORD`, `ORDER_MISTAKE`. |
| **Forecast module (upgraded)** | ✅ COMPLETE | `modules/forecast/` — upgraded beyond Phase 7 baseline. Materialised progress strategy; integrates SM-2 interval data for projection. |
| **Smart Mushaf modules** | ✅ COMPLETE | `modules/ayah-performance/`, `modules/ayah-notes/`, `modules/ayah-mistakes-overlay/`, `modules/memorization-heatmap/`, `modules/smart-mushaf/` — all registered in `app.module.ts`. Ayah-level performance tracking wired to `MasteryScoreEngine` and `Sm2Engine`. |

### Phase 12C — Infrastructure & Reliability

| Area | Status | Evidence |
|------|--------|---------|
| **RedisModule** | ✅ COMPLETE | `shared/redis/redis.module.ts` — graceful fallback: validates URL format (`rediss?://`), retries 5×, falls back to in-process `SimpleTtlCache` on any failure. Marked `@Global`. `CacheService.backend` property exposes which mode is active. |
| **QueuesModule** | ⚠️ PARTIAL | `shared/queues/queues.module.ts` — conditional registration: `QueuesModule.forRootAsync()` gates BullMQ registration on `REDIS_URL` presence. **Processors registered but processors are stubs** — see §3. |
| **EventsModule** | ✅ COMPLETE | `shared/events/events.module.ts` — NestJS `EventEmitterModule` wired. `EventDispatcherService` provides typed publish methods. `EmailEventListener` and `NotificationEventListener` are registered providers. `GamificationEventListener` registered in `GamificationModule`. |
| **Health endpoints** | ✅ COMPLETE | Two endpoints: `GET /health` (basic, `HealthController` in `AppModule`) and `GET /api/v1/system/health/detailed` (`SystemController`) — checks MongoDB ping latency, Redis ping, queue stats, storage driver, email config, AI key presence. Reports `ok`/`degraded`/`down`. |
| **Compression** | ✅ COMPLETE | `main.ts` — `app.use(compression())` applied globally. |
| **Rate limiting** | ✅ COMPLETE | `ThrottlerGuard` wired as global `APP_GUARD`. TTL and limit configurable via `THROTTLE_TTL`/`THROTTLE_LIMIT` env vars. |

### Phase 12D — Gamification Engine

| Area | Status | Evidence |
|------|--------|---------|
| **Points / XP engine** | ✅ COMPLETE | `PointsEngineService` — award points, get student points, leaderboard-ready queries. `PointActivityType` enum covers memorization, revision, attendance, exams, streaks. |
| **Streak service** | ✅ COMPLETE | `StreakService` — daily and monthly streak tracking. `activeDatesThisYear` materialised on `StreakDocument`. |
| **Achievement engine** | ✅ COMPLETE | `AchievementEngineService.checkAndAward()` — evaluates achievement definitions against student context (points, streaks, transaction counts). Definitions must be seeded via `POST /api/v1/gamification/achievements/seed`. |
| **Badge engine** | ✅ COMPLETE | `BadgeDefinition` CRUD wired. `RewardRulesEngineService.evaluate()` awards badges based on configurable thresholds. |
| **Leaderboard** | ✅ COMPLETE | `LeaderboardService.refreshStudentLeaderboard()` — snapshot materialisation (not live-computed). Called async at end of each gamification event. `ALL_TIME`, `MONTHLY`, `WEEKLY` periods. |
| **Reward rules engine** | ✅ COMPLETE | `RewardRulesEngineService` — runtime-configurable rules stored in `GamificationConfig` document. Evaluates against student context at each event. |
| **Event listener wiring** | ⚠️ PARTIAL | `GamificationEventListener` handles: `MEMORIZATION_RECORDED` ✅, `REVIEW_RECORDED` ✅, `EXAM_COMPLETED` ✅, `ATTENDANCE_MARKED` ⚠️ (absent students detected but **present students cannot be awarded** — the event payload only contains `absentStudentIds`, not the full circle roster). Documented in listener as intentional Phase 13 gap. |
| **Gamification seeding** | ⚠️ PARTIAL | Achievement definitions must be seeded via `POST /api/v1/gamification/achievements/seed`. Not run yet. Badge definitions must be created via API. |

### Admin Module (unphased — built during 12D period)

| Area | Status | Evidence |
|------|--------|---------|
| **AdminModule implementation** | ✅ COMPLETE | `modules/admin/` — controllers for: Audit, Dashboard, Donations, Feature Voting, Feedback, Presentation, Support (tickets + messages), System Alerts, Tenant Admin (branding). All backed by real service + repository implementations with Mongoose. Spec files present for all services. |
| **AdminModule registration** | 🚨 BUG | **`AdminModule` is NOT imported in `app.module.ts`.** All admin routes (`/api/v1/admin/...`) return 404. The module is dead code at runtime despite being fully implemented. |

---

## 2. Cross-Cutting Concerns

### 2.1 Event-Driven Architecture

```
Domain Use Case
  → EventDispatcherService.emit(EVENT, payload)
    → @OnEvent(EVENT) EmailEventListener     → QueueService.add(QUEUE_EMAIL, job)
    → @OnEvent(EVENT) NotificationEventListener → QueueService.add(QUEUE_AI/NOTIFICATION, job)
    → @OnEvent(EVENT) GamificationEventListener → direct service calls (no queue)
```

**Events published:** `USER_REGISTERED`, `MEMORIZATION_RECORDED`, `REVIEW_RECORDED`, `MISTAKE_RECORDED`, `ATTENDANCE_MARKED`, `EXAM_COMPLETED`, `NOTIFICATION_CREATED`.

**Gap:** Domain use cases must explicitly call `EventDispatcherService.emit()`. There is no automatic event sourcing. If a use case does not call emit, the downstream listeners never fire. Not audited per-use-case — recommend adding integration tests.

### 2.2 Queue Processor Status

| Queue | Processor | Status | Gap |
|-------|-----------|--------|-----|
| `QUEUE_EMAIL` | `EmailQueueProcessor` | ✅ COMPLETE | Calls real `EmailTemplateService` methods for all 5 job types. |
| `QUEUE_NOTIFICATION` | `NotificationQueueProcessor` | 🔶 STUB | `handlePush()` → log only ("Phase 13: wire to FCM/APNs"). `handleInApp()` → log only ("Phase 13: persist + WebSocket"). |
| `QUEUE_AI` | `AiQueueProcessor` | 🔶 STUB | All three handlers (`handleInsight`, `handleWeaknessReport`, `handleForecastExplanation`) → log only. Comment: "AiInsightOrchestratorService not injected to avoid circular dep — wire in Phase 13." |
| `QUEUE_REPORT` | `ReportQueueProcessor` | 🔶 STUB | All three report types → log only. No PDF/CSV generation, no delivery. |
| `QUEUE_AUDIO` | `AudioQueueProcessor` | 🔶 STUB | Single handler → log only. "Deferred to Phase 13." |

**Critical consequence:** When Redis IS connected and queues are active, jobs will be dequeued immediately and silently discarded. AI insights, push notifications, report generation, and audio processing **produce no output**.

### 2.3 Moonshot AI Integration

`MoonshotProvider` exists in `shared/ai/providers/moonshot.provider.ts`. `AiProviderModule` is `@Global` and provides it via `LLM_PROVIDER` token. `AiInsightOrchestratorService` is fully implemented with 3-layer cost control (ledger, content hash dedup, CacheService TTL). All 7 use cases (`GenerateMistakeInsightUseCase`, etc.) are implemented.

**Gap:** `AiQueueProcessor` does not inject or call `AiInsightOrchestratorService`. HTTP calls to `/api/v1/ai/...` routes work synchronously (they call use cases directly). Async queue-based AI generation is broken until Phase 13 wiring.

### 2.4 Security Posture

| Concern | Finding | Severity |
|---------|---------|---------|
| **CORS** | `CORS_ORIGINS` env var set to `"*"` in shared environment. Production must lock this down. | 🔴 High |
| **JwtAuthGuard global wiring** | Only `ThrottlerGuard` is APP_GUARD. `JwtAuthGuard` is applied per-controller via decorators + `@Public()` opt-out pattern. Correct but requires every new controller to explicitly opt into auth. | 🟡 Medium |
| **JWT access token revocation** | No Redis-backed token blacklist. `logout` use case invalidates refresh tokens but access tokens remain valid until expiry (15 min). | 🟡 Medium |
| **NoSQL injection** | No `mongo-sanitize` middleware. Mongoose ODM provides partial protection; `whitelist: true` on ValidationPipe covers DTO inputs, but raw query paths in repositories are not sanitized. | 🟡 Medium |
| **Password hashing** | `PasswordService` uses Argon2id with library defaults. ✅ |  |
| **Sensitive field exposure** | `passwordHash` has `select: false` in `UserSchema`. ✅ |  |
| **Helmet** | Applied with defaults. No CSP customisation. 🟡 Consider tightening for production. | 🟡 Low |
| **Rate limiting** | Global 100 req/60s. No per-route overrides on auth endpoints (login, register). Auth brute-force protection relies on account lockout in `AuthModule`, not rate limiter. | 🟡 Medium |
| **Env validation gaps** | `env.validation.ts` validates only 6 vars. Missing: `STORAGE_BUCKET/REGION/etc`, `EMAIL_PASSWORD`, `SMTP_*`, `MOONSHOT_API_KEY`. Boot succeeds with misconfigured storage/email. | 🟡 Medium |

### 2.5 Subscriptions Module

`modules/subscriptions/subscriptions.module.ts` is an empty scaffold:

```typescript
@Module({ imports: [], controllers: [], providers: [], exports: [] })
export class SubscriptionsModule {}
```

No billing, plan enforcement, usage limits, or payment provider integration exists. The `subscription.schema.ts` Mongoose schema exists in `database/mongoose/schemas/` but is not used by any repository.

---

## 3. Specific Verification Results

| Item | Status | Detail |
|------|--------|--------|
| **Quran seed status** | ⚠️ NOT RUN | Seeder exists; fetches from `api.alquran.cloud`. Has not been executed against Atlas. All `/api/v1/quran/*` endpoints return empty collections. |
| **Permission seed status** | ⚠️ NOT RUN | `run-permission-seeder.ts` exists. Has not been executed. RBAC permission checks may behave incorrectly without seeded permission records. |
| **Moonshot integration** | ✅ Configured, ⚠️ Queue path broken | `MoonshotProvider` implemented. Sync HTTP calls work. Async queue path (`AiQueueProcessor`) is a stub. |
| **Redis fallback** | ✅ COMPLETE | Graceful degradation verified in `redis.module.ts`: URL validation → connect attempt → fallback to `SimpleTtlCache`. Zero crash on absent `REDIS_URL`. |
| **SMTP implementation** | ✅ COMPLETE | Nodemailer with full config. 5 templates implemented. Email queue processor fully wired. **Missing:** `EMAIL_PASSWORD` not in env validation; SMTP credentials not set in Replit secrets. |
| **Storage implementation** | ⚠️ PARTIAL | S3/R2 provider implemented. Defaults to `noop`. Requires 6 env vars not currently set. |
| **Smart Mushaf modules** | ✅ COMPLETE | All 5 modules (`AyahPerformance`, `AyahNotes`, `AyahMistakesOverlay`, `MemorizationHeatmap`, `SmartMushaf`) registered and implemented. |
| **Gamification modules** | ✅ COMPLETE (with gaps) | Core engine complete. Attendance present-student gap, achievement seeding needed, admin module not registered. |
| **Admin operations modules** | 🚨 BUG | Fully implemented, **not registered in `app.module.ts`**. All routes return 404. |
| **AI queue processors** | 🔶 STUB | `AiQueueProcessor` logs intent only. No call to `AiInsightOrchestratorService`. |
| **Event-driven architecture** | ✅ WIRED (with queue gaps) | Events flow correctly to listeners. Listeners enqueue jobs correctly. Processors for AI/Push/Report/Audio are stubs. Email processor is real. |

---

## 4. Module Registration Inventory

**Registered in `app.module.ts`:** 39 modules across Phases 1–12D.

**Implemented but NOT registered:**
- `AdminModule` (`modules/admin/`) — 9 controllers, 9 services, 11 repositories, all implemented. **Must be added.**

**Empty scaffolds registered (no-ops at runtime):**
- `SubscriptionsModule` — empty shell.

---

## 5. Overall Readiness Assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Core domain logic** | 9/10 | All 12 phases implemented; minor gaps in attendance gamification |
| **Infrastructure** | 7/10 | Redis/queues wired but 4 of 5 processors are stubs |
| **Security** | 6/10 | CORS wildcard, no token blacklist, no mongo-sanitize |
| **Data readiness** | 3/10 | Seeders not run; zero Quran data, RBAC permissions not seeded |
| **Admin operations** | 0/10 | Module not registered — all routes dead |
| **Async processing** | 2/10 | Email queue ✅; AI/push/report/audio all stubs |
| **Subscriptions/billing** | 0/10 | Empty scaffold |
| **Overall** | **~5/10** | Not production-ready; targetable for private Beta after P0/P1 fixes |
