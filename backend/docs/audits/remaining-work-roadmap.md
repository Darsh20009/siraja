# Siraja Backend — Remaining Work Roadmap

**Generated:** 2026-07-23  
**Based on:** `final-project-status.md` audit

---

## Summary

The Siraja backend is ~87% complete. The core platform — authentication, people management, memorization engine, Smart Mushaf, AI intelligence, gamification, and admin operations — is production-quality and ready for frontend integration today. The remaining work falls into three buckets: **critical pre-launch gaps** (push notifications, payments, WebSockets), **quality hardening** (test coverage, index fixes, type debt), and **future-phase features** (academies, SMS, audio).

---

## Milestone Readiness

| Milestone | Readiness | Remaining Blockers |
|---|---|---|
| **Start frontend / Flutter development** | ✅ **READY NOW** | None — API is stable, Swagger documented |
| **Internal beta launch** | ⚠️ 2–4 weeks | Seed data, OAuth credentials, smoke-test critical paths |
| **Public beta launch** | 4–8 weeks | Push notifications, basic payment tier, e2e tests |
| **Production launch** | 10–16 weeks | All of the above + WebSockets, security audit, load testing |

---

## Priority 1 — Critical Blockers

These items will prevent a functional beta from working.

### 1.1 — Seed the Database

**Status:** Not done  
**Effort:** 30 minutes  
**Impact:** Without seeding, all RBAC checks fail (no permissions in DB), Quran endpoints return empty, and no demo accounts exist.

```bash
cd backend
npm run seed:permissions   # Must run first
npm run seed:quran         # Pulls from AlQuran.cloud API (~6,200 ayahs)
npm run seed:beta-demo     # Creates demo tenant + 4 demo users
```

---

### 1.2 — Google OAuth + Apple Sign-In Credentials

**Status:** Code complete; credentials missing  
**Effort:** 1–2 hours (credentials setup in Google Cloud / Apple Developer)  
**Impact:** Social login unavailable; Flutter app will depend on this.

Secrets to add:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (set to `https://<domain>/api/v1/auth/google/callback`)
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- `APPLE_CALLBACK_URL`

---

### 1.3 — Fix Duplicate Mongoose Index Warnings

**Status:** 2 warnings on every startup  
**Effort:** 1 hour  
**File to fix:** Find schemas where `tenantId` is declared with both `index: true` on the field and `schema.index({ tenantId: 1 })`. Remove the duplicate `schema.index()` call or the inline `index: true`.

```bash
# Find candidates
grep -rn "tenantId" backend/src/database/mongoose/schemas/ | grep "index"
```

---

## Priority 2 — High Priority (Required for Beta)

### 2.1 — FCM / APNS Push Notifications

**Status:** Infrastructure exists (queue processor, notification schema); delivery stub only  
**Effort:** 3–5 days  
**Files:** `backend/src/modules/notifications/`, `backend/src/shared/queues/processors/notification-queue.processor.ts`

What to implement:
1. Add Firebase Admin SDK (`firebase-admin` npm package)
2. Wire `FCM_SERVICE_ACCOUNT_JSON` secret
3. Implement `notification-queue.processor.ts` push handler (currently logs only)
4. Store FCM/APNS device tokens in `push-subscription.schema.ts` (schema already exists)
5. Send push on `MemorizationRecorded`, `ReviewDue`, `ExamScheduled` events

---

### 2.2 — WebSocket / Real-Time Messaging

**Status:** `in-app-messaging` is REST-only; no `@WebSocketGateway` anywhere  
**Effort:** 3–5 days  
**Files:** `backend/src/modules/in-app-messaging/`

What to implement:
1. Add `@nestjs/websockets` + `socket.io`
2. Create `MessagingGateway` for thread join/leave and message push
3. Emit `message:new` events when a message is posted via REST
4. Auth: validate JWT on WebSocket handshake
5. Tenant isolation: namespace sockets per tenant slug

---

### 2.3 — Subscriptions / Payment Processing

**Status:** Module is an empty scaffold; `payment.schema.ts` and `subscription.schema.ts` exist  
**Effort:** 5–8 days  
**Files:** `backend/src/modules/subscriptions/` (currently empty)

