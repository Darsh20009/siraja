# Phase 12C — Infrastructure, Reliability & Production Readiness

**Status:** Implemented  
**Date:** 2026-07-14  
**Depends on:** Phase 12A (Platform Foundation), Phase 12B (Learning Intelligence Core)

---

## Overview

Phase 12C elevates Siraja from a working single-instance backend into a production-grade platform capable of serving hundreds of thousands of users. Every component follows the same graceful-degradation pattern already established in Phase 10–12A: if an optional dependency (Redis, email host, storage) is not configured, the platform logs a warning and continues functioning in a reduced but non-crashing state.

The phase delivers eight capability areas:

| # | Area | Key Components |
|---|---|---|
| 1 | Redis Layer | `RedisModule`, `CacheService`, distributed TTL cache |
| 2 | BullMQ Queues | 5 queues, processors, DLQ, job monitoring |
| 3 | Event-Driven Architecture | `EventsModule`, `EventDispatcherService`, domain events, listeners |
| 4 | Email Completion | System alert template, `sendSystemAlert`, `EmailQueueProcessor` |
| 5 | Storage Infrastructure | Existing S3 layer (complete since Phase 12A) |
| 6 | System Health | `GET /api/v1/system/health/detailed` |
| 7 | Performance | HTTP compression (gzip/brotli), ETag via Express defaults |
| 8 | Testing | Unit tests for all new services |

---

## 1. Redis Layer

### Module: `RedisModule` (global)

**Location:** `backend/src/shared/redis/`

```
redis.constants.ts     — REDIS_CLIENT injection token
redis.module.ts        — global module, provides ioredis client
cache.service.ts       — distributed cache with in-process fallback
```

### Graceful Degradation

```
REDIS_URL set
  → ioredis client connected with retryStrategy (max 5 attempts)
  → CacheService backend = 'redis'
  → All cache operations go through ioredis

REDIS_URL unset (or connection failure)
  → REDIS_CLIENT = null
  → CacheService backend = 'memory'
  → All cache operations fall through to SimpleTtlCache (in-process Map)
  → Queues disabled (see §2)
```

### CacheService API

```typescript
class CacheService {
  // Core
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
  invalidatePattern(pattern: string): Promise<void>  // Redis SCAN+DEL | prefix scan

  // Utilities
  getOrSet<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T>
  increment(key: string, ttlMs: number): Promise<number>  // atomic counter (rate limiting)
  ttlMs(key: string): Promise<number>

  // Diagnostics
  ping(): Promise<boolean>
  getMetrics(): CacheMetrics  // { hits, misses, errors, backend }
  get backend(): 'redis' | 'memory'
}
```

### Cache Key Namespacing Convention

```
<namespace>:<tenantId>:<discriminator>
```

| Use Case | Key Pattern | TTL |
|---|---|---|
| Weakness heatmap | `weakness:<tenantId>:<studentId>` | 5 min |
| Overdue revisions | `overdue:<tenantId>:<studentId>` | 1 min |
| Completion forecast | `forecast:<tenantId>:<studentId>` | 2 min |
| AI response | `ai:<tenantId>:<promptHash>` | 1 h |
| Tenant profile | `tenant:<slug>` | 10 min |
| User profile | `user:<userId>` | 5 min |
| Quran text | `quran:normalized` | 24 h (permanent in-process Map) |

### Redis Connection Configuration

```
REDIS_URL=redis://localhost:6379           # plain
REDIS_URL=rediss://user:pass@host:6380    # TLS
REDIS_KEY_PREFIX=siraja:                  # optional key prefix
```

ioredis is configured with:
- `lazyConnect: true` — connect explicitly so connection errors are caught at startup
- `maxRetriesPerRequest: 3` — per-command retry
- `retryStrategy` — exponential backoff up to 5 attempts (200ms, 400ms, 800ms, 1.6s, 2s), then null (give up)

---

## 2. BullMQ Queue Infrastructure

### Module: `QueuesModule` (global)

**Location:** `backend/src/shared/queues/`

```
queue.constants.ts          — queue names, job names, default options
queue.service.ts            — unified enqueue facade
queues.module.ts            — conditional registration (Redis-gated)
jobs/                       — job data interfaces (typed)
  ai.jobs.ts
  email.jobs.ts
  notification.jobs.ts
  report.jobs.ts
  audio.jobs.ts
processors/                 — WorkerHost processors
  ai-queue.processor.ts
  email-queue.processor.ts
  notification-queue.processor.ts
  report-queue.processor.ts
  audio-queue.processor.ts
```

### Queues

| Queue Name | Purpose | Processor |
|---|---|---|
| `ai-queue` | Async AI insight generation, weakness reports, forecast explanations | `AiQueueProcessor` |
| `email-queue` | All outbound email delivery | `EmailQueueProcessor` |
| `notification-queue` | In-app notifications, push notifications | `NotificationQueueProcessor` |
| `report-queue` | Student progress, circle summaries, attendance reports | `ReportQueueProcessor` |
| `audio-queue` | Future recitation audio processing | `AudioQueueProcessor` (placeholder) |

