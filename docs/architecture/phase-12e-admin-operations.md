# Phase 12E — Administration, Operations & Growth Platform

**Status:** Implemented  
**Module path:** `backend/src/modules/admin`  
**API prefix:** `api/v1` (all routes below are relative to this prefix)

---

## Overview

Phase 12E makes Siraja fully self-manageable without developer intervention. It adds ten operational subsystems — each a bounded context with its own controller, service, repository interface, Mongoose schema, and RBAC permissions — all wired into the platform's event bus, audit trail, and queue infrastructure.

---

## Module Structure

```
backend/src/modules/admin/
├── admin.module.ts
├── application/
│   ├── dto/                     # Input validation DTOs
│   └── services/                # 10 application services
├── domain/
│   └── repositories/            # 11 repository interfaces
└── infrastructure/
    ├── controllers/             # 9 HTTP controllers
    └── repositories/           # 11 Mongoose implementations
```

### Mongoose Collections (Phase 12E)

| Collection | Schema class | Purpose |
|---|---|---|
| `donation_campaigns` | `DonationCampaign` | Fundraising campaigns |
| `donations` | `Donation` | Individual donor contributions |
| `feedbacks` | `Feedback` | User feedback & bug reports |
| `feature_requests` | `FeatureRequest` | Community feature suggestions |
| `feature_votes` | `FeatureVote` | Per-user vote records |
| `support_tickets` | `SupportTicket` | Support tickets |
| `ticket_messages` | `TicketMessage` | Threaded ticket replies |
| `system_alerts` | `SystemAlert` | Infrastructure alerts |
| `tenant_brandings` | `TenantBranding` | Per-tenant branding config |
| `operational_snapshots` | `OperationalSnapshot` | Daily platform metrics |
| `audit_logs` | `AuditLog` | Immutable admin action log |

---

## Subsystems

### 1. Super Admin Dashboard (`/admin/dashboard`)

System-wide KPI overview, growth trends, and infrastructure health.

**Controller:** `DashboardController`  
**Services:** `DashboardService`, `AnalyticsService`, `SystemAlertsService`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/admin/dashboard/overview` | `ADMIN.READ` | Platform KPIs: user counts, tenant count, daily activity |
| GET | `/admin/dashboard/growth?days=30` | `ADMIN.READ` | Growth metrics over N days |
| POST | `/admin/dashboard/snapshot` | `ADMIN.CREATE` | Capture an operational snapshot now |
| GET | `/admin/dashboard/analytics/users?days=30` | `ADMIN.READ` | User growth trend |
| GET | `/admin/dashboard/analytics/engagement?days=30` | `ADMIN.READ` | Memorizations, reviews, AI requests per day |
| GET | `/admin/dashboard/analytics/retention?days=30` | `ADMIN.READ` | Retention proxy (DAU/total) |
| GET | `/admin/dashboard/analytics/platform-usage?days=30` | `ADMIN.READ` | Storage, email, queue metrics |
| GET | `/admin/dashboard/analytics/donations?days=30` | `ADMIN.READ` | Donation trend |
| GET | `/admin/dashboard/alerts` | `ADMIN.READ` | Active system alerts |
| GET | `/admin/dashboard/health` | `ADMIN.READ` | Live health check (Redis, queues, storage) |

`DashboardService.getPlatformOverview()` queries five MongoDB collections directly (User, Student, Sheikh, Parent, Supervisor) plus the latest `OperationalSnapshot` to produce a combined snapshot of total counts, daily active users, and infrastructure metrics.

`AnalyticsService` reads `OperationalSnapshot` time-series for all trend endpoints. Retention is a proxy: `avgDailyActiveUsers / totalUsers`.

---

### 2. Tenant Administration (`/admin/tenants`)

Per-tenant branding, feature flags, and limits management.

**Controller:** `TenantAdminController`  
**Service:** `TenantAdminService`, `AuditAdminService`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/admin/tenants/branding` | `ADMIN.READ` | Get current tenant's branding config |
| PATCH | `/admin/tenants/branding` | `ADMIN.UPDATE` | Upsert branding (writes audit log) |

