# Phase 12E — Platform Operations & Launch Readiness Architecture

**Version:** 1.0  
**Date:** 2026-07-18  
**Status:** Implemented

---

## Overview

Phase 12E completes the Siraja backend before frontend development begins. It delivers the full operational layer: donation campaigns with milestone tracking, a rich feedback lifecycle, community feature voting with follow/merge, a comprehensive support centre, an enhanced super-admin dashboard (DAU/WAU/MAU, queue/AI/email/storage health), a public presentation API with testimonials, and a daily analytics snapshot scheduler.

---

## 1. Module Architecture

All Phase 12E functionality lives in `AdminModule` (`src/modules/admin/`), which follows the same Clean Architecture layering as all other Siraja modules:

```
AdminModule
├── domain/
│   └── repositories/         — repository interfaces (contracts)
├── application/
│   ├── dto/                  — validated request DTOs
│   └── services/             — business logic + scheduler
└── infrastructure/
    ├── controllers/           — HTTP layer
    └── repositories/         — Mongoose implementations
```

Shared MongoDB schemas live in `src/database/mongoose/schemas/` and are exported via the barrel `index.ts`.

---

## 2. Donation System

### Data model

| Collection | Key Fields |
|---|---|
| `donation_campaigns` | `name`, `description`, `targetAmount`, `raisedAmount`, `status` (ACTIVE/COMPLETED/PAUSED/CANCELLED), `stages[]`, `isPublic` |
| `donations` | `campaignId`, `donorUserId`, `amount`, `currency` (SAR), `method` (BANK_TRANSFER/CASH/ONLINE/OTHER), `status` (PENDING/CONFIRMED/REJECTED/REFUNDED), `isAnonymous`, `donorName/Phone/Email`, `receiptUrl` |

### Milestone stages (hardcoded defaults)

| Stage | Label | Target |
|---|---|---|
| 1 | المرحلة الأولى | 5,000 SAR |
| 2 | المرحلة الثانية | 15,000 SAR |
| 3 | المرحلة الثالثة | 30,000 SAR |
| 4 | المرحلة الرابعة | 50,000 SAR |
| 5 | المرحلة الخامسة | 100,000 SAR |
| 6 | المرحلة السادسة | 150,000 SAR |

Campaigns may override these with custom `stages[]` arrays. `DonationsService.getFundraisingProgress(raisedAmount)` computes per-stage `completed` and `progressPercent` on-the-fly.

### Flow

```
POST /donations          →  status=PENDING
POST /donations/:id/confirm  →  status=CONFIRMED + campaignRepo.incrementRaised()
POST /donations/:id/reject   →  status=REJECTED
```

### Public APIs

- `GET /api/v1/donations/public` — active public campaigns
- `GET /api/v1/donations/campaigns/:id/public` — single campaign with live progress
- `GET /api/v1/donations/fundraising-progress` — milestone progress for any raised amount

---

## 3. Feedback System

### Status lifecycle

```
PENDING → UNDER_REVIEW → APPROVED   → IN_PROGRESS → COMPLETED
                       ↘ REJECTED
                                     ↘ REJECTED
PENDING → UNDER_REVIEW → REJECTED
PENDING → REJECTED
PENDING/OPEN → CLOSED (any time)
RESOLVED → CLOSED (legacy)
```

Transitions are validated by `FeedbackService.changeStatus()` against the `ALLOWED_TRANSITIONS` map. Terminal states (`COMPLETED`, `REJECTED`, `CLOSED`) cannot be transitioned out of.

### Schema additions (Phase 12E)

