import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TENANT_BRANDING_REPOSITORY, ITenantBrandingRepository } from '../../domain/repositories/tenant-branding.repository.interface';

@Injectable()
export class TenantAdminService {
  constructor(
    @Inject(TENANT_BRANDING_REPOSITORY) private readonly brandingRepo: ITenantBrandingRepository,
  ) {}

  async getBranding(tenantId: string) {
    return this.brandingRepo.findByTenantId(tenantId);
  }

  async upsertBranding(tenantId: string, data: Record<string, unknown>) {
    return this.brandingRepo.upsert(tenantId, data as never);
  }
}
