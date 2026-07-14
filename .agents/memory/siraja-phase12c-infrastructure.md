---
name: Siraja Phase 12C Infrastructure
description: Redis/CacheService fallback pattern, QueuesModule conditional registration, EventsModule wiring, SystemController health endpoint, compression. Read before touching cache/queue/event/health code.
---

# Phase 12C — Infrastructure, Reliability & Production Readiness

## Status: Complete (2026-07-14)
311/311 tests passing. tsc --noEmit clean. App boots on port 5000.

## Graceful fallback pattern (applies to Redis, Queues, Email, Storage, AI)
Every optional dependency provides the same pattern: log a warning at startup, continue with a reduced/no-op implementation. The app never fails to boot due to an unconfigured optional service.

## RedisModule + CacheService
- `REDIS_CLIENT` injection token; null when REDIS_URL unset.
- `CacheService` checks for null client on every operation; falls back to `SimpleTtlCache` (in-process Map).
- `CacheService.invalidatePattern(glob)` → Redis SCAN+DEL or prefix scan on fallback.
- `CacheService.increment(key, ttlMs)` → atomic counter, building block for rate limiting.
- `backend: 'redis' | 'memory'` — read to know which path is active.
- Located in `shared/redis/`.

## QueuesModule pattern (critical)
`QueuesModule.forRootAsync()` reads `process.env.REDIS_URL` at **module load time** (before DI), not via ConfigService. This avoids the DI chicken-and-egg problem.
- REDIS_URL set → full BullMQ, all 5 queues registered with processors.
- REDIS_URL unset → no-op QueueService provided; all add() calls return false.
**Why:** ConfigService isn't available at @Module() decorator stage; static env read is the established pattern (same as @nestjs/throttler internals).

## Queue constants
- Names: `ai-queue`, `email-queue`, `notification-queue`, `report-queue`, `audio-queue`
- Job names: `JOB_EMAIL_WELCOME`, `JOB_EMAIL_VERIFICATION`, `JOB_EMAIL_PASSWORD_RESET`, `JOB_EMAIL_NOTIFICATION`, `JOB_EMAIL_SYSTEM_ALERT`, `JOB_AI_INSIGHT`, etc.
- Default: 3 attempts, exponential backoff 1s→2s→4s, removeOnFail count 200 (DLQ pattern).
- Critical: 5 attempts, 2s→32s backoff, priority=1.
- Located in `shared/queues/queue.constants.ts`.

## EventsModule
- Uses `@nestjs/event-emitter` (EventEmitter2), NOT `@nestjs/cqrs`. Reason: additive to existing use-cases without refactoring to Command/Query handlers.
- `EventDispatcherService` — inject in any use-case, call typed emit methods (userRegistered, memorizationRecorded, etc.).
- 7 domain events in `shared/events/domain.events.ts`.
- Use-case wiring (emitting events from RegisterUser, ApproveMemorizationRecord, etc.) is Phase 13 work.
- Located in `shared/events/`.

## AI processor stub
`AiQueueProcessor` logs but doesn't call `AiInsightOrchestratorService`. Reason: shared/queues → feature module dependency direction violation. Full wiring is Phase 13 with a proper service boundary.

## System health endpoint
`GET /api/v1/system/health/detailed` — public, no auth.
- 200 when ok/degraded, 503 when MongoDB unavailable.
- Reports 6 dependencies + system metrics (memory, CPU, uptime).
- Located in `modules/system/`.

## Compression
`import compression from 'compression'` (not `import * as compression`) — esModuleInterop is true but `import * as` doesn't give the callable default export.
