import { Injectable, Inject } from '@nestjs/common';
import { AUDIT_LOG_ADMIN_REPOSITORY, IAuditLogAdminRepository } from '../../domain/repositories/audit-log-admin.repository.interface';
import { AuditAction, AuditEntityType, ActorType } from '@shared/enums/audit.enum';

@Injectable()
export class AuditAdminService {
  constructor(
    @Inject(AUDIT_LOG_ADMIN_REPOSITORY) private readonly repo: IAuditLogAdminRepository,
  ) {}

  listLogs(filter?: {
    actorId?: string;
    tenantId?: string;
    action?: AuditAction;
    entityType?: AuditEntityType | string;
    fromDate?: string;
    toDate?: string;
  }, limit = 50, page = 1) {
    return this.repo.findAll(
      {
        ...filter,
        fromDate: filter?.fromDate ? new Date(filter.fromDate) : undefined,
        toDate: filter?.toDate ? new Date(filter.toDate) : undefined,
      },
      limit,
      (page - 1) * limit,
    );
  }

  async record(data: {
    actorId: string;
    actorName?: string;
    tenantId?: string;
    action: AuditAction;
    entityType: AuditEntityType | string;
    entityId: string;
    entityName?: string;
    diff?: Record<string, { from: unknown; to: unknown }>;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    notes?: string;
  }) {
    return this.repo.create({
      actor: data.actorId as never,
      actorName: data.actorName,
      actorType: ActorType.USER,
      tenantId: data.tenantId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      diff: data.diff,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      notes: data.notes,
    });
  }

  getCount(filter?: { tenantId?: string; action?: AuditAction }) {
    return this.repo.count(filter);
  }
}