- `isPublic: boolean` — whether the feedback is visible on the community wall
- `status` enum extended with: `PENDING`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`

### Public API

- `GET /api/v1/feedback/public` — publicly-visible feedback only (isPublic: true)
- `POST /api/v1/feedback` — submit (unauthenticated or authenticated)

### Admin API

- `GET /api/v1/feedback` — list with filters (`type`, `status`, `tenantId`, `isPublic`)
- `PATCH /api/v1/feedback/:id/status` — full status workflow
- `PATCH /api/v1/feedback/:id/visibility` — toggle isPublic
- `GET /api/v1/feedback/stats` — counts by type, counts by status, average rating

---

## 4. Feature Voting System

### Schema

| Collection | Key Fields |
|---|---|
| `feature_requests` | `title`, `description`, `status`, `priority`, `voteCount`, `reviewedBy`, `reviewedAt`, `completedAt`, `tags` |
| `feature_votes` | `featureRequestId`, `userId`, `tenantId` (unique index: featureRequestId+userId) |
| `feature_follows` | `featureRequestId`, `userId`, `tenantId` (unique index: featureRequestId+userId) |

### Status workflow

```
PROPOSED → ACCEPTED → IN_PROGRESS → COMPLETED
         ↘ REJECTED
```

### Voting vs Following

- **Vote** — counts toward ranking; one vote per user per feature. Transferred when features are merged.
- **Follow** — receive updates when status changes; independent of votes. Not migrated on merge (users follow the target separately).

### Merge (admin)

`POST /api/v1/feature-requests/:id/merge/:targetId`

1. Loads source and target feature requests.
2. Calls `FeatureRequestRepository.mergeInto(sourceId, targetId)` — increments target `voteCount` by source's `voteCount`, then deletes the source.
3. Emits `FEATURE_REQUEST_STATUS_CHANGED` event with `status: 'merged_into'`.

### Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/feature-requests` | Public |
| GET | `/feature-requests/top` | Public |
| GET | `/feature-requests/:id` | Public |
| POST | `/feature-requests` | Authenticated |
| POST | `/feature-requests/:id/vote` | Authenticated |
| DELETE | `/feature-requests/:id/vote` | Authenticated |
| POST | `/feature-requests/:id/follow` | Authenticated |
| DELETE | `/feature-requests/:id/follow` | Authenticated |
| GET | `/feature-requests/:id/follow-status` | Authenticated |
| PATCH | `/feature-requests/:id/review` | FEATURE_VOTING.APPROVE |
| PATCH | `/feature-requests/:id/priority` | FEATURE_VOTING.UPDATE |
| POST | `/feature-requests/:id/merge/:targetId` | FEATURE_VOTING.APPROVE |

---

## 5. Support Centre

| Collection | Key Fields |
|---|---|
| `support_tickets` | `subject`, `body`, `category` (GENERAL/TECHNICAL/BILLING/ACADEMIC/CONTENT/OTHER), `priority` (LOW/MEDIUM/HIGH/URGENT), `status` (OPEN/IN_PROGRESS/WAITING_CUSTOMER/RESOLVED/CLOSED), `assignedTo`, `submittedBy`, `attachmentUrls[]` |
| `ticket_messages` | `ticketId`, `sentBy`, `body`, `isStaffReply`, `isInternal` |

**Auto-transitions:**
- Staff reply → ticket moves to `WAITING_CUSTOMER`
- Customer reply on `WAITING_CUSTOMER` → moves back to `IN_PROGRESS`

---

## 6. Super Admin Operational Dashboard

### Endpoint inventory

| Endpoint | Metrics |
|---|---|
| `GET /admin/dashboard/overview` | Users, tenants, infrastructure counters, DAU, fundraising progress |
| `GET /admin/dashboard/operational` | Queue health (jobs processed/failed, failure rate), AI daily requests, email sent, storage MB/GB, open tickets |
| `GET /admin/dashboard/growth` | Daily: new users, new students, new tenants, DAU, memorizations, reviews |
| `GET /admin/dashboard/analytics/users` | Daily new users + total user trend |
| `GET /admin/dashboard/analytics/dau` | Daily Active Users time series |
| `GET /admin/dashboard/analytics/wau` | Weekly Active Users (ISO week buckets, max/avg DAU per week) |
| `GET /admin/dashboard/analytics/mau` | Monthly Active Users (sum of DAU / peak DAU per month) |
| `GET /admin/dashboard/analytics/engagement` | DAU + memorizations + reviews + AI requests per day |
| `GET /admin/dashboard/analytics/retention` | Retention proxy (avgDAU / totalUsers) |
| `GET /admin/dashboard/analytics/growth` | Platform growth: users, students, tenants (total + delta per day) |
| `GET /admin/dashboard/analytics/platform-usage` | Storage, email, queue, AI usage per day |
| `GET /admin/dashboard/analytics/donations` | Donations per day + cumulative |
| `GET /admin/dashboard/alerts` | Active system alerts |
| `GET /admin/dashboard/health` | Infrastructure health checks |
| `POST /admin/dashboard/snapshot` | Manual snapshot capture |