`TenantBranding` stores: logo URL, primary/secondary/accent colours, supported languages, feature flags (enableAI, enableGamification, …), and limits (maxSheikhs, maxStudents, maxCircles, maxStorageMb).

Every branding update is recorded in the audit log via `AuditAdminService.record()` with `AuditAction.TENANT_CHANGE`.

---

### 3. Donations System (`/donations`)

Non-profit fundraising with multi-stage campaign tracking.

**Controller:** `DonationsController`  
**Service:** `DonationsService`

#### Public / User routes (no auth required)

| Method | Route | Description |
|---|---|---|
| GET | `/donations/public` | Active public campaigns |
| GET | `/donations/campaigns/:id/public` | Single campaign detail |
| GET | `/donations/fundraising-progress` | Current stage progress for primary campaign |
| POST | `/donations` | Submit a donation (auth optional — donor may be anonymous) |

#### Admin routes

| Method | Route | Permission |
|---|---|---|
| GET | `/donations/campaigns` | `DONATIONS.READ` |
| POST | `/donations/campaigns` | `DONATIONS.CREATE` |
| PATCH | `/donations/campaigns/:id` | `DONATIONS.UPDATE` |
| GET | `/donations` | `DONATIONS.READ` |
| GET | `/donations/:id` | `DONATIONS.READ` |
| POST | `/donations/:id/confirm` | `DONATIONS.APPROVE` |
| POST | `/donations/:id/reject` | `DONATIONS.APPROVE` |

**Fundraising stages** (platform-global defaults, overridable per campaign):

| Stage | Target (SAR) |
|---|---|
| 1 | 5,000 |
| 2 | 15,000 |
| 3 | 30,000 |
| 4 | 50,000 |
| 5 | 100,000 |
| 6 | 150,000 |

**Events emitted:** `donation.created`, `donation.confirmed`

---

### 4. Feedback System (`/feedback`)

Collects user feedback, bug reports, ratings, and suggestions — anonymous or named.

**Controller:** `FeedbackController`  
**Service:** `FeedbackService`

| Method | Route | Permission | Description |
|---|---|---|---|
| POST | `/feedback` | — (public) | Submit feedback |
| GET | `/feedback` | `FEEDBACK.READ` | List all with optional filters |
| GET | `/feedback/stats` | `FEEDBACK.READ` | Count by type + average rating |
| GET | `/feedback/:id` | `FEEDBACK.READ` | Single entry |
| PATCH | `/feedback/:id/resolve` | `FEEDBACK.UPDATE` | Mark resolved with admin note |
| PATCH | `/feedback/:id/close` | `FEEDBACK.UPDATE` | Close |

`FeedbackType`: `general`, `bug_report`, `improvement`, `complaint`, `praise`  
`FeedbackStatus`: `open`, `under_review`, `resolved`, `closed`

**Events emitted:** `feedback.submitted`

---

### 5. Feature Voting (`/feature-requests`)

Community-driven feature backlog with voting and admin review.

