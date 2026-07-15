import { Test, TestingModule } from '@nestjs/testing';
import { TenantAdminService } from './tenant-admin.service';
import { TENANT_BRANDING_REPOSITORY } from '../../domain/repositories/tenant-branding.repository.interface';

const mockRepo = () => ({
  findByTenantId: jest.fn(),
  upsert: jest.fn(),
});

describe('TenantAdminService', () => {
  let service: TenantAdminService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantAdminService,
        { provide: TENANT_BRANDING_REPOSITORY, useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(TenantAdminService);
    repo = module.get(TENANT_BRANDING_REPOSITORY);
  });

  describe('getBranding', () => {
    it('queries repository with the correct tenantId', async () => {
      repo.findByTenantId.mockResolvedValue({ primaryColor: '#1a1a1a' });

      const result = await service.getBranding('tenant1');

      expect(repo.findByTenantId).toHaveBeenCalledWith('tenant1');
      expect(result).toMatchObject({ primaryColor: '#1a1a1a' });
    });

    it('returns null when no branding configured', async () => {
      repo.findByTenantId.mockResolvedValue(null);
      const result = await service.getBranding('tenant1');
      expect(result).toBeNull();
    });
  });

  describe('upsertBranding', () => {
    it('delegates to repository upsert with tenantId and data', async () => {
      repo.upsert.mockResolvedValue({ primaryColor: '#ff0000' });

      const result = await service.upsertBranding('tenant1', { primaryColor: '#ff0000' } as never);

      expect(repo.upsert).toHaveBeenCalledWith('tenant1', { primaryColor: '#ff0000' });
      expect(result).toMatchObject({ primaryColor: '#ff0000' });
    });
  });
});
