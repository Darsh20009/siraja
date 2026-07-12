import { Request } from 'express';

/** Extracts client IP/user-agent consistently across every auth controller. */
export function extractRequestContext(req: Request): { ipAddress: string; userAgent?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || req.ip || 'unknown';
  return { ipAddress, userAgent: req.headers['user-agent'] };
}

/**
 * Resolves the acting tenant for an auth request. `TenantMiddleware`
 * populates `request.tenant` from the `X-Tenant-Slug` header — auth
 * routes are no exception, since registration/login are always performed
 * against a specific tenant. Callers must send that header.
 */
export function extractTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('No tenant resolved for this request — TenantMiddleware must run before auth routes.');
  }
  return tenantId;
}
