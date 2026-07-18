# Phase 12E — Final Platform Operations & Launch Readiness

**Status:** Complete  
**Module root:** `backend/src/modules/admin/`  
**Phase sequence:** Follows 12A (Platform Foundation), 12B (Learning Intelligence), 12C (Infrastructure), 12D (Gamification)

---

## 1. Overview

Phase 12E closes the backend before frontend development begins. It delivers eight subsystems inside a single `AdminModule` hub — chosen to avoid proliferating top-level modules for what are tightly coupled platform-governance concerns.

| Subsystem | Controller | Service(s) | Schemas |
|---|---|---|---|
| Donation System | `donations.controller.ts` | `donations.service.ts` | `Donation`, `DonationCampaign` |
| Feedback System | `feedback.controller.ts` | `feedback.service.ts` | `Feedback` |
| Feature Voting | `feature-voting.controller.ts` | `feature-voting.service.ts` | `FeatureRequest`, `FeatureVote`, `FeatureFollow` |
| Support Center | `support.controller.ts` | `support.service.ts` | `SupportTicket`, `TicketMessage` |
| Admin Dashboard | `dashboard.controller.ts` | `dashboard.service.ts`, `snapshot.scheduler.ts` | `OperationalSnapshot`, `SystemAlert` |
| Analytics Layer | `dashboard.controller.ts` (analytics routes) | `analytics.service.ts` | `OperationalSnapshot` |
| Presentation API | `presentation.controller.ts` | `presentation.service.ts` | _(read-only, no owned schema)_ |
| Audit | `audit.controller.ts` | `audit-admin.service.ts` | `AuditLog` |

Supporting services: `system-alerts.service.ts`, `tenant-admin.service.ts`  
Supporting schemas: `TenantBranding`

---

## 2. Module Graph

```
AdminModule
├── MongooseModule.forFeature([
│   Donation, DonationCampaign,
│   Feedback,
│   FeatureRequest, FeatureVote, FeatureFollow,
│   SupportTicket, TicketMessage,
│   SystemAlert, OperationalSnapshot,
│   AuditLog, TenantBranding
│ ])
├── Imports: UsersModule, TenantsModule, StudentsModule,
│            QueuesModule, StorageModule (global)
├── Controllers: DonationsController, FeedbackController,
│               FeatureVotingController, SupportController,
│               DashboardController, PresentationController,
│               AuditController, SystemAlertsController,
│               TenantAdminController
└── Services: DonationsService, FeedbackService,
              FeatureVotingService, SupportService,
              DashboardService, AnalyticsService,
              PresentationService, AuditAdminService,
              SystemAlertsService, TenantAdminService,
              SnapshotScheduler
```

---

## 3. Donation System

### Purpose
Platform-level fundraising. Supports campaigns with staged funding targets and individual donation submissions from the public.

### Funding Milestones
Hardcoded in `DonationsService.DEFAULT_STAGES`:

| Stage | Target (SAR) |
|---|---|
| Seed Round | 5,000 |
| Early Supporters | 15,000 |
| Infrastructure | 30,000 |
| Growth | 50,000 |
| Scale | 100,000 |
| Launch | 150,000 |

### Schemas

**`Donation`**
```
amount           Number    required
currency         String    default 'SAR'
donorName        String?   (hidden when isAnonymous)
donorEmail       String?
userId           ObjectId? (link to User if authenticated)
campaignId       ObjectId  ref DonationCampaign
status           DonationStatus (PENDING|CONFIRMED|REJECTED)
method           DonationMethod (BANK_TRANSFER|CARD|CASH|OTHER)
isAnonymous      Boolean   default false
notes            String?
confirmedAt      Date?
rejectedAt       Date?
rejectionReason  String?
```

**`DonationCampaign`**
```
name             String    required
description      String?
targetAmount     Number    required
raisedAmount     Number    default 0
status           CampaignStatus (ACTIVE|PAUSED|COMPLETED|ARCHIVED)
stages           FundraisingStage[]
isPublic         Boolean   default true
startDate        Date?
endDate          Date?
```

### API Surface

