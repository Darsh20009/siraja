# Multi-Tenant Architecture Blueprint

## Strategy: path-based tenancy

```
siraja.website/tuwaiq    -> tenant slug "tuwaiq"
siraja.website/noor      -> tenant slug "noor"
siraja.website/furqan    -> tenant slug "furqan"
```

A single deployment (one backend, one Flutter web/app build) serves every
tenant; the tenant is resolved per-request from the URL, never from a
subdomain or separate deployment.

## Resolution flow (backend)

1. `TenantMiddleware` (`core/infrastructure/tenancy/tenant.middleware.ts`)
   reads the first path segment of every incoming request.
2. It resolves `slug -> tenantId` (via the `tenants` module's repository,
   cached to avoid a DB hit per request).
3. The resolved tenant is attached to the request and exposed through the
   request-scoped `TenantContext` provider and the `@CurrentTenant()`
   param decorator.
4. Every downstream repository call is required to take `tenantId`
   (`IBaseRepository<T>`), so a handler cannot accidentally query across
   tenants.
5. Platform-level routes that are not tenant-scoped (e.g. super admin,
   tenant provisioning) live outside the `:tenantSlug` prefix, under a
   reserved namespace (see `06-api-structure.md`).

## Resolution flow (frontend)

- **Web**: the tenant slug is read from the browser URL path via
  `go_router`, matching the backend's path convention.
- **Mobile**: the user selects/enters their tenant (e.g. via a QR code,
  invite link, or slug entry) once; the slug is persisted locally and sent
  as part of every API call's base path.

## Reserved slugs

Slugs that collide with platform routes (`api`, `admin`, `auth`, `assets`,
etc.) are disallowed at tenant-creation time — enforced by the `tenants`
module's validation once implemented.

## Tenant-aware JWT

Access/refresh tokens embed `tenantId` in the payload
(`shared/interfaces/jwt-payload.interface.ts`) so a token issued for one
tenant cannot be replayed against another, even if the same user account
belongs to multiple tenants (a `users` <-> tenant membership is a distinct
concept from the global user identity — see database blueprint).

## Cross-tenant roles

- **Super Admin**: platform-level, not tied to any tenant; manages tenant
  provisioning, plans, and platform-wide oversight.
- **Tenant Admin / Supervisor / Sheikh / Parent / Student**: scoped to
  exactly the tenant(s) they hold a membership in.

## Scaling considerations

- Tenant slug -> id lookups are cached (in-memory/Redis, to be decided at
  implementation time) to avoid a database round trip on every request.
- MongoDB Atlas sharding can key on `tenantId` if/when a single shared
  collection outgrows a single shard, without changing application code
  (repositories already filter/write by `tenantId`).
