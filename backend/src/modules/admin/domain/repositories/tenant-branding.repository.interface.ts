import { TenantBranding } from '@database/mongoose/schemas';

export const TENANT_BRANDING_REPOSITORY = 'TENANT_BRANDING_REPOSITORY';

export interface ITenantBrandingRepository {
  findByTenantId(tenantId: string): Promise<TenantBranding | null>;
  upsert(tenantId: string, data: Partial<TenantBranding>): Promise<TenantBranding>;
}
