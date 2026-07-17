# Siraja — Phase 13 Execution Plan

**Date:** 2026-07-17  
**Based on:** Production Readiness Final Audit + Launch Blockers analysis  
**Prerequisite reading:** `docs/audits/production-readiness-final.md`, `docs/audits/launch-blockers.md`

---

## Strategic Recommendation: B First, Then C

**Recommendation: Finish remaining backend blockers first (B), then run Flutter development in parallel with backend P2 items (C).**

### Rationale

**Against starting Flutter now (against option A):**

1. **Zero Quran data.** The Quran foundation hasn't been seeded. Flutter screens that call `/api/v1/quran/surahs` or any ayah endpoint will render empty. Development against empty APIs produces placeholder UI that has to be redone.

2. **Admin module is unreachable.** Every operator flow (tenant management, user support, audit logs) is a 404 until `AdminModule` is registered. Flutter admin screens would be developed against broken endpoints.

3. **RBAC isn't seeded.** Permission checks are untested without seeded permission records. Flutter auth flows will hit unexpected 403s or over-permissive responses.

4. **Async notifications don't work.** Flutter push notification setup (device token registration, FCM) requires a working backend push path. That path is currently a log statement.

5. **The API contract isn't stable.** Fixing attendance gamification (P1-7) requires changing the `ATTENDANCE_MARKED` event payload. Wiring AI queue processors may change response timing semantics. Flutter screens built on today's API may need adjustment.

**Why not C (pure parallel) from day one:**

The P0 blockers (AdminModule, seeders, CORS) take less than 1 hour total. There is no engineering time saved by starting Flutter before fixing them. Starting Flutter on an unseeded database with a broken admin module creates confusion, wasted effort, and re-work.

**The parallel window (C) opens after P0+P1-4+P1-1 are done:**  
Once Redis is connected, seeders are run, AdminModule is registered, and SMTP works — the API is stable enough for Flutter development to begin on auth, Quran reading, and student-facing memorization flows. At that point, Flutter development and the remaining P1/P2 backend items can run in true parallel.

---

## Phase 13 Scope

Phase 13 is the **Production Closure Phase**. It has four workstreams that can largely run in parallel after the first week of P0 fixes.

---

## Workstream 13-A: Critical Fixes & Seeding (Week 1)

**Goal:** Unblock everything else. One engineer, ~1 day.

| Task | Effort | Owner | Details |
|------|--------|-------|---------|
| **13A-1** Register `AdminModule` | 15 min | Backend | Add `AdminModule` import to `backend/src/app.module.ts`. Verify all admin routes resolve via Swagger. |
| **13A-2** Run permission seeder | 5 min | DevOps | `cd backend && npm run seed:permissions`. Verify permission count in Atlas. |
| **13A-3** Run Quran seeder | 30 min | DevOps | `cd backend && npm run seed:quran`. Monitor for API rate-limit errors from `api.alquran.cloud`. Verify surah/ayah counts post-seed. |
| **13A-4** Lock CORS | 10 min | DevOps | Update `CORS_ORIGINS` shared env var to comma-separated production origin(s). |
| **13A-5** Create local Quran data snapshot | 2 hr | Backend | After seeder runs, export the seeded `surahs` and `ayahs` collections to JSON and commit as `backend/src/database/seeders/data/quran-*.json`. Modify seeder to prefer local files over the external API. Eliminates `api.alquran.cloud` dependency on future re-seeds. |
| **13A-6** Set `EMAIL_PASSWORD` secret | 5 min | DevOps | Add Resend API key as SMTP password in Replit secrets. Smoke-test via seeded user registration. |

---

## Workstream 13-B: Async Processing Completion (Weeks 1–2)

**Goal:** Make every queue processor do real work when Redis is connected.  
**Dependency:** Redis must be provisioned (P1-1) before any processor can be validated.

### 13B-1: Connect Redis

| Item | Detail |
|------|--------|
| **Task** | Provision Upstash Redis (recommended for Replit: serverless, no persistent connection needed) or another Redis provider. Set `REDIS_URL` secret. |
| **Effort** | 1–2 hours |
| **Validation** | `GET /api/v1/system/health/detailed` → `queues.status: ok`, `redis.status: ok` |
| **Risk** | Low |

### 13B-2: Wire `AiQueueProcessor` to `AiInsightOrchestratorService`

| Item | Detail |
|------|--------|
| **Task** | Inject `AiInsightOrchestratorService` into `AiQueueProcessor`. The existing comment identifies a circular dependency risk (`QueuesModule` ↔ `AiModule`). Resolve using NestJS `forwardRef()` on the `AiModule` import in `QueuesModule`, or extract a thin `AiInsightPort` interface into `shared/` that `AiModule` implements and `QueuesModule` depends on (preferred — no `forwardRef`). |
| **File** | `backend/src/shared/queues/processors/ai-queue.processor.ts` |
| **Effort** | 4–6 hours |
| **Risk** | Medium — circular dep resolution |
| **Validation** | Post a memorization record → verify AI insight document created in Atlas within 30 seconds |

