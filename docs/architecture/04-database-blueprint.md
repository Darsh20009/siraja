# Database Blueprint (MongoDB Atlas) — Phase 2

## Status

**Phase 2 complete: full schema architecture.** All 33 collections are
implemented as Mongoose schemas under `backend/src/database/mongoose/schemas/`
(barrel export: `schemas/index.ts`; bulk model list: `models.ts`). This is
schema architecture only — **no services, controllers, repositories, or
APIs** exist yet. Business logic and data-access code are Phase 3+.

## Database

- **Engine**: MongoDB Atlas — the sole, official database for Siraja. No
  SQL/relational assumptions anywhere in this design.
- **Database name**: `siraja`
- **ODM**: Mongoose, via `@nestjs/mongoose`.
- **Model**: **shared database, tenant isolation by `tenantId`** — not
  database-per-tenant, not schema-per-tenant. One `siraja` database, one
  collection per entity type, every tenant's documents interleaved and
  distinguished by an indexed `tenantId` field.

## 1. Collection list (33)

| # | Collection | Scope | Purpose |
|---|---|---|---|
| 1 | `tenants` | Global | Root tenant registry; slug → tenant resolution |
| 2 | `tenant_settings` | Tenant | Per-tenant configurable preferences/feature flags |
| 3 | `users` | Tenant | Shared identity for every human actor |
| 4 | `roles` | Tenant | Named bundles of permission keys |
| 5 | `permissions` | Global | Fixed catalog of permission keys |
| 6 | `user_permissions` | Tenant | Per-user permission grant/revoke overrides |
| 7 | `students` | Tenant | Student role profile |
| 8 | `parents` | Tenant | Parent role profile |
| 9 | `sheikhs` | Tenant | Sheikh role profile |
| 10 | `supervisors` | Tenant | Supervisor role profile |
| 11 | `groups` | Tenant | Quran circle / classroom |
| 12 | `sessions` | Tenant | A held/scheduled meeting of a group |
| 13 | `attendance` | Tenant | Per-student attendance for a session |
| 14 | `memorization_records` | Tenant | New-memorization evaluation |
| 15 | `review_records` | Tenant | Revision ("murajaʿah") evaluation |
| 16 | `quran_mistakes` | Tenant | Fine-grained mistake log |
| 17 | `exams` | Tenant | Formal graded evaluation |
| 18 | `assignments` | Tenant | Homework/tasks |
| 19 | `notifications` | Tenant | Per-user notification delivery record |
| 20 | `push_subscriptions` | Tenant | Registered device push endpoints |
| 21 | `support_tickets` | Tenant | Support case |
| 22 | `support_messages` | Tenant | Message within a support ticket |
| 23 | `subscriptions` | Tenant | Tenant's active billing subscription |
| 24 | `plans` | Global | Subscription plan catalog |
| 25 | `payments` | Tenant | Payment attempts/charges |
| 26 | `transactions` | Tenant | Immutable billing ledger entries |
| 27 | `achievements` | Tenant | Badge awarded to a student |
| 28 | `badges` | Global | Badge definition catalog |
| 29 | `ai_requests` | Tenant | Queued/async AI job |
| 30 | `ai_reports` | Tenant | Durable AI job output |
| 31 | `audit_logs` | Global* | Security/compliance action trail |
| 32 | `activity_logs` | Global* | High-volume usage telemetry |
| 33 | `system_settings` | Global | Platform-wide, super-admin-managed config |

`*` `audit_logs` / `activity_logs` carry an **optional** `tenantId` — most
entries are tenant-scoped, but platform-level actions (e.g. a Super Admin
suspending a tenant) have none.

**Global** collections have no `tenantId` at all (`tenants`, `permissions`,
`plans`, `badges`, `system_settings`) — they are shared catalogs/roots, not
owned by any tenant.

## 2. Every schema, without exception

Every one of the 33 schemas includes:

- `createdAt`, `updatedAt` — via `@Schema({ timestamps: true })` on every
  class (Mongoose sets these automatically; never set manually).
- Soft delete — `isDeleted: boolean` (default `false`, indexed) +
  `deletedAt: Date | null`, inherited from `BaseSchema` (tenant-scoped) or
  `BaseGlobalSchema` (global). **Deletes are logical, never physical** —
  no code path performs a hard `deleteOne`/`remove` against these
  collections; the application layer (Phase 3+) sets `isDeleted: true` /
  `deletedAt: <now>` instead, and every read query filters
  `isDeleted: false`.
- Every tenant-related schema includes a required, indexed `tenantId`
  (`Types.ObjectId` ref to `Tenant`), inherited from `BaseSchema`
  (`backend/src/database/mongoose/schemas/base.schema.ts`).

