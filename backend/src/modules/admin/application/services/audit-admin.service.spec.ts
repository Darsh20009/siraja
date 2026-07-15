import { Test, TestingModule } from '@nestjs/testing';
import { AuditAdminService } from './audit-admin.service';
import { AUDIT_LOG_ADMIN_REPOSITORY } from '../../domain/repositories/audit-log-admin.repository.interface';
import { AuditAction, AuditEntityType } from '@shared/enums/audit.enum';

const mockRepo = () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
});

describe('AuditAdminService', () => {
  let service: AuditAdminService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditAdminService,
        { provide: AUDIT_LOG_ADMIN_REPOSITORY, useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(AuditAdminService);
    repo = module.get(AUDIT_LOG_ADMIN_REPOSITORY);
  });

  describe('listLogs', () => {
    it('passes filter and pagination to repository', async () => {
      repo.findAll.mockResolvedValue([]);

      await service.listLogs(
        { tenantId: 't1', action: AuditAction.TENANT_CHANGE },
        25,
        2,
      );

      // service converts page to offset: (page - 1) * limit = (2 - 1) * 25 = 25
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', action: AuditAction.TENANT_CHANGE }),
        25,
        25,
      );
    });
  });

  describe('record', () => {
    it('persists an audit entry with correct actor type', async () => {
      repo.create.mockResolvedValue({});

      await service.record({
        actorId: 'user1',
        action: AuditAction.TENANT_CHANGE,
        entityType: AuditEntityType.TENANT,
        entityId: 'tenant1',
        tenantId: 'tenant1',
        notes: 'Branding updated',
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        action: AuditAction.TENANT_CHANGE,
        entityType: AuditEntityType.TENANT,
        entityId: 'tenant1',
        notes: 'Branding updated',
      }));
    });
  });

  describe('getCount', () => {
    it('delegates count query to repository', async () => {
      repo.count.mockResolvedValue(42);

      const result = await service.getCount({ tenantId: 't1' });

      expect(repo.count).toHaveBeenCalledWith({ tenantId: 't1' });
      expect(result).toBe(42);
    });
  });
});