### WAU computation

Daily DAU snapshots are bucketed into ISO weeks (Monday-anchored). The service returns `maxDau` (peak in the week) and `avgDau` (mean across sampled days) per week.

### MAU computation

Daily DAU snapshots are bucketed into calendar months (`YYYY-MM`). Returns `mauProxy` (sum of all daily DAU — a conservative unique-user estimate), `avgDau`, `peakDau`, and `activeDays` per month.

---

## 7. Analytics Layer

`AnalyticsService` computes all trend metrics from the `OperationalSnapshot` collection. Snapshots are populated by `SnapshotScheduler` at 00:05 UTC daily. No live aggregations are run at query time.

### Session tracking note

Raw session data is stored in the `sessions` collection (Auth module). DAU is counted by reading `dailyActiveUsers` from the daily snapshot, not live session aggregation. A future phase should add a session-count field to `OperationalSnapshot` for precise WAU/MAU unique-user counts.

---

## 8. Presentation Data API

Public, no-auth required. Powers the `/presentation` landing page.

| Endpoint | Data |
|---|---|
| `GET /presentation` | Full payload: vision, mission, features, roadmap, stats, fundraising (with milestones), testimonials |
| `GET /presentation/mission` | Mission + vision text |
| `GET /presentation/features` | Feature list |
| `GET /presentation/roadmap` | Phase roadmap with status |
| `GET /presentation/success-metrics` | Target KPIs |
| `GET /presentation/testimonials` | 4 curated testimonials (Arabic) |
| `GET /presentation/donation-milestones` | Milestone amounts with labels |

---

## 9. Snapshot Scheduler

`SnapshotScheduler` (`src/modules/admin/application/services/snapshot.scheduler.ts`) uses `@nestjs/schedule` (`@Cron`) to capture a daily snapshot at `05:00 UTC` (5-minute offset from midnight to avoid cluster-level contention).

The scheduler is idempotent — `DashboardService.captureSnapshot()` uses MongoDB upsert on the `date` key, so re-runs on the same day do not duplicate data.

**Registration:** `ScheduleModule.forRoot()` is imported inside `AdminModule` directly. No root-level `app.module.ts` change is required (NestJS allows module-scoped schedule registration).

---

## 10. RBAC Mapping

| Resource | Permission used |
|---|---|
| Admin dashboard | `ADMIN.READ`, `ADMIN.CREATE` |
| Donations (admin) | `ADMIN.READ`, `ADMIN.UPDATE` |
| Feedback (admin) | `FEEDBACK.READ`, `FEEDBACK.UPDATE` |
| Feature voting (admin) | `FEATURE_VOTING.APPROVE`, `FEATURE_VOTING.UPDATE` |
| Support tickets (admin) | `SUPPORT.READ`, `SUPPORT.UPDATE` |
| System alerts | `ADMIN.READ`, `ADMIN.UPDATE` |
| Tenant admin | `ADMIN.READ`, `ADMIN.UPDATE` |

Public routes (no auth): `/donations/public`, `/donations/fundraising-progress`, `/feedback`, `/feedback/public`, `/feature-requests`, `/presentation/**`.

---

## 11. Multi-tenancy

- Donations, feedback, and support tickets store `tenantId` for per-tenant queries.
- Feature requests and follows are platform-global — they accumulate votes/follows across tenants.
- Operational snapshots are platform-global (no tenantId).
- All admin routes are accessible only to `super_admin` (via RBAC permissions) regardless of tenant context.

---

## 12. New Collections Summary

| Collection | Phase | Purpose |
|---|---|---|
| `feature_follows` | 12E | Follow/subscribe to feature request updates |
