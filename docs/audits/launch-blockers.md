# Siraja — Launch Blockers

**Date:** 2026-07-17  
**Based on:** Production Readiness Final Audit (source-code verified)

Priority tiers:
- **P0** — Critical. App cannot be safely demonstrated or released in any form.
- **P1** — Required before private Beta (invite-only, known users).
- **P2** — Required before public Beta / growth scale.
- **P3** — Future enhancement; does not block any launch tier.

---

## P0 — Critical Launch Blockers

### P0-1: AdminModule not registered in `app.module.ts`
**Impact:** All `/api/v1/admin/*` routes return 404. Audit logs, support tickets, system alerts, tenant branding, analytics dashboard, donation management, feature voting — all completely inaccessible.  
**Effort:** 15 minutes (single import statement)  
**Risk:** Low — additive change only  
**File:** `backend/src/app.module.ts`  
**Fix:**
```typescript
import { AdminModule } from './modules/admin/admin.module';
// Add to imports array:
AdminModule,
```
**Dependencies:** None  
**Order:** Do this first — everything else in the admin flow depends on it.

---

### P0-2: RBAC permission seeder not executed
**Impact:** The `PermissionsGuard` checks against permission records in MongoDB. If the collection is empty, every permission check that doesn't short-circuit on Super Admin will produce unexpected results (either over-permissive or under-permissive depending on guard logic). Invite-only Beta users cannot have correct role assignments.  
**Effort:** 5 minutes (one CLI command)  
**Risk:** Low  
**Command:** `cd backend && npm run seed:permissions`  
**Dependencies:** `MONGODB_URI` secret must be set (✅ already done)  
**Order:** Run before any user accounts are created.

---

### P0-3: Quran database not seeded — all Quran endpoints return empty
**Impact:** The platform's core function is Quran memorization. Without seeded data, every Surah/Ayah/Juz/Tafsir endpoint returns an empty array. The app is a shell.  
**Effort:** 10–30 minutes (seeder runtime depends on `api.alquran.cloud` response time)  
**Risk:** Medium — seeder fetches from an external API at runtime. If the API is unreachable or rate-limits the request, seeding will fail.  
**Command:** `cd backend && npm run seed:quran`  
**Recommendation:** After seeding succeeds, export the seeded documents as a local JSON snapshot so future re-seeding does not depend on the external API. This makes the seeder idempotent and resilient.  
**Dependencies:** P0-2 (permissions) should run first  
**Order:** Run immediately after P0-2.

---

### P0-4: CORS wildcard `"*"` must not reach production
**Impact:** The `CORS_ORIGINS` env var is currently `"*"` in the shared environment. Any website can make credentialed cross-origin requests to the API. This is unacceptable for production.  
**Effort:** 5 minutes  
**Risk:** Security — credential theft via CSRF if left as wildcard with cookies  
**Fix:** Update `CORS_ORIGINS` to the actual frontend origin(s) before any public exposure:
```
CORS_ORIGINS=https://app.siraja.website,https://siraja.website
```
**Dependencies:** Production domain must be decided  
**Order:** Before deployment; at minimum before any real user data is stored.

---

## P1 — Required Before Private Beta

### P1-1: Connect Redis — all async processing is currently no-op
**Impact:** `REDIS_URL` is not set. BullMQ is disabled. Every `QueueService.add()` call is silently discarded. Consequences:
- Welcome emails are never sent (queued but never processed)
- AI insights are never generated asynchronously
- In-app notifications are never persisted
- Attendance absence notifications are never delivered
- Gamification events reach listeners but email/notification follow-ups silently drop

Email processor works fine when Redis IS connected — it's the only fully implemented processor.  
**Effort:** 1–2 hours (provision Upstash Redis or similar; set `REDIS_URL` secret)  
**Risk:** Low — graceful fallback already implemented; enabling Redis only activates the queue path  
**Dependencies:** None  
**Order:** Do this before Beta user invitations.

---

### P1-2: Wire `AiQueueProcessor` to `AiInsightOrchestratorService`
**Impact:** When Redis is connected (P1-1), AI jobs will be dequeued immediately and silently dropped — `handleInsight()`, `handleWeaknessReport()`, `handleForecastExplanation()` all log only. The `AiInsightOrchestratorService` is fully implemented and ready; it just needs to be injected.  
**Effort:** 2–4 hours (resolve circular dependency via `forwardRef` or module restructure, inject service, call it from processor)  
**Risk:** Medium — circular dependency between `QueuesModule` and `AiModule` must be resolved carefully  
**File:** `backend/src/shared/queues/processors/ai-queue.processor.ts`  
**Dependencies:** P1-1 (Redis must be connected for jobs to actually run)  
**Order:** Immediately after P1-1.