What to implement:
1. Choose provider (Stripe recommended — `stripe` npm package)
2. Plans: Free / Pro / Academy tiers
3. Stripe Checkout / Customer Portal
4. Webhook handler (`/api/v1/webhooks/stripe`) for subscription lifecycle events
5. Guard `PlanGuard` to restrict features by subscription tier
6. Wire `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` secrets

---

### 2.4 — E2E / Integration Test Suite

**Status:** Zero e2e tests; 32 unit test suites (all mocked)  
**Effort:** 5–10 days  
**Files:** `backend/test/` (currently empty)

What to implement:
1. Add `mongodb-memory-server` for in-process MongoDB
2. Create `jest-e2e.json` test configuration (already referenced in `package.json`)
3. Write e2e specs for critical paths:
   - Auth flow (register → verify → login → refresh → logout)
   - Student memorization workflow (create → approve → review → progress)
   - RBAC enforcement (403 on wrong role, 401 on missing token)
   - Multi-tenancy isolation (tenant A cannot see tenant B data)
4. Set up GitHub Actions CI pipeline

---

### 2.5 — Unit Test Coverage for Core Domain Modules

**Status:** No tests for ~30 modules  
**Effort:** 5–8 days  
**Priority modules to cover:**

| Module | Why Critical |
|---|---|
| `memorization` | Core product domain |
| `reviews` | SM-2 integration correctness |
| `progress` | Materialised state correctness |
| `forecast` | AI-adjacent; complex aggregation |
| `attendance` | Operational correctness |
| `ai` (orchestrator) | Cost control logic must not regress |
| `smart-mushaf` | Core UX feature |
| `circles` | RBAC + cross-module injection |
| RBAC guards | Permission enforcement |

---

## Priority 3 — Medium Priority (Polish for Launch)

### 3.1 — Fix TypeScript `as any` Casts

**Effort:** 2–3 hours  
**Impact:** Type safety, prevents hidden runtime errors

Replace `as any` with proper typed Mongoose helpers or explicit type assertions. Key locations:
- `logout.use-case.ts:24` — type `_id` properly
- `attendance.repository.ts:54` — use `.toObject<T>()`
- `update-student-progress.use-case.ts:69,91` — type the range field
- `get-completion-forecast.use-case.ts:159` — same range field
- `google.strategy.ts:37` — type the passport `done` result

---

### 3.2 — Move Hardcoded URLs to Config

**Effort:** 1 hour  
**Files:** `brand-config.ts:72`, `mailer.service.ts:13`

