---
name: Siraja tenant resolution architecture
description: Header-based (X-Tenant-Slug) tenant resolution — why it was chosen, how it's enforced, and where it's deliberately permissive.
---

## Decision
Tenant resolution is **header-based**: clients send `X-Tenant-Slug` on every request. `TenantMiddleware` (global, `core/infrastructure/tenancy/tenant.middleware.ts`) resolves it to `req.tenant = { id, slug, status }` via `TenantRepository`.

**Why:** Despite code comments describing a URL-path design (`siraja.website/tuwaiq`), none of the ~37 controllers actually had a `:tenantSlug` route segment when this was audited — tenant resolution was entirely unimplemented (`TenantMiddleware` was a no-op stub, `extractTenantId()` always threw). Rewriting all 37 controllers for path-based resolution was the highest-risk option (breaks any existing frontend client) with a Beta imminent. Header-based needed zero route changes, works immediately without DNS/subdomain setup, and is trivial to test via curl/Swagger.

**How to apply:** The middleware is permissive when no header is sent — `req.tenant` stays undefined, letting platform-global routes (health check, Quran reference content) proceed. Enforcement that a tenant is *required* lives at the consumer level: `extractTenantId()` for auth routes, `TenantScopeGuard` (global `APP_GUARD`) for authenticated tenant-scoped routes — rejects with 403 if the user's JWT `tenantId` doesn't match `req.tenant.id`. Unknown slug → 404; suspended/archived tenant → 403. `TenantContext` (request-scoped) exists as a documented but currently-unwired future extension point — nothing consumes it yet.

Subdomain-based resolution can be added later without breaking clients already sending the header — extend the same `resolveTenantSlugCandidate()` function, don't replace it.

## Type augmentation
`backend/src/@types/express/index.d.ts` augments `express-serve-static-core` to add `req.tenant?: { id, slug, status }` globally. Uses inline `import()` type so the file stays ambient (no top-level imports). Remove the unsafe `(req as any).tenant` and `(req as Request & {...}).tenant` casts from `tenant.middleware.ts` and `request-context.helper.ts`.

## Jest / type-checking gotcha
`@types/express` v5.0.6 + `@types/express-serve-static-core` v5.1.2 are installed against **express 4.22.1**. This causes `NextFunction` call-signature and `Request.headers` type errors that are invisible during the NestJS build (`skipLibCheck: true` skips `.d.ts` checking) but surface when ts-jest compiles `.ts` files directly.

**Fix applied:** `isolatedModules: true` in `backend/tsconfig.json` + ts-jest transform pointing at that tsconfig. Tests run in transpile-only mode; type correctness is still enforced by `tsc` (with `skipLibCheck: true`).

**Long-term fix:** Downgrade `@types/express` to `^4.17` to match the express 4.x runtime, or upgrade express to 5.x. Deferred past Beta.

## Tenant isolation tests (49 tests, 4 suites, 100% pass)
- `core/infrastructure/tenancy/tenant.middleware.spec.ts` — header extraction, slug normalisation, valid/trial tenant attach, unknown/suspended/archived rejection, request isolation
- `common/guards/tenant-scope.guard.spec.ts` — @Public bypass, SUPER_ADMIN bypass, unauthenticated, missing tenant, same-tenant allow, cross-tenant block, body/query tenantId injection block
- `modules/auth/infrastructure/helpers/request-context.helper.spec.ts` — extractTenantId happy path, absent/empty id throw; extractRequestContext IP/UA extraction
- `modules/tenants/infrastructure/repositories/tenant.repository.spec.ts` — findBySlug/findById query filters, isDeleted exclusion, invalid ObjectId short-circuit, no-tenantId-on-platform-global-collection assertion
