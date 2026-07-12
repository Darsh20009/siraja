import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped tenant context.
 *
 * `TenantMiddleware` currently attaches the resolved tenant directly onto
 * `req.tenant` (readable via `@CurrentTenant()` / `extractTenantId()`),
 * since request-scoped providers cannot be injected into middleware.
 * This class is reserved for a future interceptor/guard that copies
 * `req.tenant` into a proper request-scoped context for services that
 * want DI-style access instead of reading off the raw request — not yet
 * wired anywhere.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  tenantId?: string;
  tenantSlug?: string;
}
