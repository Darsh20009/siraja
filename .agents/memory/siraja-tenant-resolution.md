---
name: Siraja tenant resolution architecture
description: Header-based (X-Tenant-Slug) tenant resolution — why it was chosen, how it's enforced, and where it's deliberately permissive.
---

## Decision
Tenant resolution is **header-based**: clients send `X-Tenant-Slug` on every request. `TenantMiddleware` (global, `core/infrastructure/tenancy/tenant.middleware.ts`) resolves it to `req.tenant = { id, slug, status }` via `TenantRepository`.

**Why:** Despite code comments describing a URL-path design (`siraja.website/tuwaiq`), none of the ~37 controllers actually had a `:tenantSlug` route segment when this was audited — tenant resolution was entirely unimplemented (`TenantMiddleware` was a no-op stub, `extractTenantId()` always threw). Rewriting all 37 controllers for path-based resolution was the highest-risk option (breaks any existing frontend client) with a Beta imminent. Header-based needed zero route changes, works immediately without DNS/subdomain setup, and is trivial to test via curl/Swagger.

**How to apply:** The middleware is permissive when no header is sent — `req.tenant` stays undefined, letting platform-global routes (health check, Quran reference content) proceed. Enforcement that a tenant is *required* lives at the consumer level: `extractTenantId()` for auth routes, `TenantScopeGuard` (global `APP_GUARD`) for authenticated tenant-scoped routes — rejects with 403 if the user's JWT `tenantId` doesn't match `req.tenant.id`. Unknown slug → 404; suspended/archived tenant → 403. `TenantContext` (request-scoped) exists as a documented but currently-unwired future extension point — nothing consumes it yet.

Subdomain-based resolution can be added later without breaking clients already sending the header — extend the same resolver function, don't replace it.