---

### P1-3: `NotificationQueueProcessor` push and in-app handlers are stubs
**Impact:** Push notifications (`handlePush`) and in-app notifications (`handleInApp`) both log only. No FCM/APNs calls are made. No `Notification` document is persisted. The `push-subscription.schema.ts` Mongoose schema exists but no repository or service uses it.  
**Effort:** 
- In-app: 3–5 hours (inject `NotificationsService`, persist document, emit via WebSocket if gateway exists)
- Push (FCM/APNs): 1–2 days (provision Firebase project, implement `FcmProvider`, store device tokens)  
**Risk:** Medium  
**Dependencies:** P1-1 (Redis), decision on WebSocket vs polling for in-app  
**Order:** In-app first (lower risk), push after.

---

### P1-4: Set SMTP credentials (`EMAIL_PASSWORD` secret)
**Impact:** `SmtpEmailProvider` is fully implemented but `EMAIL_PASSWORD` is not set as a Replit secret. Nodemailer will fail authentication on every send. Email queue processor will throw on every job.  
**Effort:** 5 minutes  
**Risk:** Low  
**Action:** Add `EMAIL_PASSWORD` to Replit secrets. Verify against `smtp.resend.com` (currently configured host).  
**Dependencies:** Resend account + API key (Resend uses API key as SMTP password)  
**Order:** Before P1-1 (so email queue actually delivers when Redis is connected).

---

