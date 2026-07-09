# Database Blueprint (MongoDB Atlas)

## Strategy: shared database, tenant-scoped collections

For hundreds of thousands of users across many tenants, Siraja uses a
**single shared MongoDB Atlas cluster/database** with every tenant-owned
document carrying a required, indexed `tenantId` field — not a
database-per-tenant model. This keeps operational overhead low while
scaling horizontally (Atlas sharding on `tenantId`-prefixed shard keys
if/when needed).

Every tenant-scoped schema extends `database/mongoose/schemas/base.schema.ts`,
which contributes:

- `tenantId: string` (required, indexed)
- `isDeleted: boolean` (soft delete)
- `createdAt` / `updatedAt` (via `{ timestamps: true }`)

## Planned collections (structure only — schemas not yet implemented)

| Collection       | Owning module   | Notes                                             |
|------------------|-----------------|----------------------------------------------------|
| `tenants`        | tenants         | slug (unique, indexed), name, plan, status          |
| `users`          | users           | shared identity; role, auth providers, tenant links |
| `academies`      | academies       | tenantId + academy profile                          |
| `circles`        | circles         | tenantId, academyId (optional), sheikh assignment    |
| `sheikhs`        | sheikhs         | profile, qualifications, assigned circles            |
| `students`       | students        | profile, enrollment, guardian links                  |
| `parents`        | parents         | profile, linked student ids                           |
| `memorization_plans` | memorization | plan definition per student                         |
| `memorization_records` | memorization | progress/evaluation entries, time-series-ish        |
| `notifications`  | notifications   | delivery log, read state                              |
| `subscriptions`  | subscriptions   | tenant billing plan, status, renewal                  |
| `refresh_tokens` | auth            | hashed refresh tokens, device metadata, revocation    |

## Indexing rules

- Every collection: compound index `{ tenantId: 1, _id: 1 }` at minimum.
- `users`: unique index on `{ email: 1 }` and sparse unique on `{ phone: 1 }`
  scoped globally (a person's login identity is cross-tenant); a separate
  `{ tenantId: 1, userId: 1 }` membership record maps a user into a tenant
  with a role.
- `tenants`: unique index on `{ slug: 1 }` (used for path-based routing).
- Text/search indexes added per feature as needed (e.g. student name search).

## Consistency & transactions

MongoDB multi-document ACID transactions (replica set/Atlas) are used for
operations spanning multiple collections within one tenant (e.g. creating
a student + enrollment + parent link atomically).

## Data isolation guarantee

Repository implementations (`infrastructure/repositories`) must always
filter and write with `tenantId` — enforced by the generic
`IBaseRepository<T>` contract requiring `tenantId` on every read/write
method, plus tenant-scoped Mongoose query middleware to be added when the
tenants module is implemented.