### 13B-3: Wire `NotificationQueueProcessor` (in-app path)

| Item | Detail |
|------|--------|
| **Task** | Inject `NotificationsService` into processor. `handleInApp()` should call `notificationsService.createInApp(data)` to persist a `Notification` document. |
| **File** | `backend/src/shared/queues/processors/notification-queue.processor.ts` |
| **Effort** | 3–4 hours |
| **Risk** | Low |
| **Validation** | Trigger an attendance absence → verify notification document in Atlas |

### 13B-4: Wire `ReportQueueProcessor`

| Item | Detail |
|------|--------|
| **Task** | Inject `ReportingService` (Phase 8) into processor. `handleStudentProgress()` → call existing reporting use case → serialize result to JSON (MVP) or PDF (full). Deliver via email (use `QueueService.add(QUEUE_EMAIL, ...)`) or store via `StorageService` and return a presigned URL. |
| **File** | `backend/src/shared/queues/processors/report-queue.processor.ts` |
| **Effort** | 2–3 days (JSON MVP: 1 day; PDF: +2 days) |
| **Risk** | Medium |
| **Dependency** | 13B-1 (Redis), optionally 13C-2 (storage) for PDF delivery |

### 13B-5: Push notification provider (FCM/APNs)

| Item | Detail |
|------|--------|
| **Task** | Create `FcmPushProvider` in `shared/push/`. Implement `sendToDevice(token, title, body, data)`. Store device tokens from Flutter client registration via new endpoint `POST /api/v1/notifications/device-token`. Wire into `NotificationQueueProcessor.handlePush()`. |
| **Effort** | 1–2 days |
| **Risk** | Medium — requires Firebase project, platform credentials |
| **Dependency** | Firebase project provisioned, 13B-1 (Redis) |

---

## Workstream 13-C: Infrastructure Hardening (Weeks 2–3)

**Goal:** Production-grade security, observability, and resilience.

### 13C-1: Fix attendance gamification (present-student award)

| Item | Detail |
|------|--------|
| **Task** | Two options: (A) Change `ATTENDANCE_MARKED` event payload to include `presentStudentIds: string[]` — requires updating every emitter. (B) Inject `ICircleRepository` into `GamificationEventListener` to resolve present students from `circleId` minus `absentStudentIds`. Option B is lower risk (no payload contract change). |
| **File** | `backend/src/modules/gamification/infrastructure/listeners/gamification-event.listener.ts` |
| **Effort** | 3–5 hours |
| **Risk** | Low–Medium |

### 13C-2: Configure production storage (S3/R2)

