import { AuditLog } from '@database/mongoose/schemas';
import { AuditAction, AuditEntityType } from '@shared/enums/audit.enum';

export const AUDIT_LOG_ADMIN_REPOSITORY = 'AUDIT_LOG_ADMIN_REPOSITORY';

export interface IAuditLogAdminRepository {
  findAll(filter?: {
    actorId?: string;
    tenantId?: string;
    action?: AuditAction;
    entityType?: AuditEntityType | string;
    fromDate?: Date;
    toDate?: Date;
  }, limit?: number, skip?: number): Promise<AuditLog[]>;
  findById(id: string): Promise<AuditLog | null>;
  create(data: Partial<AuditLog>): Promise<AuditLog>;
  count(filter?: { tenantId?: string; action?: AuditAction }): Promise<number>;
}