| Method | Path | Auth | Permission |
|---|---|---|---|
| GET | `/donations/public` | None | Public |
| GET | `/donations/campaigns/:id/public` | None | Public |
| GET | `/donations/fundraising-progress` | None | Public |
| POST | `/donations` | Optional JWT | Open |
| GET | `/donations/campaigns` | JWT | `DONATIONS.READ` |
| POST | `/donations/campaigns` | JWT | `DONATIONS.CREATE` |
| PATCH | `/donations/campaigns/:id` | JWT | `DONATIONS.UPDATE` |
| GET | `/donations` | JWT | `DONATIONS.READ` |
| GET | `/donations/:id` | JWT | `DONATIONS.READ` |
| POST | `/donations/:id/confirm` | JWT | `DONATIONS.APPROVE` |
| POST | `/donations/:id/reject` | JWT | `DONATIONS.UPDATE` |

### Events Emitted
- `donation.created` — on successful submission
- `donation.confirmed` — on admin confirmation

---

## 4. Feedback System

### Purpose
Anonymous-safe channel for users to submit bug reports, improvement suggestions, and general feedback. Includes a community-visible wall.

### Status State Machine
```
PENDING → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED
                        ↘ REJECTED
                        ↘ CLOSED (terminal, from any state via admin)
```
Terminal states (`COMPLETED`, `REJECTED`, `CLOSED`) block all further transitions.

### Schema: `Feedback`
```
type         FeedbackType (GENERAL|BUG_REPORT|FEATURE_SUGGESTION|IMPROVEMENT|OTHER)
title        String    required
body         String    required
rating       Number?   (1–5 stars)
status       FeedbackStatus  default PENDING
userId       ObjectId? (null when anonymous)
isAnonymous  Boolean   default false
isPublic     Boolean   default false
resolvedAt   Date?
resolvedBy   ObjectId?
adminNote    String?
```

### API Surface

| Method | Path | Auth | Permission |
|---|---|---|---|
| POST | `/feedback` | Optional JWT | Open |
| GET | `/feedback/public` | None | Public wall (isPublic=true) |
| GET | `/feedback` | JWT | `FEEDBACK.READ` |
| GET | `/feedback/stats` | JWT | `FEEDBACK.READ` |
| GET | `/feedback/:id` | JWT | `FEEDBACK.READ` |
| PATCH | `/feedback/:id/status` | JWT | `FEEDBACK.UPDATE` |
| PATCH | `/feedback/:id/visibility` | JWT | `FEEDBACK.UPDATE` |
| PATCH | `/feedback/:id/resolve` | JWT | `FEEDBACK.UPDATE` |
| PATCH | `/feedback/:id/close` | JWT | `FEEDBACK.UPDATE` |

---

## 5. Feature Voting System

### Purpose
Community-driven product prioritisation. Users suggest features, vote on them, and follow to receive status updates. Admins review, approve, reject, and merge duplicates.

### Schema: `FeatureRequest`
```
title          String    required
description    String    required
submittedBy    ObjectId? (userId)
status         FeatureRequestStatus (PROPOSED|UNDER_REVIEW|APPROVED|REJECTED|IN_PROGRESS|COMPLETED)
priority       FeatureRequestPriority (LOW|MEDIUM|HIGH|CRITICAL)
voteCount      Number    default 0
followerCount  Number    default 0
rejectionNote  String?
mergedInto     ObjectId? (target FeatureRequest when merged)
```

Votes and follows are stored in separate lean collections (`FeatureVote`, `FeatureFollow`) to support atomic increment/decrement.

### Merge Logic
`mergeFeatures(sourceId, targetId)`:
1. Transfers all votes from source to target (increments `voteCount` on target).
2. Transfers all follows from source to target.
3. Sets `source.mergedInto = targetId`, marks source `REJECTED`.

### API Surface

| Method | Path | Auth | Permission |
|---|---|---|---|
| GET | `/feature-requests` | None | Public |
| GET | `/feature-requests/top` | None | Public (sorted by voteCount) |
| GET | `/feature-requests/:id` | None | Public |
| POST | `/feature-requests` | JWT | Authenticated |
| POST | `/feature-requests/:id/vote` | JWT | Authenticated |
| DELETE | `/feature-requests/:id/vote` | JWT | Authenticated |
| POST | `/feature-requests/:id/follow` | JWT | Authenticated |
| DELETE | `/feature-requests/:id/follow` | JWT | Authenticated |
| GET | `/feature-requests/:id/follow-status` | JWT | Authenticated |
| PATCH | `/feature-requests/:id/review` | JWT | `FEATURE_VOTING.APPROVE` |
| PATCH | `/feature-requests/:id/priority` | JWT | `FEATURE_VOTING.UPDATE` |
| POST | `/feature-requests/:id/merge/:targetId` | JWT | `FEATURE_VOTING.UPDATE` |