Base classes:

```
BaseGlobalSchema        (base-global.schema.ts)
  isDeleted, deletedAt

BaseSchema extends nothing, mirrors BaseGlobalSchema  (base.schema.ts)
  tenantId (ObjectId -> Tenant, required, indexed)
  isDeleted, deletedAt
```

## 3. Index strategy

General rules applied throughout:

1. **Every tenant-scoped collection** carries at least a single-field
   index on `tenantId` (from `BaseSchema`), and **every compound index on
   a tenant-owned collection leads with `tenantId`** matching its real
   access pattern (e.g. `{ tenantId: 1, student: 1, evaluatedAt: -1 }` on
   `memorization_records`) — Mongo can only use one index per query
   efficiently, so `tenantId` alone is a floor, not the working index.
   This is enforced without exception across all 33 schemas (verified via
   code review) — no tenant-owned compound index omits `tenantId`.
2. **Uniqueness is always tenant-scoped**, never global, for tenant-owned
   data — e.g. `users` has `{ tenantId: 1, email: 1 }` unique+sparse, not
   a bare `{ email: 1 }` unique index, since the same email may
   legitimately belong to different people across tenants.
3. **1:1 relationships get a unique index** on the reference field, e.g.
   `Student.user`, `Sheikh.user`, `Parent.user`, `TenantSettings.tenant`.
   `Subscription.tenantId` uses a **partial unique index**
   (`{ tenantId: 1 }` unique where `isDeleted: false`) rather than a bare
   unique index — this enforces at most one *active* subscription per
   tenant while still allowing soft-deleted (superseded) subscriptions to
   coexist as history when a tenant changes plans.
4. **High-cardinality time-series-like collections** (`attendance`,
   `memorization_records`, `review_records`, `notifications`,
   `activity_logs`) index the natural "most recent first" query:
   `{ tenantId: 1, <owner>: 1, createdAt/evaluatedAt: -1 }`.
5. **Global catalogs** index their natural lookup key: `Tenant.slug`,
   `Permission.key`, `Plan.code`, `Badge.code`, `SystemSettings.key` — all
   unique.
6. **TTL index** on `activity_logs.createdAt` (`expireAfterSeconds`) —
   telemetry auto-expires; `audit_logs` has no TTL (compliance record,
   retained indefinitely).
7. Full list of indexes lives in each schema file, next to the model —
   see `backend/src/database/mongoose/schemas/*.schema.ts`; this document
   is the summary, the code is the source of truth.

## 4. Tenant isolation strategy

**Shared database, `tenantId`-per-document isolation** (not
database-per-tenant, not collection-per-tenant):

- Every tenant-owned document stores `tenantId: ObjectId` (ref `Tenant`),
  required and indexed via `BaseSchema`.
- **Every** query, update, and index against a tenant-owned collection
  must filter/lead on `tenantId` — enforced at the schema level today by
  making the field required + indexed; enforced at the application level
  in Phase 3+ by the repository pattern (Phase 1 established
  `IBaseRepository<T>` requiring `tenantId` on every method signature)
  and `TenantContext`/`TenantMiddleware` resolving the tenant from the URL
  path before any handler runs.
- **Global catalogs** (`tenants`, `permissions`, `plans`, `badges`,
  `system_settings`) intentionally have no `tenantId` — they are shared,
  platform-owned references that tenant data points *into*, never
  tenant-owned data itself.
- **Cross-tenant leakage is structurally hard**: a query missing
  `tenantId` on a tenant-scoped collection returns documents across every
  tenant — Phase 3+ must enforce `tenantId` injection at the repository
  base class, not leave it to individual handlers to remember.
- Users belong to exactly one tenant per account (`tenantId` on `users`);
  a person active in multiple tenants (e.g. a sheikh teaching at two
  academies) holds separate `User` documents, one per tenant — this keeps
  every downstream reference (`students.user`, `sheikhs.user`, ...)
  single-tenant and avoids cross-tenant data bleeding through a shared
  identity document.
- Sharding-ready: if/when a single shard outgrows capacity, MongoDB Atlas
  can shard tenant-scoped collections on a `tenantId`-prefixed shard key
  without any schema change, since `tenantId` already leads every
  compound index.

## 5. Relationships map

MongoDB is not relational — "relationships" below are ObjectId references
resolved via `populate()` at the application layer, not foreign keys.
Embedding is used only where the child data is small, bounded, and always
read with its parent (see "Embedded vs. referenced" below).