### P1-5: Configure storage for file uploads
**Impact:** `STORAGE_DRIVER` defaults to `noop`. Any feature that uploads files (student avatars, sheikh profile photos, exam attachments) silently succeeds but stores nothing. Health endpoint reports storage as `unavailable`.  
**Effort:** 2–3 hours (provision R2/S3 bucket, set 6 env vars)  
**Risk:** Low  
**Required env vars:** `STORAGE_DRIVER=s3`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`  
**Dependencies:** Cloudflare R2 or AWS S3 account  
**Order:** Before Beta if any file upload features are enabled.

---

### P1-6: Gamification achievement + badge seeding
**Impact:** `AchievementEngineService.checkAndAward()` runs on every memorization/review event but finds no achievement definitions to unlock. Gamification is live but produces no achievements.  
**Effort:** 1–2 hours (create seed data, call `POST /api/v1/gamification/achievements/seed` and badge definition endpoints)  
**Risk:** Low  
**Dependencies:** P0-2, P0-3 (users and Quran data must exist first)  
**Order:** After data seeders pass.

---

### P1-7: Attendance gamification gap (present-student award)
**Impact:** `GamificationEventListener.onAttendanceMarked()` receives an event with `absentStudentIds` only. It cannot determine which students were present and cannot award attendance points. Documented in source as intentional Phase 13 gap.  
**Effort:** 3–5 hours (modify `ATTENDANCE_MARKED` event payload to include `presentStudentIds`, or inject `CircleRepository` into listener to resolve the full roster minus absent list)  
**Risk:** Medium — requires changing the event payload contract  
**Dependencies:** None  
**Order:** Can be done in parallel with other P1 items.

---

### P1-8: Report queue processor stubs
**Impact:** `ReportQueueProcessor` handles `StudentProgress`, `CircleSummary`, and `Attendance` report jobs — all three log only. No report is generated or delivered. Reporting module's async path is dead.  
**Effort:** 1–2 days (inject reporting services, generate output — likely PDF or JSON — deliver via email or storage)  
**Risk:** Medium  
**Dependencies:** P1-1 (Redis), P1-5 (storage for PDF output)  
**Order:** After Redis and storage are configured.

---

## P2 — Required Before Public Beta / Growth Scale

### P2-1: Subscriptions and billing module
**Impact:** `SubscriptionsModule` is an empty scaffold. No plan enforcement, usage limits, or payment processing exists. Every tenant has unlimited access regardless of subscription tier. This is acceptable for private Beta but must be resolved before charging users.  
**Effort:** 2–3 weeks  
**Risk:** High — requires payment provider integration (Stripe recommended), plan enforcement across all domain modules, webhook handling  
**Dependencies:** Business decision on pricing tiers

---

### P2-2: WebSocket gateway for real-time in-app notifications
**Impact:** In-app notification delivery currently has no real-time channel. Without WebSocket, clients must poll. At scale, polling degrades both server and user experience.  
**Effort:** 3–5 days  
**Risk:** Medium — NestJS WebSocket gateway is straightforward; session management across multiple server instances requires Redis pub/sub (dependency on P1-1)  
**Dependencies:** P1-1 (Redis), P1-3 (notification processor)

---

### P2-3: JWT access token revocation (Redis blacklist)
**Impact:** Logging out a user invalidates their refresh token but their access token (15-min TTL) remains valid. If a token is stolen, there is no mechanism to revoke it before expiry.  
**Effort:** 1 day  
**Risk:** Low implementation risk; security benefit is significant  
**Dependencies:** P1-1 (Redis)

---

### P2-4: NoSQL injection hardening (`mongo-sanitize`)
**Impact:** Mongoose ODM provides partial protection. `ValidationPipe` with `whitelist: true` covers DTO inputs but repository methods that accept raw query parameters (e.g., search, filter) are not sanitized.  
**Effort:** 2–4 hours  
**Risk:** Low — additive middleware, no existing code changes needed

---

### P2-5: Audio processing pipeline
**Impact:** `AudioQueueProcessor` is a placeholder for ASR/Tajweed evaluation via audio upload. Deferred from Phase 11 (explicitly out of scope). Phase 13 is the target.  
**Effort:** 2–4 weeks (ASR provider integration, audio file pipeline via storage)  
**Risk:** High — requires external ASR provider (Whisper, AssemblyAI, etc.)  
**Dependencies:** P1-1 (Redis), P1-5 (storage), provider selection

---

### P2-6: NestJS v11 upgrade and security remediation
**Impact:** `npm audit` reports 24 vulnerabilities (7 high, 14 moderate, 3 low). All fixable only via NestJS v10 → v11 upgrade (breaking change). Vulnerable packages include `@nestjs/cli`, glob, picomatch, multer.  
**Effort:** 1–2 weeks (full regression test of all phases)  
**Risk:** High — breaking API changes in NestJS v11  
**Dependencies:** Full test suite (currently partial — spec files exist but coverage is unknown)

---

### P2-7: Env validation completeness
**Impact:** `env.validation.ts` validates only 6 of ~20 relevant env vars. Missing validation for `EMAIL_PASSWORD`, all `STORAGE_*` vars, `MOONSHOT_API_KEY`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. Boot succeeds with misconfigured email or storage.  
**Effort:** 2 hours  
**Risk:** Low

---

## P3 — Future Enhancements

| ID | Item | Effort | Notes |
|----|------|--------|-------|
| P3-1 | Local Quran data file (eliminate API dependency at seed time) | 2–4 hours | Download once and commit as JSON asset; seeder reads local file |
| P3-2 | `QuranMatcherService` (referenced in docs, not implemented) | 3–5 days | May be superseded by `MistakeDetectorService` — clarify architecture intent |
| P3-3 | ML-based forecast (replace heuristic SM-2 with trained model) | Months | Requires data collection period first |
| P3-4 | Helmet CSP customisation | 2 hours | Default helmet adequate for Beta; tighten before public launch |
| P3-5 | Per-route rate limiting on auth endpoints | 4 hours | Auth brute-force relies on account lockout; rate limiter adds defence-in-depth |
| P3-6 | Admin module test coverage | 1 week | Spec files exist for all admin services; tests need to be written |

---

## Recommended Implementation Order

```
Week 1 (P0 fixes — can be done in one day):
  P0-1  Register AdminModule          15 min
  P0-2  Run permission seeder          5 min
  P0-3  Run Quran seeder              30 min
  P0-4  Lock down CORS               10 min

Week 1–2 (P1 infrastructure):
  P1-4  Set EMAIL_PASSWORD secret      5 min
  P1-1  Connect Redis (Upstash)        2 hr
  P1-2  Wire AiQueueProcessor         4 hr
  P1-5  Configure storage             3 hr
  P1-7  Fix attendance gamification   4 hr
  P1-6  Seed achievements             2 hr
  P1-3  Wire notification processor   8 hr
  P1-8  Wire report processor         2 days

Week 3 (P2 security / scale):
  P2-7  Env validation               2 hr
  P2-4  NoSQL injection hardening    4 hr
  P2-3  JWT revocation blacklist     1 day
  P2-2  WebSocket gateway            3 days
  P2-1  Subscriptions module         → Phase 13 epic
  P2-5  Audio pipeline               → Phase 13 epic
  P2-6  NestJS v11 upgrade           → Post-Beta sprint
```