---

## 6. Support Center

### Purpose
Two-sided ticketing system: users raise issues, support staff respond, assign, resolve, and close tickets. Supports internal staff-only notes.

### Ticket Categories
`account` | `content` | `feature_request` | `billing` | `technical` | `other`

### Ticket Priorities
`LOW` | `MEDIUM` | `HIGH` | `URGENT`

### Schema: `SupportTicket`
```
subject      String    required
body         String    required
category     TicketCategory
priority     TicketPriority  default LOW
status       TicketStatus (OPEN|WAITING_CUSTOMER|WAITING_STAFF|RESOLVED|CLOSED)
submittedBy  ObjectId  required
assignedTo   ObjectId? (staff userId)
resolvedAt   Date?
resolvedBy   ObjectId?
closedAt     Date?
resolutionNote String?
```

### Schema: `TicketMessage`
```
ticketId     ObjectId  required
senderId     ObjectId  required
body         String    required
isInternal   Boolean   default false  (staff-only notes)
```

Status auto-transitions:
- Staff reply → `WAITING_CUSTOMER`
- Customer reply → `WAITING_STAFF`

### API Surface

| Method | Path | Auth | Permission |
|---|---|---|---|
| POST | `/support/tickets` | JWT | Authenticated |
| GET | `/support/tickets/mine` | JWT | Authenticated |
| GET | `/support/tickets/:id` | JWT | Own ticket only |
| GET | `/support/tickets/:id/messages` | JWT | Own ticket only |
| POST | `/support/tickets/:id/messages` | JWT | Authenticated |
| GET | `/support/admin/tickets` | JWT | `SUPPORT_ADMIN.READ` |
| GET | `/support/admin/tickets/:id` | JWT | `SUPPORT_ADMIN.READ` |
| POST | `/support/admin/tickets/:id/messages` | JWT | `SUPPORT_ADMIN.CREATE` |
| PATCH | `/support/admin/tickets/:id/assign` | JWT | `SUPPORT_ADMIN.ASSIGN` |
| PATCH | `/support/admin/tickets/:id/resolve` | JWT | `SUPPORT_ADMIN.RESOLVE` |
| PATCH | `/support/admin/tickets/:id/close` | JWT | `SUPPORT_ADMIN.UPDATE` |
| GET | `/support/admin/stats` | JWT | `SUPPORT_ADMIN.READ` |

---

## 7. Super Admin Operational Dashboard

### Purpose
Single-screen command centre for the Super Admin: platform-wide KPIs, growth trends, infrastructure health, and system alerts.

### Architecture: Snapshot-Driven Analytics

Live aggregation over millions of documents is too expensive for a dashboard. Instead:

1. **`SnapshotScheduler`** runs daily at `00:05` (CRON `5 0 * * *`).
2. It calls `DashboardService.captureSnapshot()`, which counts users, tenants, students, active sessions, donations, queue depths, and storage usage.
3. The result is persisted as an `OperationalSnapshot` document.
4. `DashboardService` and `AnalyticsService` query snapshots for all dashboard and analytics reads — zero live aggregation on hot paths.

### Schema: `OperationalSnapshot`
```
date                   Date      required (snapshot day)
totalUsers             Number
newUsers               Number
activeUsers            Number    (DAU proxy: logged in within 24h)
totalTenants           Number
newTenants             Number
totalStudents          Number
newStudents            Number
donationsToday         Number
donationsTotalRaised   Number
queueDepth             Number
storageUsedBytes       Number
aiRequestsToday        Number
emailsSentToday        Number
memorisationSessions   Number
```

### Dashboard Endpoints

| Method | Path | Metric |
|---|---|---|
| GET | `/admin/dashboard/overview` | KPI snapshot: users, tenants, students, fundraising |
| GET | `/admin/dashboard/growth` | WoW / MoM growth deltas |
| GET | `/admin/dashboard/operational` | Queue depth, storage, AI/email usage |
| POST | `/admin/dashboard/snapshot` | Force-capture snapshot on demand |
| GET | `/admin/dashboard/analytics/users` | Total users time-series |
| GET | `/admin/dashboard/analytics/dau` | Daily Active Users series |
| GET | `/admin/dashboard/analytics/wau` | Weekly Active Users (7-day rolling) |
| GET | `/admin/dashboard/analytics/mau` | Monthly Active Users (30-day rolling) |
| GET | `/admin/dashboard/analytics/engagement` | Engagement trends |
| GET | `/admin/dashboard/analytics/retention` | Retention proxy (DAU / Total) |
| GET | `/admin/dashboard/analytics/growth` | Tenant + student growth trend |
| GET | `/admin/dashboard/analytics/platform-usage` | Storage / queue / infra usage |
| GET | `/admin/dashboard/analytics/donations` | Fundraising trend over time |
| GET | `/admin/dashboard/alerts` | Active system alerts |
| GET | `/admin/dashboard/health` | Current platform health summary |