```
Tenant (global)
 ├─1:1─ TenantSettings
 ├─1:1─ Subscription ──*:1─ Plan (global)
 │        └─1:*─ Payment ──1:*─ Transaction
 ├─1:*─ Role ──(permissionKeys: string[])──> Permission (global, by key)
 ├─1:*─ User
 │        ├─1:1─ Student ──*:*── Parent   (Student.parents[] <-> Parent.students[])
 │        │        ├─1:*─ Attendance ──*:1─ Session ──*:1─ Group
 │        │        ├─1:*─ MemorizationRecord ──1:*─ QuranMistake
 │        │        ├─1:*─ ReviewRecord ──1:*─ QuranMistake
 │        │        ├─1:*─ Exam
 │        │        ├─1:*─ Assignment
 │        │        ├─1:*─ Achievement ──*:1─ Badge (global)
 │        │        └─1:*─ AiRequest ──1:1─ AiReport
 │        ├─1:1─ Sheikh ──*:*── Group (Sheikh.groups[] <-> Group.sheikh)
 │        ├─1:1─ Supervisor ──*:*── Group (supervisedGroups[])
 │        ├─1:*─ UserPermission ──(permissionKey)──> Permission (global, by key)
 │        ├─1:*─ Notification
 │        ├─1:*─ PushSubscription
 │        └─1:*─ SupportTicket ──1:*─ SupportMessage
 └─1:*─ Group ──1:*─ Session

AuditLog / ActivityLog / SystemSettings — platform observability, loosely
  linked (optional actor/tenantId refs), not part of the core domain graph.
```

### Embedded vs. referenced — and why

| Data | Choice | Reason |
|---|---|---|
| `LinkedAuthProvider` (Google/Apple id) inside `User` | Embedded | Small, fixed shape, always read with the user |
| `QuranRange` (surah/ayah bounds) inside `MemorizationRecord`/`ReviewRecord`/`Exam` | Embedded | Value object, no independent lifecycle |
| `Group.students[]` | Embedded (denormalized convenience array) | Fast "list students in group" read; **source of truth is still `Student.group`** — kept in sync at the application layer, not a replacement for the reference |
| `Attendance`, `QuranMistake`, `SupportMessage` | Referenced (own collection) | Unbounded growth per parent (many sessions/mistakes/messages) — embedding risks the 16MB document limit and makes independent querying/reporting impossible |
| `Student.parents[]` / `Parent.students[]` | Referenced, two-way | Both directions are independently queried (a student's guardians; a parent's children) — deriving one from the other would require a collection scan |

## 6. Scalability considerations (100,000+ users)

- **Indexing discipline** (§3) keeps every hot query — dashboards, per-student
  history, per-tenant listings — an index-served lookup, not a collection
  scan, as data grows into the tens of millions of documents (e.g.
  `attendance` and `memorization_records` are expected to be the largest
  collections by an order of magnitude — one row per student per session).
- **`tenantId`-leading compound indexes everywhere** double as the future
  Atlas **shard key prefix** — horizontal scaling by tenant is possible
  without touching the schema.
- **Soft delete instead of hard delete** avoids expensive cascading
  deletes across referenced collections and preserves audit/billing
  history; a background job (Phase 3+, not built here) can archive
  `isDeleted: true` documents older than a retention window to cold
  storage if the working set needs trimming.
- **Global catalogs are tiny and cacheable** (`permissions`, `plans`,
  `badges`, `tenants`) — a handful to a few thousand documents regardless
  of user count, ideal for in-memory/Redis caching at the application
  layer (e.g. tenant slug → id resolution on every request, per the
  multi-tenant blueprint) to avoid a database round trip per request.
- **Append-only ledgers** (`transactions`, `audit_logs`) never update
  existing documents, avoiding write-lock contention as volume grows —
  corrections are new offsetting documents.
- **`activity_logs` has a TTL index** (180-day default) so the highest-
  write-volume, lowest-value-per-document collection self-prunes instead
  of growing unbounded; `audit_logs` (low volume, high value) has no TTL.
- **MongoDB Atlas** provides the operational scaling levers this design
  assumes: read replicas for reporting/analytics queries, auto-scaling
  storage/compute, and (if a single shared cluster's working set ever
  exceeds one shard) sharding on a `tenantId`-prefixed key with zero
  schema changes required.
- **Connection pooling** via a single shared Mongoose connection
  (configured once in `AppModule`, see Phase 1) — no per-tenant
  connections, keeping connection count bounded regardless of tenant
  count.

## 7. Related documents

- Schema diagrams (ER, grouped by domain): [`08-schema-diagrams.md`](./08-schema-diagrams.md)
- Multi-tenant resolution flow (URL path → `tenantId`): [`05-multi-tenant-blueprint.md`](./05-multi-tenant-blueprint.md)
- Backend module layering these schemas plug into: [`02-backend-architecture.md`](./02-backend-architecture.md)
