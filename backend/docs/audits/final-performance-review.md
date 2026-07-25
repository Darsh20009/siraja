# Final Performance Review — Siraja Backend

**Date:** 2026-07-24  
**Scope:** `backend/src/` — MongoDB queries, indexes, caching, startup, memory

---

## 1. Query Patterns

### `.lean()` Usage ✅
All 29 repositories use `.lean()` on read queries. Lean queries return plain JavaScript objects (no Mongoose document overhead), reducing memory allocation by ~40% per document compared to hydrated results. This is the correct pattern for read-heavy API endpoints.

### N+1 Query Risks ⚠️

| Location | Pattern | Risk |
|---|---|---|
| `circle.repository.ts` — `listWithStudentCount` | Separate `countDocuments` per circle | N+1 if called in a loop. Current callers pass an array of IDs, so it is one `countDocuments` + one `find` — acceptable. |
| `AiOrchestrator` — generates one LLM call per student in a batch | Serial `await` in a loop | High latency for large cohorts. Should use `Promise.all` with a concurrency limiter. |
| `GamificationModule` — `leaderboard` snapshot | Aggregation pipeline on full tenant dataset | Expensive for large tenants. Snapshot is pre-computed on a schedule — ✅ correct pattern. |
| `WeaknessHeatmapService` — loads all `AyahPerformance` records for a student | Single query, then in-memory group-by | Acceptable for typical student sizes (< 6236 ayahs). Add an index if p99 latency becomes an issue. |

### Missing `.lean()` Calls ⚠️
- `notification.repository.ts` — `createMany` uses `insertMany` (returns hydrated docs from some Mongoose versions). Cast to `NotificationDocument[]` before calling `.toObject()`. Already handled in the type-fix pass.
- `ai-insight.repository.ts` — `create` returns a hydrated document; `.toObject()` is called correctly.

---

## 2. Index Review

### Existing Indexes (confirmed present)

| Schema | Indexes |
|---|---|
| `User` | `{ tenantId, email }` unique; `{ tenantId, phone }` sparse; `{ tenantId, status }` |
| `Student` | `{ tenantId, user }` unique; `{ tenantId, group }`; `{ tenantId, parents }`; `{ tenantId, isActive, isDeleted }` |
| `MemorizationRecord` | `{ tenantId, student, surahNumber }`; `{ tenantId, student, status }` |
| `AyahPerformance` | `{ tenantId, student, surahNumber, ayahNumber }` unique |
| `Notification` | `{ tenantId, recipient, isRead, isArchived, createdAt }`; `{ tenantId, recipient, priority, createdAt }` |
| `AuditLog` | `{ actor, createdAt }`; `{ tenantId, createdAt }`; `{ entityType, entityId, createdAt }` |
| `ActivityLog` | `{ tenantId, createdAt }` (TTL 180 days); `{ user, createdAt }` |

### Indexes Added in This Pass

| Schema | New Index | Rationale |
|---|---|---|
| `Student` | `{ tenantId: 1, sheikh: 1, enrolledAt: -1 }` | Sheikh dashboard "my students" list, sorted by enrolment date. Without this, the query does a full `tenantId` collection scan filtered in memory. |

### Redundancy Analysis
`BaseSchema` adds a single-field `{ tenantId: 1 }` index that is partially covered by compound indexes on child schemas. MongoDB uses the most selective available index; the single-field index is still useful for aggregation pipelines that filter only on `tenantId` (e.g. bulk tenant reporting). **No indexes removed** — the overlap cost (extra write overhead) is negligible compared to the risk of removing an index that some pipeline still benefits from.

### Recommended Future Indexes (not yet added — requires query profiling to confirm)

| Schema | Candidate Index | Trigger |
|---|---|---|
| `AyahPerformance` | `{ tenantId, student, status }` | Weakness heatmap bulk-read by status |
| `ReviewRecord` | `{ tenantId, student, nextReviewAt }` | Upcoming review scheduler |
| `Assignment` | `{ tenantId, student, dueDate, status }` | Student assignment dashboard sorted by due date |

---

## 3. Caching

### Redis / CacheService ✅
- `CacheService` wraps Upstash Redis with a graceful fallback — on `MaxRetriesPerRequestError` or connection failure, the service logs a warning and returns `null` (cache miss). Callers treat a miss as a cache miss and fall through to the database.
- **Risk:** If Redis is persistently unavailable, every request hits MongoDB. This is acceptable for availability but will degrade latency under sustained load. Monitor the Redis connection health endpoint (`/health`).

### Cache TTLs
- AI report insights: 1-hour TTL (appropriate for advisory data).
- Leaderboard snapshots: 24-hour TTL with manual invalidation on new session.
- Tenant config: 5-minute TTL (short enough for config changes to propagate).

### Missing Cache Opportunities
- `QuranMetadata` (surahs, ayahs, juzs): these are platform-global, immutable after seeding, and queried on every Quran view. They are currently **not cached**. A Redis cache with a 1-hour TTL and lazy-loading would eliminate the majority of Quran-related DB reads.

---

## 4. Startup Performance

### Module Init ✅
- `MongooseModule.forRootAsync` uses `ConfigService` — no synchronous blocking.
- `BullModule` conditionally registered based on `REDIS_URL` presence — prevents startup failure when Redis is absent.
- `MailerModule` conditionally no-ops when `EMAIL_PASS` is absent.

### Schema Index Sync
Mongoose `autoIndex` is enabled by default in development. In production (`NODE_ENV=production`), set `autoIndex: false` and run index creation separately to avoid slowing down startup on large collections.

**Recommendation:** Add `autoIndex: process.env.NODE_ENV !== 'production'` to `MongooseModule.forRootAsync` options.

---

## 5. Memory Leak Review

### Event Listeners ✅
- `EventsModule` wires `EventEmitter2`; all listeners are class methods registered via `@OnEvent()` decorators — automatically cleaned up when the NestJS module is destroyed.
- No manual `emitter.on()` calls detected that would require manual `.off()` teardown.

### Queue Workers ✅
- BullMQ processors registered via `@Processor()` decorators — NestJS manages lifecycle.
- No `setInterval` / `setTimeout` calls that escape to global scope detected.

### Mongoose Connection Pooling
Default Mongoose connection pool is 5. Under high concurrency (> 5 simultaneous queries), requests queue. For a multi-tenant SaaS this is likely fine; increase `maxPoolSize` in `MongooseModule` options if p99 latency spikes under load tests.

### Potential Leak: `Map`-backed `unreadCounts` in `MessageThread`
`MessageThread.unreadCounts` is stored as a Mongoose `Map` type. Each `.save()` on a hydrated document re-serializes the entire map. For threads with many participants, prefer storing counts as a regular sub-document array indexed by `userId` for more efficient partial updates via `$inc`.

---

## 6. Compression ✅

`compression()` middleware applied globally. API responses with large JSON payloads (e.g. bulk report exports, Quran metadata) will be gzip-compressed. Confirmed middleware is registered before route handlers.

---

## Summary

| Category | Status | Priority Action |
|---|---|---|
| `.lean()` coverage | ✅ Complete | None |
| N+1 queries | ⚠️ AI orchestrator loop | Wrap in `Promise.all` with concurrency limit |
| Indexes (added) | ✅ 1 new index | None |
| Indexes (recommended) | ⚠️ 3 candidates | Profile queries before adding |
| Redis caching | ✅ Graceful fallback | Cache immutable Quran metadata |
| Startup speed | ⚠️ autoIndex | Disable `autoIndex` in production |
| Memory leaks | ✅ No leaks detected | Monitor `unreadCounts` Map at scale |
| Compression | ✅ Active | None |