All dashboard endpoints require `ADMIN.READ`.

### System Alerts

`SystemAlertsService.fire(type, severity, message)` creates a `SystemAlert` document. It is called by infrastructure monitors (health checks, queue saturation, error rates).

**`SystemAlert` Schema:**
```
type       AlertType (DB_DOWN|QUEUE_SATURATED|HIGH_ERROR_RATE|STORAGE_FULL|…)
severity   AlertSeverity (INFO|WARNING|ERROR|CRITICAL)
status     AlertStatus (ACTIVE|ACKNOWLEDGED|RESOLVED)
message    String
metadata   Object?
triggeredAt   Date
acknowledgedBy  ObjectId?
resolvedBy      ObjectId?
```

---

## 8. Presentation Data API

### Purpose
Public, unauthenticated endpoints that power the platform's marketing / landing page. No write operations; no auth required on any route.

### Data Sources
`PresentationService` combines:
- **Static content** — hardcoded mission, vision, feature list, roadmap, testimonials (suitable for initial launch; replace with CMS in Phase 13+).
- **Dynamic content** — live fundraising progress fetched from `DonationsService`.

### Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/presentation` | Full combined payload |
| GET | `/presentation/mission` | Mission + vision statement |
| GET | `/presentation/features` | Feature catalogue |
| GET | `/presentation/roadmap` | Phase roadmap |
| GET | `/presentation/success-metrics` | Platform KPIs |
| GET | `/presentation/testimonials` | Curated testimonials |
| GET | `/presentation/donation-milestones` | Milestones + current progress |

### Donation Milestones Payload
```json
{
  "currentRaised": 5000,
  "milestones": [
    { "label": "Early Supporters", "target": 15000, "reached": false },
    { "label": "Infrastructure",   "target": 30000, "reached": false },
    { "label": "Growth",           "target": 50000, "reached": false },
    { "label": "Scale",            "target": 100000, "reached": false },
    { "label": "Launch",           "target": 150000, "reached": false }
  ]
}
```

---

## 9. Analytics Layer

### Design
Analytics are derived entirely from `OperationalSnapshot` documents, never from live collection scans. `AnalyticsService` accepts a `days` query parameter (default 30) and fetches the relevant snapshot window.

### Metrics Computed

| Metric | Computation |
|---|---|
| DAU | `snapshot.activeUsers` (same-day logins) |
| WAU | 7-day rolling sum of `activeUsers` |
| MAU | 30-day rolling sum of `activeUsers` |
| Retention proxy | `activeUsers / totalUsers` per day |
| User growth | Day-over-day delta of `totalUsers` |
| Tenant growth | Day-over-day delta of `totalTenants` |
| Student growth | Day-over-day delta of `totalStudents` |
| Donation trend | Daily `donationsToday` and `donationsTotalRaised` series |
| Platform usage | `storageUsedBytes`, `queueDepth`, `aiRequestsToday` |

---

## 10. Audit

### Purpose
Immutable, append-only trail of all significant administrative actions: donations confirmed/rejected, tickets resolved, feedback status changes, feature merges, system alert acknowledgements, and direct admin mutations.

### Schema: `AuditLog`
```
actorId      ObjectId  required (user who performed the action)
actorRoles   Role[]    (captured at action time, not resolved later)
tenantId     ObjectId? (null for platform-level actions)
action       String    required (e.g. 'donation.confirmed', 'ticket.resolved')
entityType   String    required (e.g. 'Donation', 'SupportTicket')
entityId     ObjectId  required
before       Object?   (field-level snapshot before change)
after        Object?   (field-level snapshot after change)
ip           String?
userAgent    String?
createdAt    Date      (auto, immutable)
```

No update or delete operations exist on `AuditLog`. Reads are SUPER_ADMIN-scoped.

### API Surface

| Method | Path | Permission |
|---|---|---|
| GET | `/admin/audit` | `AUDIT.READ` |
| GET | `/admin/audit/count` | `AUDIT.READ` |

