# Frontend Readiness Report
**Siraja — API Completeness & Frontend Development Readiness**
*Date: 2026-07-15*

---

## Executive Summary

The backend exposes **51 controllers** and approximately **256 routes** across `/api/v1`. The vast majority of APIs needed by the web and mobile frontends are implemented. The Flutter frontend codebase (`frontend/`) contains a Clean Architecture folder skeleton (auth, academy, circle features) but **zero implemented `.dart` files** — it is a structural placeholder only.

Three backend gaps would block frontend development if left unresolved: no WebSocket endpoint (real-time push), no recitation upload/analysis endpoint, and no Quran data in the database.

---

## 1. Frontend State Assessment

### Flutter Mobile App (`frontend/`)
| Dimension | Status |
|---|---|
| Folder structure | ✅ Clean Architecture (features/auth, features/academy, features/circle) |
| Implemented Dart files | ❌ 0 files — skeleton only |
| API client | ⚠️ `api_client.dart` contains structure comments only — no Dio implementation |
| State management | Structure present; no implementation |
| Routing | `app_router.dart` stub exists |
| DI container | `injection.dart` stub exists |

**The Flutter app has not been started. All frontend development is greenfield.**

### Web Frontend
No web frontend codebase found in the repository. If a separate web admin dashboard or marketing site is planned, it must be built from scratch.

### Presentation Website
No presentation website codebase exists. The backend exposes `PresentationController` (`GET /admin/presentation/campaigns/:slug`) — a public-facing, unauthenticated endpoint that serves fundraising campaign data for embedding in an external site.

---

## 2. Complete API Inventory for Frontend Teams

### Authentication & Session Management
| Endpoint | Method | Auth | Mobile | Web Admin | Notes |
|---|---|---|---|---|---|
| `/auth/register` | POST | Public | ✅ | ✅ | Email + password |
| `/auth/login` | POST | Public | ✅ | ✅ | Returns access + refresh tokens |
| `/auth/refresh` | POST | Public (refresh token) | ✅ | ✅ | Opaque refresh token in body |
| `/auth/logout` | POST | JWT | ✅ | ✅ | |
| `/auth/verify-email` | POST | Public | ✅ | ✅ | |
| `/auth/forgot-password` | POST | Public | ✅ | ✅ | |
| `/auth/reset-password` | POST | Public | ✅ | ✅ | |
| `/auth/google` | POST | Public | ✅ | ✅ | Google ID token exchange |
| `/auth/devices` | GET/DELETE | JWT | ✅ | ✅ | Device management |
| `/auth/sessions` | GET/DELETE | JWT | ✅ | ✅ | Session management |
| **MISSING:** Apple Sign-In | — | — | ❌ | — | Not implemented |
| **MISSING:** Phone/OTP login | — | — | ❌ | — | Not implemented |

### User & Profile
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/users/me` | GET | JWT | ✅ | ✅ |
| `/users/me` | PATCH | JWT | ✅ | ✅ |
| `/user-preferences` | GET/PATCH | JWT | ✅ | ✅ |
| **MISSING:** `/users` (list all) | GET | Admin | ❌ | ❌ | Admin user list not implemented |
| **MISSING:** `/users/:id` (admin get) | GET | Admin | — | ❌ | |
| **MISSING:** `/users/:id` (admin delete) | DELETE | Admin | — | ❌ | |

### Tenants
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/tenants` | POST | Super-admin | — | ✅ |
| `/tenants/settings` | PATCH | Tenant-admin | — | ✅ |
| `/admin/tenants` (admin panel) | GET/PATCH | Admin | — | ✅ |

### Students
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/students` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/students/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Parents
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/parents` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/parents/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Sheikhs
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/sheikhs` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/sheikhs/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Supervisors
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/supervisors` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/supervisors/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Circles (Halaqa)
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/circles` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/circles/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Assignments
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/assignments` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/assignments/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |
| `/student-assignments` | GET, POST | JWT + RBAC | ✅ | ✅ |