### Default Job Options

```typescript
DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },   // 1s → 2s → 4s
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },   // DLQ-style: keep last 200 failed jobs for inspection
}

CRITICAL_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },   // 2s → 4s → 8s → 16s → 32s
  priority: 1,
}
```

### Dead-Letter Queue Pattern

BullMQ's `removeOnFail: { count: N }` keeps the last N failed jobs in the Redis keyspace with full data, logs, and stack traces. These act as a dead-letter queue inspectable via Bull Dashboard or direct Redis queries:

```
KEYS siraja:bull:email-queue:failed:*
```

### QueueService API

```typescript
class QueueService {
  add(queue: QueueName, jobName: string, data: unknown, opts?): Promise<boolean>
  addCritical(queue: QueueName, jobName: string, data: unknown): Promise<boolean>
  addDelayed(queue: QueueName, jobName: string, data: unknown, delayMs: number): Promise<boolean>
  getStats(): Promise<QueueStats[]>
  isAvailable(queue: QueueName): boolean
  get registeredQueues(): string[]
}
```

`add()` returns `false` (never throws) when the queue is unavailable, ensuring callers can continue synchronously.

### Conditional Registration

`QueuesModule.forRootAsync()` checks `process.env.REDIS_URL` at module load time:
- **Set** → full BullMQ registration with all 5 queues and processors active
- **Unset** → no-op `QueueService` provided; all `add()` calls log a warning

---

## 3. Event-Driven Architecture

### Module: `EventsModule` (global)

**Location:** `backend/src/shared/events/`

```
events.constants.ts               — event name constants (EVENTS object)
domain.events.ts                  — typed event payload classes
event-dispatcher.service.ts       — typed facade over EventEmitter2
events.module.ts                  — module wiring EventEmitter2 + listeners
listeners/
  email-event.listener.ts         — USER_REGISTERED → email-queue
  notification-event.listener.ts  — MEMORIZATION_RECORDED, MISTAKE_RECORDED, etc. → queues
```

### Domain Events

| Event | Class | Triggers |
|---|---|---|
| `user.registered` | `UserRegisteredEvent` | Welcome email (email-queue) |
| `student.created` | `StudentCreatedEvent` | (available for future listeners) |
| `memorization.recorded` | `MemorizationRecordedEvent` | AI insight (ai-queue) |
| `review.recorded` | `ReviewRecordedEvent` | (available for future listeners) |
| `mistake.recorded` | `MistakeRecordedEvent` | AI insight (ai-queue) |
| `attendance.marked` | `AttendanceMarkedEvent` | Absence notifications (notification-queue) |
| `notification.created` | `NotificationCreatedEvent` | In-app delivery + email if opted-in |

### Emitting Events (Use-Case Layer)

```typescript
// inject EventDispatcherService in any use-case
constructor(private readonly events: EventDispatcherService) {}

// after user registration succeeds:
this.events.userRegistered(
  new UserRegisteredEvent(userId, email, fullName, tenantId, tenantName, loginUrl)
);
```

All emits are synchronous fire-and-forget from the emitter's perspective. EventEmitter2 is configured with `wildcard: true` (enables `user.*` patterns) and `ignoreErrors: false` (prevents silent swallowing of listener errors).

### Loose Coupling Guarantee

The EventDispatcherService → Listeners → QueueService flow creates a one-way dependency:
```
Use Case → EventDispatcherService → EventEmitter2 → Listener → QueueService → BullMQ
```
Use cases have no dependency on queues, email, or notification services.

---

## 4. Email Completion

### System Alert Template

**Location:** `backend/src/shared/email/templates/system-alert.template.ts`

Arabic-first template with severity-coded header colors:
- `info` → blue (`#3B82F6`)
- `warning` → amber (`#F59E0B`)
- `critical` → red (`#EF4444`)

Subjects are prefixed with emoji severity indicators: 📋 / ⚠️ / 🚨

Supports optional key-value `details` table for structured alert metadata.

### EmailTemplateService Additions

```typescript
sendSystemAlert(to: string, data: SystemAlertTemplateData): Promise<void>
```

### Email Queue Flow

```
Domain event / use-case
  → QueueService.add(QUEUE_EMAIL, JOB_EMAIL_WELCOME, { to, fullName, ... })
  → BullMQ persists job in Redis
  → EmailQueueProcessor.process(job) runs async
  → EmailTemplateService.sendWelcome(...)
  → SmtpEmailProvider.send(...)
```

---

## 5. Storage Infrastructure

Fully implemented since Phase 12A:
- `IStorageProvider` interface with `upload()`, `delete()`, `getSignedUploadUrl()`, `getSignedDownloadUrl()`
- `S3StorageProvider` — works with AWS S3, Cloudflare R2, Backblaze B2, MinIO
- `NoopStorageProvider` — dev/CI safe no-op
- Driver selection via `STORAGE_DRIVER=s3`

No additional storage work was required in Phase 12C.

---

