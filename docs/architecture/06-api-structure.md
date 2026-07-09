# API Structure Blueprint

## Base path

```
https://siraja.website/api/v1/...
```

(`API_PREFIX` env var, default `api/v1`, set globally in `main.ts`.)

Note: the **API's** own base path is a fixed `/api/v1` prefix — separate
from the **web app's** tenant-scoped URL paths (`siraja.website/tuwaiq`).
The API instead carries the tenant slug as an explicit path segment per
resource group (see below), keeping the REST surface predictable and
cacheable.

## Route grouping

```
/api/v1/auth/...                          # not tenant-scoped
/api/v1/platform/...                      # super-admin only, not tenant-scoped
/api/v1/:tenantSlug/...                   # every tenant-scoped resource
```

### Auth (`/api/v1/auth`)

```
POST   /auth/register/email
POST   /auth/register/phone
POST   /auth/login/email
POST   /auth/login/phone/verify-otp
GET    /auth/google
GET    /auth/google/callback
POST   /auth/apple/callback
POST   /auth/refresh
POST   /auth/logout
```

### Platform / Super Admin (`/api/v1/platform`)

```
GET    /platform/tenants
POST   /platform/tenants
GET    /platform/tenants/:id
PATCH  /platform/tenants/:id
DELETE /platform/tenants/:id
```

### Tenant-scoped resources (`/api/v1/:tenantSlug/...`)

```
/:tenantSlug/academies
/:tenantSlug/circles
/:tenantSlug/circles/:circleId/students
/:tenantSlug/sheikhs
/:tenantSlug/students
/:tenantSlug/students/:studentId/memorization
/:tenantSlug/parents
/:tenantSlug/notifications
/:tenantSlug/subscriptions
```

Each resource group follows standard REST verbs (GET list/detail, POST
create, PATCH update, DELETE) unless a domain operation warrants a
dedicated action endpoint (e.g. `POST /:tenantSlug/students/:id/memorization/records`).

## Request/response conventions

- **Success envelope** (via `ResponseInterceptor`):
  ```json
  { "success": true, "data": { ... }, "timestamp": "..." }
  ```
- **Error envelope** (via `HttpExceptionFilter`):
  ```json
  { "success": false, "statusCode": 400, "path": "...", "timestamp": "...", "message": "..." }
  ```
- **Pagination**: `?page=&limit=`, response `data` shaped as
  `PaginatedResult<T>` (`items`, `total`, `page`, `limit`).
- **Auth**: `Authorization: Bearer <access_token>`; `RolesGuard` + `@Roles()`
  enforce RBAC per role (see `shared/enums/roles.enum.ts`).

## Versioning

URI versioning (`/api/v1`) from day one; a future breaking change ships as
`/api/v2` served alongside `v1` during migration.