### Attendance
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/attendance` | POST | JWT + RBAC | ✅ | ✅ |
| `/attendance/bulk` | POST | JWT + RBAC | ✅ | ✅ |
| `/attendance` | GET | JWT + RBAC | ✅ | ✅ |
| `/attendance/:id` | GET, PATCH | JWT + RBAC | ✅ | ✅ |

### Exams
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/exams` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/exams/:id` | GET | JWT + RBAC | ✅ | ✅ |
| `/exams/:id/grade` | PATCH | JWT + RBAC | ✅ | ✅ |

### Assessments
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/assessments` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/assessments/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Memorization
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/memorization` | POST, GET | JWT + RBAC | ✅ | ✅ |
| `/memorization/:id` | GET | JWT + RBAC | ✅ | ✅ |
| `/memorization/:id/approve` | PATCH | JWT + RBAC | ✅ | ✅ |

### Reviews
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/reviews` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/reviews/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Mistakes
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/mistakes` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/mistakes/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Progress
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/progress` | GET | JWT + RBAC | ✅ | ✅ |
| `/progress/:id` | GET | JWT + RBAC | ✅ | ✅ |

### Forecast
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/forecast/students/:id` | GET | JWT + RBAC | ✅ | ✅ |

### Smart Mushaf
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/smart-mushaf` (page view) | GET | JWT | ✅ | — |
| `/smart-mushaf/detect-mistakes` | POST | JWT + RBAC | ✅ | — |
| `/smart-mushaf/weakness/students/:id` | GET | JWT + RBAC | ✅ | ✅ |
| `/smart-mushaf/revisions/due/students/:id` | GET | JWT + RBAC | ✅ | ✅ |
| **MISSING:** `/recitation/upload` | POST | JWT | ❌ | — | Phase 13 |
| **MISSING:** `/recitation/sessions/:id` | GET | JWT | ❌ | — | Phase 13 |

### Quran Content
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/surahs` | GET | JWT | ✅ | ✅ |
| `/surahs/:id` | GET | JWT | ✅ | ✅ |
| `/ayahs` | GET | JWT | ✅ | ✅ |
| `/ayahs/:id` | GET | JWT | ✅ | ✅ |
| `/tafsir/:ayahId` | GET | JWT | ✅ | ✅ |
| `/quran-search` | GET | JWT | ✅ | ✅ |
| `/quran-bookmarks` | GET, POST, DELETE | JWT | ✅ | — |
| `/quran-notes` | GET, POST, PATCH, DELETE | JWT | ✅ | — |
| `/quran-metadata` | GET | JWT | ✅ | ✅ |
| `/ayah-notes` | GET, POST, PATCH, DELETE | JWT | ✅ | — |
| `/ayah-performance` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/ayah-mistakes-overlay/:studentId` | GET | JWT + RBAC | ✅ | ✅ |
| `/memorization-heatmap/:studentId` | GET | JWT + RBAC | ✅ | ✅ |
| **MISSING:** `/quran/ayahs/:id/similar` | GET | JWT | ❌ | — | Phase 13 — needs vector DB |
| **DATA GAP:** All above return empty | — | — | ⚠️ | ⚠️ | Quran not seeded |

### Notifications
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/notifications` | GET, POST | JWT | ✅ | ✅ |
| `/notifications/unread-count` | GET | JWT | ✅ | ✅ |
| `/notifications/read-all` | PATCH | JWT | ✅ | ✅ |
| `/notifications/:id` | GET | JWT | ✅ | ✅ |
| `/notifications/:id/read` | PATCH | JWT | ✅ | ✅ |
| `/notifications/:id/archive` | PATCH | JWT | ✅ | ✅ |
| `/notifications/:id` | DELETE | JWT | ✅ | ✅ |
| `/notification-templates` | GET, POST, PATCH, DELETE | JWT + Admin | — | ✅ |
| **MISSING:** WebSocket push | — | — | ❌ | ❌ | Phase 13 — clients must poll |

### Messaging
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/messaging/threads` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/messaging/threads/:id` | GET | JWT + RBAC | ✅ | ✅ |
| `/messaging/threads/:id/messages` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/messaging/threads/:id/archive` | PATCH | JWT + RBAC | ✅ | ✅ |
| **MISSING:** WebSocket real-time | — | — | ❌ | ❌ | Phase 13 |

