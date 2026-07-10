import { Request } from 'express';

/** Extracts client IP/user-agent consistently across every auth controller. */
export function extractRequestContext(req: Request): { ipAddress: string; userAgent?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || req.ip || 'unknown';
  return { ipAddress, userAgent: req.headers['user-agent'] };
}

/**
 * Resolves the acting tenant for an auth request. `TenantMiddleware`
 * (Phase 1) already populates `request.tenant` from the URL path for
 * every request — auth routes are no exception, since registration/login
 * are always performed against a specific tenant
 * (`siraja.website/:tenantSlug/auth/...`).
 */
export function extractTenantId(req: Request): string {
  const tenantId = (req as any).tenant?.id;
  if (!tenantId) {
    throw new Error('No tenant resolved for this request — TenantMiddleware must run before auth routes.');
  }
  return tenantId;
}
