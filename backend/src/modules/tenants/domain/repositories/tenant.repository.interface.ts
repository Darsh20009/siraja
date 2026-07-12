import { TenantDocument } from '@database/mongoose/schemas';

/**
 * Tenant Module contract — resolving a tenant by its public `slug` is the
 * seam every tenant-resolution mechanism (header today, subdomain later)
 * goes through, so it lives in the domain layer independent of how the
 * slug was extracted from the request.
 */
export interface ITenantRepository {
  findBySlug(slug: string): Promise<TenantDocument | null>;
  findById(id: string): Promise<TenantDocument | null>;
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
