# Phase 12 — Backend Completion Master Plan

**Created:** 2026-07-13  
**Status:** In Progress  
**Owner:** Siraja Platform Engineering

---

## Context

Phases 1–11 established the full architectural skeleton of the Siraja platform: multi-tenancy, RBAC, auth, Quran engine, people domain, memorization/review, smart mushaf, operational reporting, communication, and AI learning intelligence.

Phase 12 completes the backend — every endpoint should return real data, every integration should work, and the platform should be production-ready for 1M+ users.

---

## Phase 12A — Platform Foundation *(Highest Priority)*

| # | Component | Status |
|---|-----------|--------|
| 1 | Users Module | ✅ Implemented |
| 2 | Tenant Management Module | ✅ Implemented |
| 3 | Email Infrastructure (templates + delivery tracking) | ✅ Implemented |
| 4 | File Storage Layer (S3/R2) | ✅ Implemented |
| 5 | Quran Foundation Data Seeder | ✅ Implemented |

### 1. Users Module

**Endpoints:**
- `GET /users/me` — full profile + language + notification preferences
- `PATCH /users/me` — update profile (fullName, avatarUrl, gender)
- `PATCH /users/me/language` — update preferredLocale + timezone
- `PATCH /users/me/notifications` — update notification preferences

**Architecture:** Clean Architecture. `UserRepository` wraps the `users` collection. `UserPreferencesRepository` wraps `user_preferences` (upsert on first access).

### 2. Tenant Management Module

**Endpoints:**
- `POST /tenants` — create tenant (SUPER_ADMIN)
- `GET /tenants/current` — get current tenant details (tenant header required)
- `PATCH /tenants/current` — update tenant branding (TENANT_ADMIN)
- `GET /tenants/current/settings` — get tenant settings
- `PATCH /tenants/current/settings` — update tenant settings
- `GET /tenants/current/logo-upload-url` — presigned URL for logo upload
- `POST /tenants/onboard` — create tenant + seed admin user (SUPER_ADMIN)

**Design:** `TenantSettings` is 1:1 with `Tenant`, upserted on first access. Logo upload returns a presigned S3/R2 URL — the mobile client uploads directly to storage.

### 3. Email Infrastructure

**Templates:** HTML-first with text fallback. Templates live in `shared/email/templates/`. Base template provides branded shell (Siraja colors, RTL-ready structure, footer with unsubscribe link).

**Types:** welcome, email-verification, password-reset, notification, circle-invitation, exam-scheduled.

**Delivery tracking:** `EmailTemplateService` wraps the underlying `IEmailProvider`, adds consistent logging and rate-limit awareness.

### 4. File Storage Layer

**Interface:** `IStorageProvider` with `upload`, `delete`, `getSignedUploadUrl`, `getSignedDownloadUrl`.

**Providers:**
- `S3StorageProvider` — works with AWS S3, Cloudflare R2, Backblaze B2, MinIO (any S3-compatible endpoint). Configured via `STORAGE_*` env vars.
- `NoopStorageProvider` — default when not configured; logs a warning and returns stub URLs (safe for dev/CI).

**Config vars:**
```
STORAGE_DRIVER=s3              # s3 | noop
STORAGE_BUCKET=siraja-media
STORAGE_REGION=auto            # R2: auto, S3: us-east-1 etc.
STORAGE_ENDPOINT=              # R2: https://<account>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_PUBLIC_URL=            # CDN/public URL prefix for download links
```

### 5. Quran Foundation Data Seeder

**Data source:** `https://api.alquran.cloud/v1/` (free, no auth). Fetches the `quran-uthmani` edition for Arabic text.

**Collections seeded:**
- `surahs` — 114 documents (surah metadata + ayah counts)
- `ayahs` — 6,236 documents (Arabic text + normalized form + page/juz/hizb)
- `juzs` — 30 documents (juz start/end references)
- `quran_pages` — 604 documents (page → ayah range)

**Run:** `npm run seed:quran`

---

## Phase 12B — Learning Intelligence Core

| # | Component | Status |
|---|-----------|--------|
| 1 | Ayah Performance Auto-Update (connect mem/review/mistake/progress) | 🔲 Planned |
| 2 | Mastery Score Engine (ayah/page/surah/student) | 🔲 Planned |
| 3 | SM-2 Revision Engine (production-grade spaced repetition) | 🔲 Planned |
| 4 | Weakness Heatmap Engine (deterministic, no AI) | 🔲 Planned |
| 5 | Quran Matching Engine (normalized Arabic + Levenshtein) | 🔲 Planned |

### SM-2 Algorithm

