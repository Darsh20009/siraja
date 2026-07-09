import { Injectable, Scope } from '@nestjs/common';

/**
 * Request-scoped tenant context.
 * Populated by TenantMiddleware from the URL path (e.g. /:tenantSlug/...)
 * and injected wherever the current tenant is needed, keeping tenant
 * resolution out of business logic.
 *
 * Structure only — population logic lives in tenant.middleware.ts.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  tenantId?: string;
  tenantSlug?: string;
}
