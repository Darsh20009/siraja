---
name: Siraja Phase 12E Platform Operations
description: Architecture decisions, module structure, and constraints for Phase 12E (Donations, Feedback, Feature Voting, Support, Dashboard, Presentation, Analytics, Audit)
---

# Siraja Phase 12E — Final Platform Operations & Launch Readiness

## All 12E subsystems live inside a single AdminModule
`src/modules/admin/` — one module chosen over per-subdomain modules because all subsystems share the same consumers (Super Admin, Tenant Admin) and cross-service dependencies (DashboardService calls DonationsService; PresentationService calls DonationsService).

**Why:** Avoids circular imports and keeps composition root lean.

## Snapshot-driven analytics — never live aggregation
`SnapshotScheduler` runs at CRON `5 0 * * *`, writes one `OperationalSnapshot` per day. All analytics reads (`AnalyticsService`) query snapshots only.

**How to apply:** Any new analytics metric must be added to the snapshot capture, not computed live in a controller.

## Donation milestones (DEFAULT_STAGES in DonationsService)
5,000 / 15,000 / 30,000 / 50,000 / 100,000 / 150,000 SAR.

## Presentation API is intentionally static
Mission, features, roadmap, testimonials are hardcoded. CMS integration is Phase 13+.

## Feedback state machine enforced in service layer
Invalid transitions throw `BadRequestException` in `FeedbackService.changeStatus()`, not Mongoose hooks.

## Audit is append-only
`AuditAdminService.record()` only creates. Not yet wired to every state-change path (known gap — hardening post-launch).

## Feature voting follow → notifications not yet wired
`FeatureFollow` stored; notification dispatch requires wiring to Phase 10 NotificationsModule.

## TypeScript status (2026-07-18)
Clean after fixing one null-assertion in feedback.service.spec.ts:77 (`result!.status`).

## Test coverage
75 tests / 8 spec files / 100% pass. No controller-level or E2E tests (project convention).
