import { ForbiddenException, Inject, Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantStatus } from '@shared/enums/tenant-status.enum';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../modules/tenants/domain/repositories/tenant.repository.interface';

export const TENANT_SLUG_HEADER = 'x-tenant-slug';

/**
 * Extracts a tenant slug candidate from the request. Header-based
 * resolution today (chosen for Beta: zero route/DNS changes, works
 * immediately behind Replit's dev proxy, trivial for mobile/web clients
 * and Swagger/Postman to set). Structured as its own function so a future
 * subdomain-based fallback (e.g. `tuwaiq.siraja.website` -> `req.hostname`)
 * can be added here later without touching the rest of the middleware.
 */
function resolveTenantSlugCandidate(req: Request): string | undefined {
  const header = req.headers[TENANT_SLUG_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;
  return raw?.trim().toLowerCase() || undefined;
}

/**
 * Resolves the acting tenant for the request from the `X-Tenant-Slug`
 * header and attaches it as `req.tenant = { id, slug, status }`.
 *
 * Deliberately permissive when no candidate slug is present: platform-
 * global routes (Quran reference content, health checks, super-admin
 * cross-tenant operations, etc.) never send this header and must keep
 * working with `req.tenant` left `undefined`. Enforcing that a tenant
 * *is* required is each route's job, not this middleware's:
 *   - `extractTenantId()` (auth routes) throws if `req.tenant` is unset.
 *   - `TenantScopeGuard` (authenticated tenant-scoped routes) throws if
 *     `req.tenant` is unset and the user isn't SUPER_ADMIN.
 *
 * When a slug candidate *is* present, it must resolve to a real, non-
 * suspended tenant — an invalid or suspended slug fails fast here rather
 * than silently proceeding as if no tenant were requested.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const slug = resolveTenantSlugCandidate(req);
    if (!slug) {
      next();
      return;
    }

    const tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException(`No tenant found for slug "${slug}".`);
    }
    if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.ARCHIVED) {
      throw new ForbiddenException(`This tenant is ${tenant.status} and cannot be accessed.`);
    }

    req.tenant = {
      id: String(tenant._id),
      slug: tenant.slug,
      status: tenant.status,
    };
    next();
  }
}