**Controller:** `FeatureVotingController`  
**Service:** `FeatureVotingService`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/feature-requests` | — | List all (filterable by status) |
| GET | `/feature-requests/top?limit=20` | — | Top voted |
| GET | `/feature-requests/:id` | — | Single entry |
| POST | `/feature-requests` | — (auth optional) | Suggest a feature |
| POST | `/feature-requests/:id/vote` | auth required | Cast a vote |
| DELETE | `/feature-requests/:id/vote` | auth required | Retract a vote |
| PATCH | `/feature-requests/:id/review` | `FEATURE_VOTING.APPROVE` | Change status (rejection requires reason) |
| PATCH | `/feature-requests/:id/priority` | `FEATURE_VOTING.UPDATE` | Set priority |

`FeatureRequestStatus`: `proposed` → `accepted` → `in_progress` → `completed` / `rejected`  
Vote deduplication enforced at service level via `FeatureVoteRepository.hasVoted()`.

**Events emitted:** `feature_request.created`, `feature_request.status_changed`

---

### 6. Support Center (`/support`)

Full ticketing system with assignment, threading, and resolution workflow.

**Controller:** `SupportController`  
**Service:** `SupportService`

#### User routes

| Method | Route | Description |
|---|---|---|
| POST | `/support/tickets` | Submit a ticket |
| GET | `/support/tickets/mine` | List own tickets |
| GET | `/support/tickets/:id` | View a ticket (own only) |
| GET | `/support/tickets/:id/messages` | Thread |
| POST | `/support/tickets/:id/messages` | Reply |

#### Admin routes

| Method | Route | Permission |
|---|---|---|
| GET | `/support/admin/tickets` | `SUPPORT_ADMIN.READ` |
| GET | `/support/admin/tickets/:id` | `SUPPORT_ADMIN.READ` |
| POST | `/support/admin/tickets/:id/messages` | `SUPPORT_ADMIN.CREATE` |
| PATCH | `/support/admin/tickets/:id/assign` | `SUPPORT_ADMIN.ASSIGN` |
| PATCH | `/support/admin/tickets/:id/resolve` | `SUPPORT_ADMIN.RESOLVE` |
| PATCH | `/support/admin/tickets/:id/close` | `SUPPORT_ADMIN.UPDATE` |
| GET | `/support/admin/stats` | `SUPPORT_ADMIN.READ` |

`TicketStatus`: `open` → `in_progress` → `waiting_customer` → `resolved` → `closed`  
`TicketPriority`: `low`, `medium`, `high`, `urgent`  
`TicketCategory`: `technical`, `billing`, `academic`, `general`, `account`, `content`, `feature_request`, `other`

**Automatic status transitions:**
- Staff reply → ticket moves to `waiting_customer`
- Customer reply on a `waiting_customer` ticket → moves back to `in_progress`

**Events emitted:** `ticket.created`, `ticket.resolved`

---

### 7. Operational Analytics (`/admin/dashboard/analytics/*`)

All analytics are derived from `OperationalSnapshot` time-series. See Dashboard section for routes.

Metrics tracked per daily snapshot:
- `totalUsers`, `totalStudents`, `totalSheikhs`, `totalParents`, `totalSupervisors`, `totalTenants`
- `dailyActiveUsers`, `newUsersToday`
- `dailyMemorizationRecords`, `dailyReviewRecords`, `dailyAiRequests`
- `storageUsedMb`, `emailsSentToday`
- `queueJobsProcessed`, `queueJobsFailed`
- `totalDonationsToday`, `totalDonationAmountToday`, `cumulativeDonationAmount`

---

### 8. System Alerts (`/admin/alerts`)

Automatic infrastructure health monitoring with severity-based alerting.

**Controller:** `SystemAlertsController`  
**Service:** `SystemAlertsService`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/admin/alerts` | `ADMIN.READ` | List (filterable by status/type/severity) |
| GET | `/admin/alerts/active` | `ADMIN.READ` | Active alerts only |
| GET | `/admin/alerts/:id` | `ADMIN.READ` | Single alert |
| PATCH | `/admin/alerts/:id/acknowledge` | `ADMIN.UPDATE` | Acknowledge |
| PATCH | `/admin/alerts/:id/resolve` | `ADMIN.RESOLVE` | Resolve with note |

`AlertType`: `queue_failure`, `redis_failure`, `storage_failure`, `email_failure`, `ai_failure`, `database_failure`, `high_error_rate`, `memory_pressure`  
`AlertSeverity`: `info`, `warning`, `error`, `critical`  
`AlertStatus`: `active` → `acknowledged` → `resolved`

`SystemAlertsService.fire()` is called programmatically by infrastructure health monitors and also by `runHealthChecks()`. Exported from `AdminModule` for use by other modules.

**Events emitted:** `system_alert.fired`

---

### 9. Presentation Platform (`/presentation`)

Public-facing API serving the Siraja landing/pitch page. **No authentication required.**

**Controller:** `PresentationController`  
**Service:** `PresentationService`

| Method | Route | Description |
|---|---|---|
| GET | `/presentation` | Full presentation payload (stats + fundraising + platform data) |
| GET | `/presentation/mission` | Mission & vision text |
| GET | `/presentation/features` | Feature catalogue |
| GET | `/presentation/roadmap` | Phase roadmap |
| GET | `/presentation/success-metrics` | KPI targets |

`PresentationService.getPresentationData()` joins live stats from the latest `OperationalSnapshot` with live fundraising progress from the active `DonationCampaign`.

---

### 10. Audit System (`/admin/audit`)

Immutable, append-only log of all admin and tenant-level actions.

**Controller:** `AuditController`  
**Service:** `AuditAdminService`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/admin/audit` | `AUDIT.READ` | Paginated log query |
| GET | `/admin/audit/count` | `AUDIT.READ` | Aggregate count |

Query parameters: `actorId`, `tenantId`, `action`, `entityType`, `from`, `to`, `limit`, `page`

`AuditAction` values: tenant changes, permission changes, system changes, admin actions.  
`AuditEntityType` values: user, tenant, permission, system, etc.

`AuditAdminService.record()` is exported from `AdminModule` and called by any controller that performs a state-changing admin operation (e.g., branding update in `TenantAdminController`).

---

## RBAC Permission Groups

All admin routes are protected by the `@RequirePermissions()` decorator, enforced by the global `AuthzGuard`. The permission groups used in Phase 12E:

| Group | Keys |
|---|---|
| `ADMIN` | `READ`, `CREATE`, `UPDATE`, `RESOLVE` |
| `DONATIONS` | `READ`, `CREATE`, `UPDATE`, `APPROVE` |
| `FEEDBACK` | `READ`, `UPDATE` |
| `FEATURE_VOTING` | `APPROVE`, `UPDATE` |
| `SUPPORT_ADMIN` | `READ`, `CREATE`, `UPDATE`, `ASSIGN`, `RESOLVE` |
| `AUDIT` | `READ` |

Public routes (no `@RequirePermissions`): all `/presentation/*`, `GET /donations/public`, `GET /donations/campaigns/:id/public`, `GET /donations/fundraising-progress`, `POST /donations`, `GET /feature-requests*`, `POST /feedback`.

---

## Event Bus Integration

All write operations emit domain events via `EventEmitter2`. Phase 12E events:

| Event key | Emitted by | Payload |
|---|---|---|
| `donation.created` | `DonationsService.submitDonation` | `{ donationId, campaignId, amount }` |
| `donation.confirmed` | `DonationsService.confirmDonation` | `{ donationId, amount }` |
| `feedback.submitted` | `FeedbackService.submit` | `{ feedbackId, type }` |
| `feature_request.created` | `FeatureVotingService.suggest` | `{ featureRequestId }` |
| `feature_request.status_changed` | `FeatureVotingService.changeStatus` | `{ featureRequestId, status }` |
| `ticket.created` | `SupportService.createTicket` | `{ ticketId, submittedBy }` |
| `ticket.resolved` | `SupportService.resolveTicket` | `{ ticketId, resolvedBy }` |
| `system_alert.fired` | `SystemAlertsService.fire` | `{ alertId, type, severity, message }` |
| `audit_log.created` | `AuditLogAdminRepository` | `{ logId, action, entityType }` |

---

## Multi-Tenancy

- `SupportTicket` extends `BaseSchema` (carries `tenantId: ObjectId`)
- `TenantBranding` is scoped exclusively to a tenant
- Analytics and audit endpoints accept `tenantId` as an optional query filter
- Presentation and donation routes are platform-global (not tenant-scoped)
- `DashboardService` aggregates counts platform-wide (super-admin only)

---

## Queue Readiness

`SystemAlertsService` and `DonationsService` are designed for queue-backed processing. When `REDIS_URL` is set, `QueuesModule` registers BullMQ workers; without it the platform starts in no-op mode. Alert emails route through the shared `EmailService` via the queue infrastructure.

---

## Swagger Documentation

All routes are visible in the auto-generated Swagger UI at `/docs` in `development` mode.