### Announcements
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/announcements` | GET, POST | JWT + RBAC | ✅ | ✅ |
| `/announcements/:id` | GET, PATCH, DELETE | JWT + RBAC | ✅ | ✅ |

### Reporting
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/reporting/students/:studentId` | GET | JWT + RBAC | ✅ | ✅ |
| `/reporting/parents/:parentId` | GET | JWT + RBAC | ✅ | ✅ |
| `/reporting/sheikhs/:sheikhId` | GET | JWT + RBAC | ✅ | ✅ |
| `/reporting/circles/:groupId` | GET | JWT + RBAC | ✅ | ✅ |
| `/reporting/supervisors/:supervisorId` | GET | JWT + RBAC | ✅ | ✅ |

### Gamification
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/gamification/students/:id/points` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/students/:id/achievements` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/students/:id/badges` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/students/:id/stats` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/students/:id/transactions` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/students/:id/ranking` | GET | JWT + RBAC | ✅ | ✅ |
| `/gamification/leaderboard` | GET | JWT | ✅ | ✅ |
| `/gamification/age-profile` | GET | JWT | ✅ | ✅ |
| `/gamification/achievements/definitions` | GET | JWT | ✅ | ✅ |
| `/gamification/badges/definitions` | GET/POST/PATCH/DELETE | JWT + Admin | — | ✅ |
| `/gamification/reward-rules` | GET/POST/PATCH/DELETE | JWT + Admin | — | ✅ |
| `/gamification/config` | GET/PATCH | JWT + Admin | — | ✅ |

### AI / Intelligence
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/ai/students/:id/mistake-insight` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/students/:id/revision-recommendation` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/students/:id/memorization-recommendation` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/students/:id/forecast-explanation` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/students/:id/insights` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/sheikhs/:id/report` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/parents/:id/report` | GET | JWT + RBAC | ✅ | ✅ |
| `/ai/reports/:id/acknowledge` | PATCH | JWT + RBAC | ✅ | ✅ |
| **MISSING:** `/virtual-sheikh/sessions` | POST | JWT | ❌ | — | Phase 13 |
| **MISSING:** `/virtual-sheikh/sessions/:id/message` | POST | JWT | ❌ | — | Phase 13 |
| **MISSING:** `/ai/students/:id/memorization-dna` | GET | JWT | ❌ | — | Phase 13 |
| **MISSING:** `/ai/students/:id/heatmap` (AI layer) | GET | JWT | ❌ | — | Phase 13 |

### Admin Panel (Phase 12E)
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/admin/dashboard` | GET | JWT + Admin | — | ✅ |
| `/admin/analytics/growth` | GET | JWT + Admin | — | ✅ |
| `/admin/analytics/engagement` | GET | JWT + Admin | — | ✅ |
| `/admin/analytics/retention` | GET | JWT + Admin | — | ✅ |
| `/admin/analytics/donations` | GET | JWT + Admin | — | ✅ |
| `/admin/audit` | GET | JWT + Admin | — | ✅ |
| `/admin/campaigns` | GET, POST | JWT + Admin | — | ✅ |
| `/admin/campaigns/:id/donate` | POST | Public | — | ✅ |
| `/admin/feedback` | GET, POST | JWT | ✅ | ✅ |
| `/admin/feature-requests` | GET, POST, PATCH | JWT | ✅ | ✅ |
| `/admin/support/tickets` | GET, POST | JWT | ✅ | ✅ |
| `/admin/support/tickets/:id/reply` | POST | JWT + Admin | — | ✅ |
| `/admin/alerts` | GET, POST, PATCH | JWT + Admin | — | ✅ |
| `/admin/tenants` | GET, PATCH | JWT + Admin | — | ✅ |
| `/admin/presentation/campaigns/:slug` | GET | **Public** | — | ✅ |

### System
| Endpoint | Method | Auth | Mobile | Web Admin |
|---|---|---|---|---|
| `/system/health` | GET | Public | — | ✅ |

---

## 3. Backend Gaps Blocking Frontend Development

