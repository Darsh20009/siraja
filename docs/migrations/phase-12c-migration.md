# Phase 12C — Migration Guide

**Date:** 2026-07-14  
**Risk:** Low — all new components are additive. Existing behavior is unchanged.

---

## 1. New npm Packages

The following packages were added to `backend/package.json`:

```bash
npm install ioredis @nestjs/bullmq bullmq @nestjs/event-emitter compression @types/compression
```

No existing packages were removed or version-bumped.

---

## 2. Environment Variables

All Phase 12C environment variables are **optional**. The app boots and serves requests without them — new components degrade gracefully. Add these to your `.env` / secrets store to enable full functionality.

### Redis (enables cache + queues)

```env
REDIS_URL=redis://localhost:6379
# For TLS: rediss://user:password@host:6380

REDIS_KEY_PREFIX=siraja:          # default: siraja:
REDIS_TTL_DEFAULT=300             # 5 min — generic cache TTL (seconds)
REDIS_TTL_SESSION=86400           # 24 h
REDIS_TTL_AI=3600                 # 1 h — AI response cache
REDIS_TTL_WEAKNESS=300            # 5 min — weakness heatmap
REDIS_TTL_QURAN=86400             # 24 h
REDIS_TTL_TENANT=600              # 10 min — tenant profile cache
REDIS_TTL_USER_PROFILE=300        # 5 min
```

### Existing variables (already in use, no change)

```env
MONGODB_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
EMAIL_HOST=...       # enables email delivery
STORAGE_DRIVER=s3    # enables S3 storage
MOONSHOT_API_KEY=... # enables AI features
```

---

## 3. AppModule Changes

Three new modules were added to `AppModule.imports`:

```typescript
// backend/src/app.module.ts
RedisModule,           // @Global — provides REDIS_CLIENT + CacheService
QueuesModule.forRootAsync(),  // @Global — conditional BullMQ (requires REDIS_URL)
EventsModule,          // @Global — EventEmitter2 + EventDispatcherService
SystemModule,          // provides GET /api/v1/system/health/detailed
```

These additions are **additive** — all existing modules continue to function unchanged.

---

## 4. New Endpoints

### Detailed System Health

```
GET /api/v1/system/health/detailed
Authorization: none (public)
```

Returns a comprehensive health report. Response status is:
- `200` — ok or degraded (partial functionality)
- `503` — down (MongoDB unavailable)

Use this endpoint in your monitoring/alerting stack instead of (or in addition to) the existing `GET /api/v1/health`.

---

## 5. HTTP Compression

`compression` middleware was added in `main.ts`. This transparently compresses responses > 1KB using the algorithm the client advertises (`gzip` or `br`). No client changes required — all modern HTTP clients handle this automatically.

If your load balancer already handles compression, disable it here by removing `app.use(compression())` from `main.ts` to avoid double-compression.

---

## 6. Enabling Queues Step-by-Step

### Step 1: Provision Redis

Any Redis-compatible service works:
- **Upstash Redis** (serverless, free tier) — recommended for Replit Beta
- **Redis Cloud** (managed)
- **Self-hosted Redis 7+**

Copy the connection URL:
```
rediss://default:<password>@<host>:<port>
```

### Step 2: Add REDIS_URL to secrets

In Replit: Settings → Secrets → `REDIS_URL` = your Redis URL.

### Step 3: Restart the application

The `QueuesModule` checks `REDIS_URL` at startup. After restart, logs will show:
```
[QueuesModule] Redis connected ✓
[QueuesModule] BullMQ queues registered: ai-queue, email-queue, notification-queue, report-queue, audio-queue
```

### Step 4: Verify via health endpoint

```
GET /api/v1/system/health/detailed
```

Check `dependencies.redis.status === 'ok'` and `dependencies.queues.stats` is populated.

---

## 7. Emitting Domain Events from Use Cases

To wire a use case into the event system, inject `EventDispatcherService` and emit after the primary operation succeeds:

```typescript
// Example: RegisterUserUseCase
constructor(
  private readonly userRepo: IUserRepository,
  private readonly events: EventDispatcherService,
) {}

async execute(dto: RegisterUserDto): Promise<User> {
  const user = await this.userRepo.create(dto);
  // Fire-and-forget — never await, never block the HTTP response
  this.events.userRegistered(
    new UserRegisteredEvent(
      user.id,
      user.email,
      user.fullName,
      dto.tenantId,
      dto.tenantName,
      `${appUrl}/login`,
    ),
  );
  return user;
}
```

Available events and their classes are in `backend/src/shared/events/domain.events.ts`.

---

## 8. Rollback Plan

Since all changes are additive:

1. **Remove REDIS_URL** from secrets → queues and Redis cache immediately fall back to no-op / in-process mode
2. **Remove the 4 module imports** from `AppModule` → Phase 12C features are completely disabled
3. **Remove the 6 npm packages** → `npm uninstall ioredis @nestjs/bullmq bullmq @nestjs/event-emitter compression @types/compression`

No database migrations are required. No schema changes were made.

---

## 9. Monitoring Integration

### Uptime / Alerting

Point your uptime monitor at:
```
GET https://your-app-url/api/v1/system/health/detailed
Expected: HTTP 200, body.status = 'ok'
Alert if: HTTP 503 OR body.status = 'down'
```

### Queue Monitoring (with Redis)

BullMQ stores job data directly in Redis. Compatible dashboards:
- **Bull Board** (`@bull-board/api`) — add in Phase 13
- **Arena** — alternative open-source dashboard
- Direct Redis inspection: `KEYS siraja:bull:*`

### Log Aggregation

All Phase 12C components use NestJS `Logger` with contextual names:
- `RedisModule` — connection events
- `CacheService` — fallback events, error counts
- `QueueService` — dropped job warnings
- `EmailQueueProcessor` — job processing results
- `AiQueueProcessor` — AI job status
- `NotificationQueueProcessor`, `ReportQueueProcessor`, `AudioQueueProcessor`

---

*Migration guide complete. No breaking changes in Phase 12C.*
