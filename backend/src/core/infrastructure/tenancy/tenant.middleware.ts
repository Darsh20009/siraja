import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Resolves the tenant from the URL path segment, e.g.:
 *   siraja.website/tuwaiq/...  ->  tenantSlug = "tuwaiq"
 *
 * Structure only — slug -> tenantId lookup (via TenantsModule) and
 * attachment to TenantContext will be implemented alongside the
 * tenants feature.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    next();
  }
}