| Item | Detail |
|------|--------|
| **Task** | Provision Cloudflare R2 bucket (recommended: no egress fees). Set 6 required secrets: `STORAGE_DRIVER=s3`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`. Add all storage vars to `env.validation.ts`. |
| **Effort** | 2–3 hours |
| **Risk** | Low |

### 13C-3: JWT access token revocation blacklist

| Item | Detail |
|------|--------|
| **Task** | On logout, store JTI (JWT ID claim) in Redis with TTL matching remaining access token lifetime. In `JwtAuthGuard`, after signature verification, check Redis blacklist. Reject if JTI found. |
| **Files** | `modules/auth/`, `common/guards/jwt-auth.guard.ts` |
| **Effort** | 1 day |
| **Risk** | Low |
| **Dependency** | 13B-1 (Redis) |

### 13C-4: WebSocket gateway for real-time in-app notifications

| Item | Detail |
|------|--------|
| **Task** | Create `NotificationsGateway` using `@WebSocketGateway`. Authenticate connections via JWT on handshake. On `NOTIFICATION_CREATED` event (or from queue processor), emit to user's socket room. Use Redis pub/sub adapter (`@nestjs/platform-socket.io` + `socket.io-redis`) for horizontal scaling. |
| **Effort** | 3–5 days |
| **Risk** | Medium |
| **Dependency** | 13B-1 (Redis), 13B-3 (in-app notification persistence) |

### 13C-5: NoSQL injection hardening

| Item | Detail |
|------|--------|
| **Task** | Add `mongo-sanitize` as Express middleware in `main.ts` (`app.use(mongoSanitize())`). Alternatively, strip `$` and `.` from top-level keys in a custom pipe. |
| **Effort** | 2–4 hours |
| **Risk** | Low |

### 13C-6: Env validation completeness

| Item | Detail |
|------|--------|
| **Task** | Add to `env.validation.ts`: `EMAIL_PASSWORD` (required), `STORAGE_DRIVER` (optional, default `noop`), `STORAGE_BUCKET/REGION/etc` (conditional required when `STORAGE_DRIVER=s3`), `MOONSHOT_API_KEY` (optional), `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` (optional with defaults). |
| **File** | `backend/src/config/env.validation.ts` |
| **Effort** | 2 hours |
| **Risk** | Low |

### 13C-7: Seed gamification achievement and badge definitions

| Item | Detail |
|------|--------|
| **Task** | Create a gamification seeder script (or API call sequence) that POSTs achievement definitions and badge definitions. Tie into a new `npm run seed:gamification` command. Include definitions for: first memorization, 7-day streak, 30-day streak, 100 ayahs memorized, 500 ayahs memorized, etc. |
| **Effort** | 3–4 hours |
| **Risk** | Low |
| **Dependency** | 13A-2, 13A-3 |

---

## Workstream 13-D: Subscriptions & Billing (Weeks 3–6)

**Goal:** Enable paid plans before public Beta.  
This is the largest Phase 13 workstream and can run in parallel with Flutter once P0/P1 are done.

| Task | Effort | Risk | Detail |
|------|--------|------|--------|
| **13D-1** Define plan tiers and feature flags | 2 days | Low | Determine Free/Pro/Academy plans; which features are gated |
| **13D-2** Stripe integration | 3–5 days | Medium | Checkout session, webhook handler, plan sync to `Subscription` document |
| **13D-3** Implement `SubscriptionsModule` | 1 week | Medium | Wire `SubscriptionRepository`, `PlanService`, billing use cases. Update `SubscriptionSchema` consumers. |
| **13D-4** Plan enforcement middleware | 3–5 days | High | Inject plan-check into relevant use cases (student limits, circle limits, AI feature gates) |
| **13D-5** Billing portal / self-serve | 2–3 days | Low | Stripe customer portal redirect |

---

## Phase 13 Timeline Summary

```
Week 1
├── 13A: All critical fixes (1 engineer, ~1 day)
│     13A-1 Register AdminModule
│     13A-2 Run permission seeder
│     13A-3 Run Quran seeder
│     13A-4 Lock CORS
│     13A-5 Local Quran snapshot
│     13A-6 Set EMAIL_PASSWORD
│
├── 13B-1: Connect Redis
│
└── Flutter development MAY START here (auth, Quran reading, memorization UI)

Week 2
├── 13B-2: Wire AI queue processor
├── 13B-3: Wire in-app notification processor
├── 13C-1: Attendance gamification fix
├── 13C-5: mongo-sanitize
├── 13C-6: Env validation
└── 13C-7: Gamification seeding

Week 3
├── 13B-4: Report queue processor
├── 13B-5: Push notification provider
├── 13C-2: Configure storage
├── 13C-3: JWT revocation blacklist
├── 13C-4: WebSocket gateway
└── 13D-1: Billing plan definition

Weeks 4–6
├── 13D-2 through 13D-5: Subscriptions & billing
├── Flutter: Student screens, Sheikh screens, Parent screens
└── 13C (remaining): NestJS v11 upgrade (post-Beta)
```

---

## Private Beta Checklist

Before sending the first Beta invitation:

- [ ] 13A-1: AdminModule registered
- [ ] 13A-2: Permissions seeded
- [ ] 13A-3: Quran data seeded
- [ ] 13A-4: CORS locked
- [ ] 13A-6: SMTP working (EMAIL_PASSWORD set)
- [ ] 13B-1: Redis connected
- [ ] 13B-2: AI queue processor wired
- [ ] 13C-3: JWT revocation (or accept 15-min window for Beta)
- [ ] 13C-7: Achievement definitions seeded
- [ ] Manual smoke test: register → verify → login → read Quran → record memorization → check gamification

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| `api.alquran.cloud` unavailable during seeding | Medium | High | Complete 13A-5 (local snapshot) immediately after first successful seed |
| Circular dependency blocks AI queue wiring | Medium | Medium | Use interface extraction pattern (not `forwardRef`) — cleaner long-term |
| Redis connection instability at scale | Low | High | Upstash serverless Redis uses HTTP fallback; existing `retryStrategy` handles transient failures |
| NestJS v11 breaking changes | High | High | Defer post-Beta; run in isolated branch with full regression suite |
| Flutter API drift from Phase 13 changes | Medium | Medium | Freeze Quran and auth API contracts first (lowest churn areas) before Flutter starts |
| Stripe webhook replay / double-billing | Low | Very High | Implement idempotency key check in webhook handler before 13D-2 goes live |
