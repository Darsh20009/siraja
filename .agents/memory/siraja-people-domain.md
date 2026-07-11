---
name: Siraja people domain architecture
description: Phase 6 durable decisions — module boundary rules, ownership enforcement pattern, soft-delete vs deactivation distinction, and enrollment audit type rules.
---

# Siraja People Domain Architecture (Phase 6)

## Single-model repository rule

Repositories inject only their own Mongoose model. When a use-case needs cross-domain context to build a query (e.g. a sheikh's groupIds to scope student results), the use-case resolves that data first and passes it as a parameter — never inject a foreign model into a repository.

**Why:** Foreign model injection breaks domain boundaries and creates hidden coupling. Making the caller pass resolved IDs keeps the dependency explicit at the use-case layer.

## Soft-delete vs deactivation — not the same

`isDeleted: true` (soft-delete) makes a record invisible to all `findById` / `findAll` queries (which filter `isDeleted: false`). `isActive: false` keeps the record visible but marks it operationally inactive.

**Why:** Using `isActive = false` as the DELETE implementation causes stale records to persist in all normal query results, because those queries do not filter on `isActive`.

**How to apply:** Every module's `DELETE /:id` endpoint must call the repository's `remove()` method (sets `isDeleted + deletedAt`). Keep `isActive` for operational status changes via `PATCH`.

## Bidirectional relationship sync

Sheikh/supervisor↔circle assignments are owned by CirclesModule. Student↔circle/sheikh/parent assignments are owned by StudentAssignmentsModule. Each operation syncs both sides atomically with `Promise.all`.

## RBAC ownership enforcement pattern

Role-scoped filtering lives in use-cases, not guards. Use-cases receive `AccessTokenPayload`, resolve the caller's role-specific profile if needed, and apply the correct filter or throw `ForbiddenException`. TENANT_ADMIN / SUPERVISOR always get tenant-wide access.

## EnrollmentType enum

`SHEIKH_REMOVAL` was added alongside existing types. Sheikh unassignment must record `SHEIKH_REMOVAL`, not reuse `SHEIKH_ASSIGNMENT` with a null sheikh, so history consumers can distinguish creation from removal without inspecting payload fields.