## 6. System Health — Detailed Endpoint

### Module: `SystemModule`

**Endpoint:** `GET /api/v1/system/health/detailed`  
**Authentication:** `@Public` (no token required)  
**Status codes:** `200` (ok/degraded), `503` (down — MongoDB unavailable)

### Response Structure

```typescript
{
  status: 'ok' | 'degraded' | 'down',
  timestamp: string,
  uptimeSeconds: number,
  version: string,
  system: {
    memoryUsedMb: number,
    memoryTotalMb: number,
    memoryUsagePercent: number,
    cpuLoadAvg1m: number,
    cpuLoadAvg5m: number,
    nodeVersion: string,
    platform: string,
  },
  dependencies: {
    mongodb:  { status: 'ok' | 'degraded' | 'unavailable', latencyMs?, message? },
    redis:    { status: 'ok' | 'degraded' | 'unavailable', latencyMs?, message? },
    queues:   { status: 'ok' | 'degraded' | 'unavailable', stats?: [...] },
    storage:  { status: 'ok' | 'degraded' | 'unavailable', message? },
    email:    { status: 'ok' | 'degraded' | 'unavailable', message? },
    ai:       { status: 'ok' | 'degraded' | 'unavailable', message? },
  }
}
```

### Overall Status Rules

- `down` — MongoDB unavailable (nothing else works)
- `degraded` — any non-critical dependency is degraded (Redis, queues, storage, email, AI)
- `ok` — all checks pass

### Check Strategy

| Dependency | Method | Down Condition |
|---|---|---|
| MongoDB | `connection.db.command({ ping: 1 })` | readyState ≠ 1 |
| Redis | `cacheService.ping()` | null client = unavailable (not down) |
| Queues | `queueService.getStats()` | no queues registered = unavailable |
| Storage | config check | `driver=noop` = unavailable |
| Email | config check | `EMAIL_HOST` empty = unavailable |
| AI | config check | `MOONSHOT_API_KEY` empty = unavailable |

---

## 7. Performance Optimizations

### HTTP Compression

`compression` middleware added to `main.ts` (before global prefix). Compresses responses > 1KB using gzip or brotli depending on client `Accept-Encoding` header. Expected bandwidth reduction: 60–80% for JSON API responses.

### HTTP Keep-Alive & ETag

Express (used by NestJS platform-express) enables keep-alive connections and ETag generation by default. No additional configuration needed.

### Existing Throttler

`ThrottlerModule` (Phase 4) provides IP-based rate limiting at 100 requests/60 seconds. This remains in-process for Phase 12C. Redis-backed throttler (using `CacheService.increment()`) is available for Phase 13 when the full Redis layer is validated in production.

---

## 8. Testing Strategy

### New Test Suites

| File | Tests | Strategy |
|---|---|---|
| `shared/redis/cache.service.spec.ts` | 20 | Null-client fallback path + Redis mock path; TTL, invalidation, metrics, ping |
| `shared/queues/queue.service.spec.ts` | 10 | Available queues + no-op when null; stats, isAvailable, addCritical |
| `shared/events/event-dispatcher.service.spec.ts` | 8 | All 7 domain events; error swallowing |
| `modules/system/system.controller.spec.ts` | 5 | All-ok, MongoDB down, queues, email unavailable |

---

## Module Placement

```
backend/src/
  shared/
    redis/
      redis.constants.ts
      redis.module.ts       ← @Global, provides REDIS_CLIENT + CacheService
      cache.service.ts      ← Redis-backed with in-process fallback
      cache.service.spec.ts
    queues/
      queue.constants.ts
      queue.service.ts      ← unified enqueue facade
      queue.service.spec.ts
      queues.module.ts      ← @Global, conditional BullMQ registration
      jobs/                 ← typed job data interfaces
      processors/           ← WorkerHost processors (5 queues)
    events/
      events.constants.ts
      domain.events.ts      ← typed event payloads (pure value objects)
      event-dispatcher.service.ts
      event-dispatcher.service.spec.ts
      events.module.ts      ← @Global, EventEmitter2 + listeners
      listeners/
        email-event.listener.ts
        notification-event.listener.ts
    email/
      templates/
        system-alert.template.ts   ← new (Arabic-first, severity-coded)
  modules/
    system/
      system.module.ts
      system.controller.ts   ← GET /api/v1/system/health/detailed
      system.controller.spec.ts
```

---

## Environment Variables Added

```bash
# Phase 12C additions (all optional — app functions without them)
REDIS_URL=                        # ioredis connection URL
REDIS_KEY_PREFIX=siraja:          # key prefix for all Redis operations
REDIS_TTL_DEFAULT=300             # seconds
REDIS_TTL_SESSION=86400
REDIS_TTL_AI=3600
REDIS_TTL_WEAKNESS=300
REDIS_TTL_QURAN=86400
REDIS_TTL_TENANT=600
REDIS_TTL_USER_PROFILE=300
```

---

*Architecture approved. Implementation complete. See `docs/audits/phase-12c-audit.md` for verification.*