### Blocker 1: Quran Data Not Seeded ❌ CRITICAL
**Impact:** Every Quran-related screen in the mobile app will be empty. Surahs list, ayah viewer, Smart Mushaf, search — all return `[]`.
**Fix:** Run `npm run seed:quran` (estimated 5–10 minutes). See Task #2.
**Blocks:** Smart Mushaf, Quran Search, Tafsir, Ayah Performance, Weakness Heatmap screens.

### Blocker 2: No WebSocket / Real-Time Push ❌ HIGH
**Impact:** Mobile apps cannot receive push notifications or real-time messages. Must implement polling (every 30s for notifications, every 5s for messaging) — degrades UX, increases server load.
**Fix:** Phase 13.2 — WebSocket gateway (3 weeks).
**Blocks:** Notification center live updates, in-app chat real-time experience.

### Blocker 3: No Recitation Upload API ❌ HIGH
**Impact:** Core mobile UX feature — student taps record, speaks ayah, gets instant feedback — cannot be built.
**Fix:** Phase 13.3 — Audio ingestion + Whisper pipeline (5 weeks).
**Blocks:** Smart Mushaf recitation mode, real-time mistake detection during recitation.

### Gap 4: No User Admin List Endpoint ⚠️ MEDIUM
**Impact:** Web admin dashboard cannot display a list of all users in a tenant.
**Fix:** Add `GET /users` + `GET /users/:id` + `DELETE /users/:id` to `UsersController`. Small task — 1–2 days.
**Blocks:** Admin user management screen.

### Gap 5: No Apple Sign-In ⚠️ MEDIUM
**Impact:** App Store requirement on iOS — Apple login must be offered if any other social login is offered. Google OAuth is implemented; Apple is not.
**Fix:** Implement `AppleTokenVerifierService` mirroring `GoogleTokenVerifierService`. ~1 week.
**Blocks:** iOS App Store submission.