The canonical Leitner/SM-2 algorithm adapted for Quran memorization:
- **Ease factor** (EF): starts at 2.5, adjusted after each review based on quality score 0–5
- **Interval**: day 1 → 6 → EF×previous, capped at 365 days
- **Quality mapping**: PERFECT=5, GOOD=4, HESITANT=3, NEEDS_REVIEW=2, FAILED=1, NOT_ATTEMPTED=0
- **Scheduling**: `nextReviewAt = now + interval days`

---

## Phase 12C — Scalability Foundation

| # | Component | Status |
|---|-----------|--------|
| 1 | Redis (cache + throttling + sessions) | 🔲 Planned |
| 2 | BullMQ (AI/email/notification job queues) | 🔲 Planned |
| 3 | Response compression (gzip/br) | 🔲 Planned |
| 4 | MongoDB connection pool tuning | 🔲 Planned |
| 5 | Distributed caching strategy | 🔲 Planned |

**Redis config vars:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`.

**Architecture decision:** BullMQ replaces synchronous AI/email calls in controllers. Every side-effect that can be async (welcome email, AI suggestion generation) moves to a queue job, capped at a per-tenant concurrency of 2 to prevent runaway costs.

---

## Phase 12D — Siraja Differentiation Layer

| # | Component | Status |
|---|-----------|--------|
| 1 | Reward Points System | 🔲 Planned |
| 2 | Student Levels | 🔲 Planned |
| 3 | Achievements + Badges | 🔲 Planned |
| 4 | Certificates | 🔲 Planned |
| 5 | Parent Engagement Metrics | 🔲 Planned |
| 6 | Sheikh Performance Metrics | 🔲 Planned |
| 7 | Circle Leaderboards | 🔲 Planned |
| 8 | Donation Tracking System | 🔲 Planned |
| 9 | Public Presentation Module | 🔲 Planned |

### Gamification Design

**Points:** earned per action (memorization session completed, review on time, full attendance week, exam passed). Configurable multipliers per tenant.

**Levels:** Bronze Reciter → Silver Hafiz → Gold Hafiz → Platinum Hafiz → Diamond Hafiz. Based on cumulative points + surah completion milestones.

**Certificates:** PDF generated server-side (or via S3 presigned template fill) after completing a full surah or juz. Signed with tenant branding.

### Public Presentation Module

Routes under `/public/` — no auth required:
- `GET /public/about` — Siraja vision + mission
- `GET /public/stats` — platform-wide aggregate statistics (tenants, students, ayahs memorized)
- `GET /public/roadmap` — feature roadmap
- `GET /public/donations` — donation progress toward open-source sustainability

Multilingual: controlled by `Accept-Language` header, falls back to `ar`.

---

## Phase 12E — AI Expansion (Open Source)

| # | Component | Status |
|---|-----------|--------|
| 1 | Faster-Whisper integration (tajweed voice analysis) | 🔲 Planned |
| 2 | Mistake Detection via audio | 🔲 Planned |
| 3 | Mastery Scoring via recitation | 🔲 Planned |
| 4 | Similar Verses Engine | 🔲 Planned |
| 5 | Memorization DNA profile | 🔲 Planned |
| 6 | Virtual Sheikh preparation layer | 🔲 Planned |

**Constraint:** No paid speech providers. All speech/NLP runs on self-hosted Faster-Whisper (Python microservice, called via HTTP from NestJS). No streaming — batch analysis only in v1.

**Architecture:** `SpeechAnalysisModule` in NestJS acts as a gateway to the Python microservice. Results stored in `ayah_performance` and `quran_mistakes` collections. Fallback: if microservice is down, return `{ available: false }` — never block the memorization flow.

---

## Cross-Cutting Requirements

| Requirement | Target |
|-------------|--------|
| API p95 latency | < 300 ms |
| Auth latency (p95) | < 150 ms |
| DB query p95 | < 50 ms |
| Horizontal scalability | Stateless NestJS pods, sessions in Redis |
| Accessibility | WCAG 2.1 AA (enforced at frontend) |
| Multilingual | `ar` (primary), `en`, `fr`, `ur`, `id` |
| Tenant branding | Colors, logo, name on every user-facing surface |
| Age modes | child (≤12), teen (13–17), adult (18+), senior (60+) |
| Mobile first | All endpoints optimized for < 100KB response payload |

---

## Non-Goals for Phase 12

- Frontend work (separate roadmap)
- Native mobile apps (API-only)
- Payment processing (Phase 12 billing is tracking only)
- Twilio SMS (deferred until user verification by phone is prioritized)