Query filters: `actorId`, `tenantId`, `entityType`, `action`, `from`, `to`.

---

## 11. RBAC Mapping

| Permission Category | Actions | Assigned Roles |
|---|---|---|
| `DONATIONS` | READ, CREATE, UPDATE, DELETE, APPROVE, EXPORT | SUPER_ADMIN, TENANT_ADMIN |
| `FEEDBACK` | READ, CREATE, UPDATE, DELETE | SUPER_ADMIN, TENANT_ADMIN |
| `FEATURE_VOTING` | READ, CREATE, UPDATE, DELETE, APPROVE | SUPER_ADMIN, TENANT_ADMIN |
| `SUPPORT_ADMIN` | READ, CREATE, UPDATE, DELETE, ASSIGN, RESOLVE | SUPER_ADMIN, TENANT_ADMIN |
| `ADMIN` | READ, CREATE, UPDATE, RESOLVE | SUPER_ADMIN |
| `AUDIT` | READ, EXPORT | SUPER_ADMIN |

Super Admin bypasses all permission checks (JWT-asserted roles array, not a tenant-scoped DB lookup — see Phase 3 RBAC architecture).

---

## 12. Multi-Tenancy

Phase 12E spans two tenancy contexts:

- **Platform-level** (`tenantId = null` or platform sentinel): Donations, AuditLog, SystemAlerts, OperationalSnapshot. These are global to the platform, owned by Super Admin.
- **Tenant-scoped**: SupportTickets, Feedback, FeatureRequests inherit the submitting user's `tenantId` where applicable, allowing Tenant Admins to manage their own tenant's submissions.

The `X-Tenant-Slug` header is resolved by `TenantMiddleware` on all requests; for global resources the service ignores it (no `tenantId` filter applied).

---

## 13. Schema Catalogue

All Phase 12E schemas live in `backend/src/database/mongoose/schemas/`:

| File | Collection | Extends |
|---|---|---|
| `donation.schema.ts` | `donations` | `BaseGlobalSchema` |
| `donation-campaign.schema.ts` | `donation_campaigns` | `BaseGlobalSchema` |
| `feedback.schema.ts` | `feedbacks` | `BaseGlobalSchema` |
| `feature-request.schema.ts` | `feature_requests` | `BaseGlobalSchema` |
| `support-ticket.schema.ts` | `support_tickets` | `BaseGlobalSchema` |
| `ticket-message.schema.ts` | `ticket_messages` | `BaseGlobalSchema` |
| `system-alert.schema.ts` | `system_alerts` | `BaseGlobalSchema` |
| `operational-snapshot.schema.ts` | `operational_snapshots` | `BaseGlobalSchema` |
| `audit-log.schema.ts` | `audit_logs` | `BaseGlobalSchema` |
| `tenant-branding.schema.ts` | `tenant_brandings` | `BaseGlobalSchema` |

---

## 14. Key Design Decisions

### Snapshot-driven analytics (not live aggregation)
All analytics reads query pre-materialised `OperationalSnapshot` documents. The snapshot scheduler (`5 0 * * *`) writes one document per day. This keeps dashboard P99 latency under 50ms regardless of platform scale. Trade-off: analytics are 24h stale. Acceptable for an operational dashboard; real-time alerting uses `SystemAlert` documents instead.

### All Phase 12E in a single AdminModule
Alternatives considered: one module per subdomain (DonationModule, FeedbackModule, etc.). Rejected because all subsystems share the same consumers (Super Admin, Tenant Admin), the same RBAC categories, and cross-service dependencies (DashboardService calls DonationsService; PresentationService calls DonationsService). A single module avoids circular imports and keeps the composition root lean.

### Presentation API is static + dynamic
Mission, features, roadmap, and testimonials are hardcoded in `PresentationService`. This is intentional for Phase 12E (launch content does not change frequently). A CMS integration (Contentful, Sanity) is the natural Phase 13+ follow-up.

### Audit is append-only
`AuditAdminService.record()` only creates documents — no `update()` or `delete()` on `AuditLog`. This is enforced at the service layer, not by MongoDB permissions, which is sufficient for Phase 12E but should be hardened with a dedicated read-only replica user in production.

### Feedback status machine enforced in service, not schema
Invalid transitions (e.g. `PENDING → COMPLETED`) throw `BadRequestException` in `FeedbackService.changeStatus()`, not in a Mongoose validator. This keeps the state-machine logic testable and readable without schema-level hooks.