### Gap 6: AI Endpoints Require `MOONSHOT_API_KEY` ⚠️ MEDIUM
**Impact:** All 8 AI endpoints return 500 errors if the API key is not configured.
**Fix:** Add `MOONSHOT_API_KEY` secret (Task #4).
**Blocks:** AI insights screens (non-blocking for core features).

### Gap 7: No Virtual Sheikh Chat API ⚠️ LOW (Phase 13)
**Impact:** Cannot build the conversational AI screen.
**Fix:** Phase 13.4.1 — Virtual Sheikh engine.
**Blocks:** Virtual Sheikh feature.

---

## 4. API Conventions for Frontend Teams

### Base URL
```
https://<domain>/api/v1
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
X-Tenant-Slug: <tenant_slug>
```

### Token Refresh
- Access token TTL: **15 minutes**
- Refresh token TTL: **30 days** (opaque, sent as JSON body field `refreshToken`)
- `POST /auth/refresh` — returns new `accessToken` + `refreshToken`
- **Important:** Refresh tokens rotate on use. Store the new token returned. Replaying an old refresh token invalidates the entire token family.

### Error Format
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Pagination
Most list endpoints accept `?page=1&limit=20` query parameters. Response shape:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```
(exact shape may vary per endpoint — verify against Swagger at `/docs`)

### Swagger Documentation
Available at `/docs` when server is running. All routes, request bodies, and response schemas are documented.

### Tenant Resolution
The backend resolves tenant from `X-Tenant-Slug` header. If the header is absent, the backend is permissive (does not reject the request at middleware level) but downstream guards enforce tenant scope from the JWT `tenantId` claim.

---

## 5. Screen-to-API Mapping

### Mobile App — Student Role

| Screen | APIs Required | Ready? |
|---|---|---|
| Login / Register | `/auth/login`, `/auth/register`, `/auth/google` | ✅ |
| Home / Dashboard | `/gamification/students/:id/stats`, `/memorization` (recent), `/notifications/unread-count` | ✅ |
| Smart Mushaf Reader | `/surahs`, `/ayahs`, `/ayah-notes`, `/quran-bookmarks` | ✅ (needs seed) |
| Record Recitation | `/recitation/upload` | ❌ Phase 13 |
| My Progress | `/progress`, `/forecast`, `/ayah-performance` | ✅ |
| Weakness Heatmap | `/smart-mushaf/weakness/students/:id` | ✅ (needs seed) |
| Due Revisions | `/smart-mushaf/revisions/due/students/:id` | ✅ (needs seed) |
| Achievements | `/gamification/students/:id/achievements`, `/gamification/students/:id/badges` | ✅ |
| Leaderboard | `/gamification/leaderboard` | ✅ |
| Notifications | `/notifications`, `/notifications/unread-count` | ✅ (polling only) |
| Messaging | `/messaging/threads`, `/messaging/threads/:id/messages` | ✅ (polling only) |
| AI Insights | `/ai/students/:id/insights`, `/ai/students/:id/revision-recommendation` | ✅ (needs key) |
| Virtual Sheikh | `/virtual-sheikh/sessions` | ❌ Phase 13 |
| Tafsir | `/tafsir/:ayahId` | ✅ (needs seed) |
| Search Quran | `/quran-search?q=` | ✅ (needs seed) |

### Mobile App — Sheikh Role

| Screen | APIs Required | Ready? |
|---|---|---|
| Circle Management | `/circles`, `/students` | ✅ |
| Mark Attendance | `/attendance/bulk` | ✅ |
| Record Memorization | `/memorization`, `/memorization/:id/approve` | ✅ |
| Exam / Assessment | `/exams`, `/assessments` | ✅ |
| Student Detail | `/reporting/students/:id`, `/ayah-performance`, `/mistakes` | ✅ |
| AI Sheikh Report | `/ai/sheikhs/:id/report` | ✅ (needs key) |
| Assignments | `/assignments`, `/student-assignments` | ✅ |

### Mobile App — Parent Role

| Screen | APIs Required | Ready? |
|---|---|---|
| Child Overview | `/reporting/parents/:id` | ✅ |
| Child Progress | `/progress`, `/gamification/students/:id/stats` | ✅ |
| AI Parent Report | `/ai/parents/:id/report` | ✅ (needs key) |
| Messages with Sheikh | `/messaging/threads` | ✅ |

### Web Admin Dashboard

| Screen | APIs Required | Ready? |
|---|---|---|
| Platform Dashboard | `/admin/dashboard`, `/admin/analytics/*` | ✅ |
| Tenant Management | `/admin/tenants`, `/tenants` | ✅ |
| User Management | `/users/me` only — no list/admin CRUD | ⚠️ Gap |
| Support Tickets | `/admin/support/tickets` | ✅ |
| Fundraising Campaigns | `/admin/campaigns`, `/admin/analytics/donations` | ✅ |
| Feature Requests | `/admin/feature-requests` | ✅ |
| User Feedback | `/admin/feedback` | ✅ |
| Audit Logs | `/admin/audit` | ✅ |
| System Alerts | `/admin/alerts` | ✅ |
| Gamification Config | `/gamification/config`, `/gamification/reward-rules` | ✅ |
| Reporting | `/reporting/*` | ✅ |

### Presentation Website

| Section | API Required | Ready? |
|---|---|---|
| Fundraising campaign page | `GET /admin/presentation/campaigns/:slug` | ✅ (public, no auth) |
| Donation form | `POST /admin/campaigns/:id/donate` | ✅ (public) |
| Marketing stats | None — static content | N/A |

---

## 6. Recommended Frontend Development Order

**Week 1–2:** Configure secrets (Redis, SMTP, S3, Moonshot API key), run seeders. Unblocks all data-dependent development.

**Week 3–4:** Implement Flutter `api_client.dart` (Dio + interceptors for auth + tenant header). Build auth screens (login, register, token refresh flow).

**Week 5–8:** Core mobile screens — Smart Mushaf reader, memorization recording, progress dashboard, notifications (polling), messaging (polling). All APIs are ready.

**Week 9–12:** Gamification screens, AI insights screens, reporting views, Sheikh workflow (attendance, exams, approval).

**Week 13–16:** Web admin dashboard — analytics, tenant management, support, audit, gamification config.

**Week 17–20 (Phase 13 dependency):** Real-time (WebSocket) notification center and messaging. Recitation recording + Whisper feedback. Virtual Sheikh chat.

**Week 21+:** Advanced AI screens — Memorization DNA profile, AI-enhanced heatmaps, Similar Verses.