`'https://siraja.website'` appears hardcoded in 2 files. Add `APP_URL` to the config schema (it's already in `.env.example`) and inject via `ConfigService`.

---

### 3.3 — Implement `academies` Module

**Status:** Empty scaffold (`.gitkeep` files only)  
**Effort:** 3–4 days  
**Purpose:** Appears intended as an organisational layer above circles (e.g., one academy with multiple circles). Clarify domain model before implementing.

---

### 3.4 — Complete `subscriptions` Tafsir Data

**Status:** Endpoint exists (`GET /quran/surahs/:n/ayahs/:n/tafsir`); zero data in DB  
**Effort:** 1–2 days  
**Action:** Add tafsir seeder (e.g., fetch from a public tafsir API or import static JSON for Ibn Kathir / Al-Jalalayn).

---

### 3.5 — User Preferences — Flesh Out

**Status:** Controller + repository interface exist; minimal logic  
**Effort:** 1–2 days  
**Items to wire:** notification frequency, preferred Mushaf font size, theme preference, language, reciter preference.

---

### 3.6 — Subdomain-Based Tenant Resolution

**Status:** Config placeholder; only `X-Tenant-Slug` header strategy implemented  
**Effort:** 2–3 days  
**Files:** `backend/src/core/infrastructure/tenancy/tenant.middleware.ts`, `backend/src/config/configuration.ts:20`

Implement host-based resolution: extract tenant slug from `req.hostname` (e.g., `tuwaiq.siraja.website → tuwaiq`) as an alternative strategy. Keep header fallback.

---

### 3.7 — Notification Delivery — Enrich

**Status:** Email delivery works; in-app delivery via DB works; push is stub  
**Effort:** 1 day (after 2.1 is done)  
**Action:** After FCM is wired (2.1), add notification preference checks so users who opt out of push still receive in-app + email.

---

## Priority 4 — Nice to Have / Future Phase

### 4.1 — Audio Recitation Processing Pipeline

**Status:** Explicit placeholder; deferred by design  
**Effort:** 2–4 weeks (depends on ASR/recitation provider chosen)  
**Files:** `backend/src/shared/queues/processors/audio-queue.processor.ts`, `backend/src/shared/queues/jobs/audio.jobs.ts`

Requires: choice of ASR provider (Whisper, Arabic-specific model), audio storage in S3/R2, integration with mistake detector.

---

### 4.2 — SMS / OTP Verification

**Status:** Intentionally deferred in Phase 4 scope  
**Effort:** 2–3 days  
**Notes:** Phone is currently identity-only (login by phone + password). Add SMS OTP for account recovery or phone-number verification if required.

---

### 4.3 — Performance Optimisation & Caching

**Effort:** 3–5 days  
**Items:**
- Add Redis caching to high-frequency read endpoints (Quran surahs/ayahs, leaderboard, dashboard overview)
- Add DB indexes for common query patterns (review `explain()` output for memorization, progress, attendance queries)
- Enable response caching headers for static Quran data

---

### 4.4 — Security Audit

**Effort:** 3–5 days  
**Items:**
- Review all public (unauthenticated) routes for data leakage
- Verify multi-tenant data isolation (tenant A cannot query tenant B's data) with integration tests
- Review rate limiting configuration (currently 100 req/60s globally — may be too permissive for auth endpoints)
- Add `Content-Security-Policy` header (Helmet defaults are a start)
- Audit `as any` casts that bypass input validation

---

### 4.5 — Monitoring & Observability

**Effort:** 2–3 days  
**Items:**
- Structured JSON logging (replace NestJS default logger with `pino` or `winston`)
- Add request ID tracing middleware
- Expose `/api/v1/metrics` (Prometheus-compatible) or wire to a logging service
- Alert on queue depth and failed jobs

---

### 4.6 — Admin Super-User Panel

**Effort:** 3–5 days  
**Notes:** Current admin module covers platform operations. A dedicated super-admin interface for managing all tenants (create, suspend, billing) is missing.

---

## Effort Summary

| Priority | Item | Effort |
|---|---|---|
| P1 | Seed database | 0.5 day |
| P1 | OAuth credentials setup | 0.5 day |
| P1 | Fix duplicate Mongoose indexes | 0.5 day |
| P2 | FCM/APNS push notifications | 3–5 days |
| P2 | WebSocket real-time messaging | 3–5 days |
| P2 | Stripe subscription billing | 5–8 days |
| P2 | E2E test suite | 5–10 days |
| P2 | Unit test coverage expansion | 5–8 days |
| P3 | TypeScript `as any` cleanup | 0.5 day |
| P3 | Hardcoded URL config | 0.5 day |
| P3 | Academies module | 3–4 days |
| P3 | Tafsir data seeder | 1–2 days |
| P3 | User preferences completion | 1–2 days |
| P3 | Subdomain tenancy | 2–3 days |
| P4 | Audio pipeline | 2–4 weeks |
| P4 | SMS/OTP | 2–3 days |
| P4 | Performance + caching | 3–5 days |
| P4 | Security audit | 3–5 days |
| P4 | Monitoring / observability | 2–3 days |

**Total to Beta (P1 + P2):** ~4–6 weeks of focused development  
**Total to Production (P1–P4 minus audio):** ~10–16 weeks

---

## What Frontend / Flutter Can Start On Today

The following API areas are stable, fully auth-gated, and ready for Flutter integration now:

1. **Auth flows** — register, login, logout, token refresh, email verify, password reset
2. **User profile** — `GET/PATCH /users/me`
3. **Quran browsing** — surahs, ayahs, search, bookmarks, notes
4. **People management** — students, sheikhs, circles, parents, supervisors
5. **Memorization** — record, approve, review scheduling
6. **Progress & forecast** — student progress view, completion forecast
7. **Smart Mushaf** — weakness heatmap, mistake overlay, due revisions
8. **Attendance, Exams, Assignments, Assessments**
9. **AI insights** — all 6 use cases (requires `MOONSHOT_API_KEY`)
10. **Gamification** — leaderboard, points, achievements, streaks
11. **Announcements**
12. **In-app messaging** (REST; WebSocket to follow)
13. **Admin panel** — dashboard, donations, support, feedback, audit

**Swagger UI** at `GET /docs` documents all routes with DTOs, auth requirements, and example responses.
